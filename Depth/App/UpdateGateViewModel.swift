import Foundation
import Observation

// The update gate reads `app_config` and blocks builds below
// build below `app_config.minimum_supported_build` blocks with `BlockingUpdateView`;
// every other outcome — equal/newer build, or the config being entirely unreachable with
// nothing ever cached — lets the app proceed, since migrations stay additive ("do not
// brick first launch during a config outage").
//
// The gate reads only `app_config`, a singleton table whose shape is frozen by
// gate: the gate reads only `app_config`, a singleton table whose shape is frozen by
// contract. A gate that had to decode the schema it protects would fail in exactly the
// situation it exists for — an old client against a backend that dropped a column it
// still names in its selects.
@Observable
@MainActor
final class UpdateGateViewModel {
    /// Three states, not a bare `isBlocked` bool. The distinction that matters is
    /// `.checking` vs `.allowed`: the gate must resolve *before* any other
    /// data fetch starts, and a two-state bool can't express "not yet decided" — it
    /// defaults to allowed, which would let the app mount every tab and
    /// start fetching against a schema it might be too old to read.
    enum State: Equatable {
        case checking
        case allowed
        case blocked
    }

    private(set) var state: State = .checking
    private(set) var maintenanceMessage: String?

    private let repository: CachingDepthRepository
    private let currentBuild: Int
    private let liveReadTimeout: Duration
    private var launchCheck: Task<Void, Never>?

    var isBlocked: Bool { state == .blocked }

    /// True only until the gate has made its first decision. ContentView holds first
    /// render on the checking view for the whole of a cold launch's live read.
    var isChecking: Bool { state == .checking }

    init(
        repository: CachingDepthRepository,
        currentBuild: Int = UpdateGateViewModel.installedBuildNumber(),
        liveReadTimeout: Duration = .seconds(2)
    ) {
        self.repository = repository
        self.currentBuild = currentBuild
        self.liveReadTimeout = liveReadTimeout
    }

    /// Resolves the gate. The first call (cold launch) holds on `.checking` until the live
    /// `app_config` read answers, so a stale cached "allowed" can never mount the app just
    /// before the update dialog appears. The wait is bounded by `liveReadTimeout`; on
    /// timeout or failure the cached config decides, and with nothing cached the gate
    /// fails open rather than brick the app during a backend outage. Later calls
    /// (foreground re-checks) never return to `.checking`: they only apply a live answer.
    func check() async {
        guard state == .checking else {
            if let fresh = try? await repository.appConfig() { apply(fresh) }
            return
        }
        // A scene-phase change at launch can call in again while the first check is
        // still running; share it rather than start a second race.
        let task = launchCheck ?? Task { await self.resolveLaunch() }
        launchCheck = task
        await task.value
    }

    private func resolveLaunch() async {
        // Raced through a stream rather than a task group: a group would wait for the
        // still-running read after the timer wins, defeating the timeout.
        let (answers, deliver) = AsyncStream<AppConfig?>.makeStream()
        let live = Task { [repository] in
            let config = try? await repository.appConfig()
            deliver.yield(config)
            return config
        }
        let timeout = liveReadTimeout
        let timer = Task {
            try? await Task.sleep(for: timeout)
            deliver.yield(nil)
        }
        var fresh: AppConfig?
        for await answer in answers {
            fresh = answer
            break
        }
        timer.cancel()

        if let fresh {
            apply(fresh)
        } else if let cached = await repository.cachedAppConfig() {
            apply(cached)
            // A read that merely ran long can still answer; it may only tighten the gate.
            Task {
                if let late = await live.value { apply(late) }
            }
        } else {
            state = .allowed
            Task {
                if let late = await live.value { apply(late) }
            }
        }
    }

    private func apply(_ config: AppConfig) {
        state = currentBuild < config.minimumSupportedBuild ? .blocked : .allowed
        maintenanceMessage = config.maintenanceMessage
    }

    nonisolated static func installedBuildNumber() -> Int {
        #if UITEST_FIXTURES
            // Below any fixture minimum, so a UI test can reach the blocked state.
            let arguments = ProcessInfo.processInfo.arguments
            if arguments.contains("UI_TESTING_FORCE_UPDATE_GATE") {
                return 0
            }
            // A UI-test build carries the placeholder build number, which a live backend's
            // armed minimum would otherwise block, so UI tests report the newest build.
            if arguments.contains(where: { $0.hasPrefix("UI_TESTING_") }) {
                return Int.max
            }
        #endif
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String,
            let build = Int(raw)
        else {
            return Int.max  // Fail open in a dev/test environment with no build number set.
        }
        return build
    }
}
