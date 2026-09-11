import Foundation
import Observation

// The T5 update gate (design spec's "Database evolution and update gate"), hardened by
// DEP-425 into the reusable forced-update tool the column-drop cleanup depends on. A
// build below `app_config.minimum_supported_build` blocks with `BlockingUpdateView`;
// every other outcome — equal/newer build, or the config being entirely unreachable with
// nothing ever cached — lets the app proceed, since migrations stay additive ("do not
// brick first launch during a config outage").
//
// DEP-425's contract, and the reason this exists as a tool rather than a per-release
// gate: the gate reads only `app_config`, a singleton table whose shape is frozen by
// contract. A gate that had to decode the schema it protects would fail in exactly the
// situation it exists for — an old client against a backend that dropped a column it
// still names in its selects.
@Observable
@MainActor
final class UpdateGateViewModel {
    /// Three states, not a bare `isBlocked` bool. The distinction that matters is
    /// `.checking` vs `.allowed`: DEP-425 requires the gate to resolve *before* any other
    /// data fetch starts, and a two-state bool can't express "not yet decided" — it
    /// defaults to allowed, which is what let the pre-DEP-425 app mount every tab and
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

    var isBlocked: Bool { state == .blocked }

    /// True only while the gate has made no decision at all — the first-ever launch with
    /// no cached config. ContentView holds first render here; every later launch skips
    /// straight past it on the cached fast path.
    var isChecking: Bool { state == .checking }

    init(repository: CachingDepthRepository, currentBuild: Int = UpdateGateViewModel.installedBuildNumber()) {
        self.repository = repository
        self.currentBuild = currentBuild
    }

    /// Resolves the gate. Two phases, deliberately: the cached config decides
    /// provisionally so a warm launch never stalls behind a network round trip, then the
    /// live read confirms or corrects. On a first-ever launch there is no cache, so the
    /// app holds on `.checking` until the network answers — the only launch that pays a
    /// wait, and the only one where proceeding blind would be unsafe.
    func check() async {
        if let cached = await repository.cachedAppConfig() {
            apply(cached)
        }

        guard let fresh = try? await repository.appConfig() else {
            // Unreachable config with nothing cached: fail open rather than brick the
            // app during a backend outage. `apply` above already ran if a cache existed,
            // so this only downgrades a still-undecided gate.
            if state == .checking { state = .allowed }
            return
        }
        apply(fresh)
    }

    private func apply(_ config: AppConfig) {
        state = currentBuild < config.minimumSupportedBuild ? .blocked : .allowed
        maintenanceMessage = config.maintenanceMessage
    }

    nonisolated static func installedBuildNumber() -> Int {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String,
            let build = Int(raw)
        else {
            return Int.max // Fail open in a dev/test environment with no build number set.
        }
        return build
    }
}
