import Foundation
import SwiftData
import Testing
@testable import Depth

// T5 cache-layer coverage: cache hit/miss, deduplicated refresh, retained last-good data
// on a failed background refresh, and the app-config network-first/cache-fallback split
// (design spec's "Required test suites" Repository/Build gate rows).

private actor FakeDepthRepository: DepthRepository {
    var teamsResult: Result<[Team], Error>
    var snapshotResults: [String: Result<TeamSnapshot, Error>]
    var seasonResults: [Int: Result<TeamSnapshot, Error>]
    var statsResults: [String: Result<TeamStatsPage, Error>]
    var appConfigResult: Result<AppConfig, Error>
    private(set) var teamSnapshotCallCount: [String: Int] = [:]
    private(set) var teamsCallCount = 0
    private(set) var seasonCallCount = 0
    private(set) var teamStatsCallCount: [String: Int] = [:]

    init(
        teamsResult: Result<[Team], Error> = .success([]),
        snapshotResults: [String: Result<TeamSnapshot, Error>] = [:],
        seasonResults: [Int: Result<TeamSnapshot, Error>] = [:],
        statsResults: [String: Result<TeamStatsPage, Error>] = [:],
        appConfigResult: Result<AppConfig, Error> = .success(AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil))
    ) {
        self.teamsResult = teamsResult
        self.snapshotResults = snapshotResults
        self.seasonResults = seasonResults
        self.statsResults = statsResults
        self.appConfigResult = appConfigResult
    }

    func teams() async throws -> [Team] {
        teamsCallCount += 1
        return try teamsResult.get()
    }

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        teamSnapshotCallCount[teamId, default: 0] += 1
        guard let result = snapshotResults[teamId] else { throw DepthError.notFound }
        return try result.get()
    }

    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        seasonCallCount += 1
        guard let result = seasonResults[season] else { throw DepthError.notFound }
        return try result.get()
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.notFound
    }

    func teamStats(teamId: String) async throws -> TeamStatsPage {
        teamStatsCallCount[teamId, default: 0] += 1
        guard let result = statsResults[teamId] else { throw DepthError.notFound }
        return try result.get()
    }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }

    func appConfig() async throws -> AppConfig {
        try appConfigResult.get()
    }

    func setSnapshotResult(_ result: Result<TeamSnapshot, Error>, forTeam teamId: String) {
        snapshotResults[teamId] = result
    }

    func setStatsResult(_ result: Result<TeamStatsPage, Error>, forTeam teamId: String) {
        statsResults[teamId] = result
    }

    func callCount(forTeam teamId: String) -> Int {
        teamSnapshotCallCount[teamId, default: 0]
    }

    func statsCallCount(forTeam teamId: String) -> Int {
        teamStatsCallCount[teamId, default: 0]
    }

    func historyCallCount() -> Int { seasonCallCount }
}

private func inMemoryContainer() -> ModelContainer {
    let schema = Schema(DepthCacheSchema.models)
    let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
    return try! ModelContainer(for: schema, configurations: [configuration])
}

private func inMemoryStore() -> CachedSnapshotStore {
    CachedSnapshotStore(modelContainer: inMemoryContainer())
}

private func team(id: String = "bills") -> Team {
    Team(
        id: id, city: "Buffalo", name: "Bills", abbrev: "BUF", conference: "AFC", division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a", uiAccent: "#d50a0a", onAccent: "#fff"),
        logo: nil, logoDark: nil
    )
}

private func snapshot(teamId: String = "bills") -> TeamSnapshot {
    TeamSnapshot(team: team(id: teamId), players: [], specialTeams: [], uniforms: [])
}

private func statsPage(teamId: String = "bills") -> TeamStatsPage {
    TeamStatsPage(team: team(id: teamId), seasons: [], upcomingSeason: nil, currentSeason: 2026)
}

@Test func teamSnapshotFetchesFromUnderlyingOnCacheMiss() async throws {
    let underlying = FakeDepthRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    let result = try await repository.teamSnapshot(teamId: "bills")
    #expect(result.team.id == "bills")
    #expect(await underlying.callCount(forTeam: "bills") == 1)
}

@Test func historicalRosterDelegatesWithoutEnteringTheCurrentSnapshotCache() async throws {
    let historical = snapshot(teamId: "bills")
    let underlying = FakeDepthRepository(seasonResults: [2013: .success(historical)])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    let first = try await repository.teamSeason(teamId: "bills", season: 2013)
    let second = try await repository.teamSeason(teamId: "bills", season: 2013)

    #expect(first == historical)
    #expect(second == historical)
    #expect(await underlying.historyCallCount() == 2)
}

@Test func teamSnapshotReturnsCachedValueWithoutBlockingOnNetwork() async throws {
    let underlying = FakeDepthRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    _ = try await repository.teamSnapshot(teamId: "bills") // primes the cache
    let cached = try await repository.teamSnapshot(teamId: "bills")
    #expect(cached.team.id == "bills")
}

@Test func failedBackgroundRefreshRetainsLastGoodSnapshot() async throws {
    let underlying = FakeDepthRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    _ = try await repository.teamSnapshot(teamId: "bills") // primes the cache with a good snapshot
    await underlying.setSnapshotResult(.failure(DepthError.server("boom")), forTeam: "bills")

    // Cache-hit path fires a background refresh; give it a moment to run and fail.
    _ = try await repository.teamSnapshot(teamId: "bills")
    try await Task.sleep(nanoseconds: 200_000_000)

    let stillCached = try await repository.teamSnapshot(teamId: "bills")
    #expect(stillCached.team.id == "bills", "a failed refresh must not clear the previously cached snapshot")
}

@Test func concurrentTeamSnapshotCallsWithNoCacheDedupToOneUnderlyingFetch() async throws {
    let underlying = FakeDepthRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    async let first = repository.teamSnapshot(teamId: "bills")
    async let second = repository.teamSnapshot(teamId: "bills")
    _ = try await (first, second)

    #expect(await underlying.callCount(forTeam: "bills") == 1, "concurrent refreshes for the same team must be deduplicated")
}

@Test func teamsReturnsCachedListOnCacheHit() async throws {
    let underlying = FakeDepthRepository(teamsResult: .success([team()]))
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    let first = try await repository.teams()
    let second = try await repository.teams()
    #expect(first.map(\.id) == ["bills"])
    #expect(second.map(\.id) == ["bills"])
}

@Test func appConfigPrefersFreshNetworkValueOverCache() async throws {
    let store = inMemoryStore()
    try await store.saveAppConfig(AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil), cachedAt: Date())
    let underlying = FakeDepthRepository(appConfigResult: .success(AppConfig(minimumSupportedBuild: 5, maintenanceMessage: nil)))
    let repository = CachingDepthRepository(underlying: underlying, store: store)

    let config = try await repository.appConfig()
    #expect(config.minimumSupportedBuild == 5, "app_config must try the network first, never serve a stale cached minimum when the network succeeds")
}

@Test func appConfigFallsBackToCacheWhenNetworkFails() async throws {
    let store = inMemoryStore()
    try await store.saveAppConfig(AppConfig(minimumSupportedBuild: 3, maintenanceMessage: nil), cachedAt: Date())
    let underlying = FakeDepthRepository(appConfigResult: .failure(DepthError.offline))
    let repository = CachingDepthRepository(underlying: underlying, store: store)

    let config = try await repository.appConfig()
    #expect(config.minimumSupportedBuild == 3)
}

@Test func appConfigThrowsWhenNetworkFailsAndNothingWasEverCached() async throws {
    let underlying = FakeDepthRepository(appConfigResult: .failure(DepthError.offline))
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    await #expect(throws: DepthError.self) {
        _ = try await repository.appConfig()
    }
}

@Test func incompatibleSchemaVersionRowIsDiscardedAsCacheMiss() async throws {
    let container = inMemoryContainer()
    let context = ModelContext(container)
    let payload = try JSONEncoder().encode(snapshot())
    // Write directly with a version this build doesn't recognize — "safe schema
    // discard" (design spec) means the read path must treat this as no cache at all,
    // not attempt to decode a payload shape that may no longer match.
    context.insert(CachedTeamSnapshot(teamId: "bills", payload: payload, schemaVersion: depthCacheSchemaVersion + 1, cachedAt: Date()))
    try context.save()

    let store = CachedSnapshotStore(modelContainer: container)
    let cached = try await store.teamSnapshot(teamId: "bills")
    #expect(cached == nil)

    let underlying = FakeDepthRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: store)
    let result = try await repository.teamSnapshot(teamId: "bills")
    #expect(result.team.id == "bills", "a discarded incompatible row falls through to a real network fetch")
}

@Test func teamSnapshotCachedAtReturnsNilForARowTeamSnapshotWouldDiscard() async throws {
    let container = inMemoryContainer()
    let context = ModelContext(container)
    let payload = try JSONEncoder().encode(snapshot())
    context.insert(CachedTeamSnapshot(teamId: "bills", payload: payload, schemaVersion: depthCacheSchemaVersion + 1, cachedAt: Date()))
    try context.save()

    let store = CachedSnapshotStore(modelContainer: container)
    let cachedAt = try await store.teamSnapshotCachedAt(teamId: "bills")
    #expect(cachedAt == nil, "a stale-label caller must never see a cache date for a row teamSnapshot() treats as missing")
}

@Test func incompatibleAppConfigSchemaVersionIsDiscardedAsCacheMiss() async throws {
    let container = inMemoryContainer()
    let context = ModelContext(container)
    context.insert(CachedAppConfig(
        config: AppConfig(minimumSupportedBuild: 7, maintenanceMessage: nil),
        schemaVersion: depthCacheSchemaVersion + 1, cachedAt: Date()
    ))
    try context.save()

    let store = CachedSnapshotStore(modelContainer: container)
    let cached = try await store.appConfig()
    #expect(cached == nil)
}

// MARK: - Team stats cache (round-4 Stats page)

@Test func teamStatsFetchesFromUnderlyingOnCacheMiss() async throws {
    let underlying = FakeDepthRepository(statsResults: ["bills": .success(statsPage())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    let page = try await repository.teamStats(teamId: "bills")
    #expect(page.team.id == "bills")
    #expect(await underlying.statsCallCount(forTeam: "bills") == 1)
}

@Test func teamStatsReturnsCachedPageWithoutBlockingOnNetwork() async throws {
    let underlying = FakeDepthRepository(statsResults: ["bills": .success(statsPage())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    _ = try await repository.teamStats(teamId: "bills") // primes the cache
    let cached = try await repository.teamStats(teamId: "bills")
    #expect(cached.team.id == "bills")
    #expect(await underlying.statsCallCount(forTeam: "bills") == 1, "a warm cache must not issue a second blocking fetch")
}

@Test func failedStatsBackgroundRefreshRetainsLastGoodPage() async throws {
    let underlying = FakeDepthRepository(statsResults: ["bills": .success(statsPage())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())

    _ = try await repository.teamStats(teamId: "bills") // primes the cache with a good page
    await underlying.setStatsResult(.failure(DepthError.server("boom")), forTeam: "bills")

    // Cache-hit path fires a background refresh; give it a moment to run and fail.
    _ = try await repository.teamStats(teamId: "bills")
    try await Task.sleep(nanoseconds: 200_000_000)

    let stillCached = try await repository.teamStats(teamId: "bills")
    #expect(stillCached.team.id == "bills", "a failed refresh must not clear the previously cached stats page")
}

@Test func incompatibleStatsSchemaVersionRowIsDiscardedAsCacheMiss() async throws {
    let container = inMemoryContainer()
    let context = ModelContext(container)
    let payload = try JSONEncoder().encode(statsPage())
    context.insert(CachedTeamStats(teamId: "bills", payload: payload, schemaVersion: depthCacheSchemaVersion + 1, cachedAt: Date()))
    try context.save()

    let store = CachedSnapshotStore(modelContainer: container)
    let cached = try await store.teamStats(teamId: "bills")
    #expect(cached == nil)

    let underlying = FakeDepthRepository(statsResults: ["bills": .success(statsPage())])
    let repository = CachingDepthRepository(underlying: underlying, store: store)
    let result = try await repository.teamStats(teamId: "bills")
    #expect(result.team.id == "bills", "a discarded incompatible row falls through to a real network fetch")
}
