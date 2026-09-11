import Foundation
import SwiftData
import Testing
@testable import Depth

// DEP-425 forced-update gate coverage. The gate is the one place the app deliberately
// blocks rather than degrades, so its decision table is pinned here directly: block
// below the minimum, allow at or above it, fail open when the config is unreachable and
// nothing was ever cached, and — the property DEP-425 exists for — resolve from cache
// before any network read so no other fetch can start ahead of it.

/// Counts `appConfig()` calls and can be held open, so a test can observe the gate's
/// state *while* the live read is still in flight — the window the cached fast path
/// exists to cover.
private actor FakeConfigRepository: DepthRepository {
    var configResult: Result<AppConfig, Error>
    private(set) var appConfigCallCount = 0
    private var gate: CheckedContinuation<Void, Never>?
    private var isHeld = false

    init(configResult: Result<AppConfig, Error>) { self.configResult = configResult }

    /// Makes the next `appConfig()` call suspend until `release()` is called.
    func hold() { isHeld = true }

    func release() {
        isHeld = false
        gate?.resume()
        gate = nil
    }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }

    func appConfig() async throws -> AppConfig {
        appConfigCallCount += 1
        if isHeld {
            await withCheckedContinuation { gate = $0 }
        }
        return try configResult.get()
    }
}

private func inMemoryStore() -> CachedSnapshotStore {
    let schema = Schema(DepthCacheSchema.models)
    let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: schema, configurations: [configuration])
    return CachedSnapshotStore(modelContainer: container)
}

private func config(minimum: Int, message: String? = nil) -> AppConfig {
    AppConfig(minimumSupportedBuild: minimum, maintenanceMessage: message)
}

@Suite struct UpdateGateTests {
    // MARK: - Decision table

    @Test @MainActor func blocksWhenInstalledBuildIsBelowMinimum() async {
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 10)))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 9)

        await gate.check()

        #expect(gate.state == .blocked)
        #expect(gate.isBlocked)
    }

    @Test @MainActor func allowsWhenInstalledBuildEqualsMinimum() async {
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 10)))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 10)

        await gate.check()

        #expect(gate.state == .allowed, "the minimum is inclusive — a build AT the minimum is supported")
    }

    @Test @MainActor func allowsWhenInstalledBuildIsAboveMinimum() async {
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 10)))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 99)

        await gate.check()

        #expect(gate.state == .allowed)
    }

    @Test @MainActor func surfacesMaintenanceMessageFromConfig() async {
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 10, message: "Back at 5pm ET.")))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 9)

        await gate.check()

        #expect(gate.maintenanceMessage == "Back at 5pm ET.")
    }

    // MARK: - Failure boundary (the bounded exception to "degrade, never throw")

    @Test @MainActor func failsOpenWhenConfigIsUnreachableAndNothingWasEverCached() async {
        let underlying = FakeConfigRepository(configResult: .failure(DepthError.offline))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 1)

        await gate.check()

        #expect(gate.state == .allowed, "a backend outage must never brick first launch — the gate fails open")
        #expect(!gate.isChecking, "the gate must always reach a decision, never strand the app on the checking screen")
    }

    @Test @MainActor func blocksFromCacheWhenConfigIsUnreachable() async {
        let store = inMemoryStore()
        try? await store.saveAppConfig(config(minimum: 10), cachedAt: Date())
        let underlying = FakeConfigRepository(configResult: .failure(DepthError.offline))
        let repository = CachingDepthRepository(underlying: underlying, store: store)
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 9)

        await gate.check()

        #expect(gate.state == .blocked, "an offline old build stays blocked — going offline must not be a way around the gate")
    }

    // MARK: - Ordering: the property DEP-425 exists for

    @Test @MainActor func startsInCheckingStateBeforeAnyFetch() {
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 1)))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 99)

        #expect(gate.state == .checking, "the gate must not default to allowed — that is what let tabs mount and fetch before it resolved")
        #expect(gate.isChecking)
    }

    @Test @MainActor func cachedConfigDecidesBeforeTheNetworkReadCompletes() async {
        let store = inMemoryStore()
        try? await store.saveAppConfig(config(minimum: 10), cachedAt: Date())
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 10)))
        await underlying.hold()
        let repository = CachingDepthRepository(underlying: underlying, store: store)
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 9)

        let checking = Task { await gate.check() }

        // Spin until the cached phase has applied, with the live read still suspended.
        while gate.isChecking {
            await Task.yield()
        }
        #expect(gate.state == .blocked, "the cached config must decide the gate without waiting on the network")

        // Then wait for the live read to actually enter the (held) repository call. The
        // cached phase completing does NOT imply the network call has started — `check()`
        // applies the cache and only then awaits `appConfig()`, so asserting the count
        // immediately here races the task getting that far.
        while await underlying.appConfigCallCount == 0 {
            await Task.yield()
        }
        #expect(await underlying.appConfigCallCount == 1, "the live read is in flight, not skipped")

        await underlying.release()
        await checking.value
        #expect(gate.state == .blocked)
    }

    @Test @MainActor func liveConfigCorrectsAStaleCachedAllow() async {
        let store = inMemoryStore()
        // Cached from a release when build 9 was still supported...
        try? await store.saveAppConfig(config(minimum: 1), cachedAt: Date())
        // ...but the server has since raised the minimum past it.
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 10)))
        let repository = CachingDepthRepository(underlying: underlying, store: store)
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 9)

        await gate.check()

        #expect(gate.state == .blocked, "the live read must override a cached allow — the cache only ever decides earlier, never wins")
    }

    @Test @MainActor func rechecksPickUpAServerSideFlipOnAlreadyRunningApp() async {
        let underlying = FakeConfigRepository(configResult: .success(config(minimum: 1)))
        let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
        let gate = UpdateGateViewModel(repository: repository, currentBuild: 9)

        await gate.check()
        #expect(gate.state == .allowed)

        // Cooper flips app_config while the app is backgrounded; foregrounding re-checks.
        await underlying.setConfigResult(.success(config(minimum: 10)))
        await gate.check()

        #expect(gate.state == .blocked, "a foreground re-check must catch a minimum-build flip on an already-running install")
    }
}

extension FakeConfigRepository {
    func setConfigResult(_ result: Result<AppConfig, Error>) { configResult = result }
}
