import Foundation

// Wraps a `DepthRepository` with T5's cache-first behavior (design spec locked decision
// #8) without touching `SupabaseDepthRepository`/`DepthRepository` themselves — this is
// purely a decorator over the existing seam. Concrete type (not the bare protocol) is
// what `DepthEnvironment` hands to Features/, so views get cache-first reads through the
// same repository call they'd make anyway, plus the extra cache-age accessors Features
// needs for stale labels — all without ever touching SwiftData or Supabase directly.
//
// DEP-248 read-path audit (which surfaces cache, which delegate, and why):
//   teams()          cache-first + background refresh (team list is stable, 32 rows)
//   teamSnapshot()   cache-first + background refresh (depth chart is the launch surface)
//   teamStats()      TTL-bounded, same as teamSchedule() (originally serve-any-age like
//                    the snapshot — fixed after a live QA pass caught a stale W-L record
//                    being served indefinitely; stats carries the same "scores finalize
//                    on a different cadence than rosters" problem schedule already
//                    accounted for, so it earns the same statsTTL treatment)
//   teamSchedule()   TTL-bounded: cache-first within scheduleTTL, network-first beyond —
//                    scores finalize on a different cadence than rosters, so never serve
//                    a stale week
//   teamSeason()     straight delegate — historical rosters are immutable, unpersisted
//                    on-demand reads; caching dozens of rarely-opened seasons isn't worth it
//   playerStats()    straight delegate — separate on-demand read; snapshot-cache
//                    restructuring would add stale payload to every depth-chart launch
//   recentParticipation() straight delegate — bounded live Compare evidence; no cache,
//                    TTL, or in-flight state belongs in this decorator
//   searchPlayers()  straight delegate — per-keystroke read; caching would serve stale hits
//   rosterLeaders()  straight delegate — bounded per-season-tab read; no cache, TTL, or
//                    in-flight state belongs in this decorator
//   listUniforms()   cache-first + background refresh (uniform archive is stable, ~105 rows)
//   appConfig()      network-first, cache-fallback — a stale cached minimum build is
//                    exactly wrong for the update gate
actor CachingDepthRepository: DepthRepository {
    private let underlying: DepthRepository
    private let store: CachedSnapshotStore

    /// 24-hour stale label threshold (design spec's "Data and state contract").
    static let staleAfter: TimeInterval = 24 * 3600

    /// DEP-248 schedule TTL. Schedules finalize on a different cadence than rosters
    /// (weekly game results, not the snapshot's lineup updates), so the schedule cache
    /// is deliberately TTL-bounded rather than the snapshot's serve-any-age pattern:
    /// within this window a revisit is a cache hit (instant), beyond it the read goes
    /// network-first so a week-old schedule is never served. 12h keeps same-day revisits
    /// instant while capping staleness at half a slate.
    static let scheduleTTL: TimeInterval = 12 * 3600

    /// Same window and same reasoning as `scheduleTTL` — team stats (W-L record, PF/PA)
    /// is score data, not roster data, so it gets the schedule's TTL-bounded treatment
    /// instead of the snapshot's serve-any-age one.
    static let statsTTL: TimeInterval = 12 * 3600

    private var inFlightListFetch: Task<[Team], Error>?
    private var inFlightSnapshotFetches: [String: Task<TeamSnapshot, Error>] = [:]
    private var inFlightStatsFetches: [String: Task<TeamStatsPage, Error>] = [:]
    private var inFlightScheduleFetches: [String: Task<TeamSchedule, Error>] = [:]
    private var inFlightUniformListFetch: Task<[UniformListing], Error>?

    init(underlying: DepthRepository, store: CachedSnapshotStore) {
        self.underlying = underlying
        self.store = store
    }

    // MARK: - Team list

    func teams() async throws -> [Team] {
        if let cached = try? await store.teamList(), !cached.teams.isEmpty {
            refreshTeamListInBackground()
            return cached.teams
        }
        return try await refreshTeamList()
    }

    @discardableResult
    private func refreshTeamList() async throws -> [Team] {
        if let existing = inFlightListFetch {
            return try await existing.value
        }
        let task = Task { try await self.underlying.teams() }
        inFlightListFetch = task
        defer { inFlightListFetch = nil }
        let teams = try await task.value
        try? await store.saveTeamList(teams, cachedAt: Date())
        return teams
    }

    private func refreshTeamListInBackground() {
        guard inFlightListFetch == nil else { return }
        Task { try? await self.refreshTeamList() }
    }

    // MARK: - Team snapshot

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        if let cached = try? await store.teamSnapshot(teamId: teamId) {
            refreshSnapshotInBackground(teamId: teamId)
            return cached
        }
        return try await refreshSnapshot(teamId: teamId)
    }

    func teamSnapshotCachedAt(teamId: String) async -> Date? {
        try? await store.teamSnapshotCachedAt(teamId: teamId)
    }

    /// Historical rosters are immutable on-demand reads. Delegating avoids persisting
    /// dozens of rarely opened seasons in the current snapshot cache.
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        try await underlying.teamSeason(teamId: teamId, season: season)
    }

    /// DEP-248: schedules now earn a TTL-bounded cache (their own SwiftData rows, not
    /// the snapshot payload). Within `scheduleTTL` a revisit is a cache hit with a
    /// background refresh (same cache-first shape as `teamSnapshot`/`teamStats`); beyond
    /// the TTL the read goes network-first so a stale week of results is never served,
    /// falling back to the last good row if the refresh fails (retain-on-failure).
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        if let cached = try? await store.teamSchedule(teamId: teamId, season: season),
            let cachedAt = try? await store.teamScheduleCachedAt(teamId: teamId, season: season),
            !isScheduleExpired(cachedAt)
        {
            refreshScheduleInBackground(teamId: teamId, season: season)
            return cached
        }
        do {
            return try await refreshSchedule(teamId: teamId, season: season)
        } catch {
            if let cached = try? await store.teamSchedule(teamId: teamId, season: season) {
                return cached
            }
            throw error
        }
    }

    private func isScheduleExpired(_ cachedAt: Date, now: Date = Date()) -> Bool {
        now.timeIntervalSince(cachedAt) > Self.scheduleTTL
    }

    @discardableResult
    private func refreshSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        let dedupKey = scheduleCacheKey(teamId: teamId, season: season)
        if let existing = inFlightScheduleFetches[dedupKey] {
            return try await existing.value
        }
        let task = Task { try await self.underlying.teamSchedule(teamId: teamId, season: season) }
        inFlightScheduleFetches[dedupKey] = task
        defer { inFlightScheduleFetches[dedupKey] = nil }
        let schedule = try await task.value
        if let season {
            try? await store.saveTeamSchedule(schedule, teamId: teamId, season: season, cachedAt: Date())
        } else {
            // Prime the nil/default row AND the resolved concrete-season row so both the
            // first-visit path and a later explicit-season read are warm.
            try? await store.saveDefaultSeasonSchedule(schedule, teamId: teamId, cachedAt: Date())
        }
        return schedule
    }

    private func refreshScheduleInBackground(teamId: String, season: Int?) {
        let dedupKey = scheduleCacheKey(teamId: teamId, season: season)
        guard inFlightScheduleFetches[dedupKey] == nil else { return }
        Task { try? await self.refreshSchedule(teamId: teamId, season: season) }
    }

    // MARK: - Team stats (round-4 Stats page)

    /// TTL-bounded, same shape as `teamSchedule` (§ note above this class's DEP-248
    /// audit): within `statsTTL` a revisit is a cache hit with a background refresh;
    /// beyond it the read goes network-first so a stale W-L record/PF/PA is never served
    /// indefinitely, falling back to the last good row if the refresh fails
    /// (retain-on-failure).
    func teamStats(teamId: String) async throws -> TeamStatsPage {
        if let cached = try? await store.teamStats(teamId: teamId),
            let cachedAt = try? await store.teamStatsCachedAt(teamId: teamId),
            !isStatsExpired(cachedAt)
        {
            refreshStatsInBackground(teamId: teamId)
            return cached
        }
        do {
            return try await refreshStats(teamId: teamId)
        } catch {
            if let cached = try? await store.teamStats(teamId: teamId) {
                return cached
            }
            throw error
        }
    }

    func teamStatsCachedAt(teamId: String) async -> Date? {
        try? await store.teamStatsCachedAt(teamId: teamId)
    }

    private func isStatsExpired(_ cachedAt: Date, now: Date = Date()) -> Bool {
        now.timeIntervalSince(cachedAt) > Self.statsTTL
    }

    @discardableResult
    private func refreshStats(teamId: String) async throws -> TeamStatsPage {
        if let existing = inFlightStatsFetches[teamId] {
            return try await existing.value
        }
        let task = Task { try await self.underlying.teamStats(teamId: teamId) }
        inFlightStatsFetches[teamId] = task
        defer { inFlightStatsFetches[teamId] = nil }
        let page = try await task.value
        try? await store.saveTeamStats(page, teamId: teamId, cachedAt: Date())
        return page
    }

    private func refreshStatsInBackground(teamId: String) {
        guard inFlightStatsFetches[teamId] == nil else { return }
        Task { try? await self.refreshStats(teamId: teamId) }
    }

    /// Player stats are a separate on-demand read; snapshot-cache restructuring would
    /// add stale, unused payload to every depth-chart launch.
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] {
        try await underlying.playerStats(playerId: playerId, teamId: teamId)
    }

    /// The database query is already season-bounded, and Compare needs the newest
    /// ingest window. Delegate directly without adding SwiftData, TTL, or dedup state.
    func recentParticipation(teamId: String) async throws -> RecentParticipation? {
        try await underlying.recentParticipation(teamId: teamId)
    }

    /// Cross-team search is a per-keystroke read; caching it would serve stale hits.
    func searchPlayers(query: String) async throws -> [PlayerHit] {
        try await underlying.searchPlayers(query: query)
    }

    /// Re-derived per season tab, like teamSchedule's per-season reads — no cache, TTL,
    /// or in-flight dedup state belongs in this decorator for a read this bounded.
    func rosterLeaders(teamId: String, season: Int) async throws -> RosterLeaders? {
        try await underlying.rosterLeaders(teamId: teamId, season: season)
    }

    // MARK: - Uniform archive list

    /// Cache-first exactly like the team list — the all-32-kits read is stable and small.
    func listUniforms() async throws -> [UniformListing] {
        if let cached = try? await store.uniformList() {
            refreshUniformListInBackground()
            return cached
        }
        return try await refreshUniformList()
    }

    @discardableResult
    private func refreshUniformList() async throws -> [UniformListing] {
        if let existing = inFlightUniformListFetch {
            return try await existing.value
        }
        let task = Task { try await self.underlying.listUniforms() }
        inFlightUniformListFetch = task
        defer { inFlightUniformListFetch = nil }
        let listings = try await task.value
        try? await store.saveUniformList(listings, cachedAt: Date())
        return listings
    }

    private func refreshUniformListInBackground() {
        guard inFlightUniformListFetch == nil else { return }
        Task { try? await self.refreshUniformList() }
    }

    static func isStale(_ cachedAt: Date, now: Date = Date()) -> Bool {
        now.timeIntervalSince(cachedAt) > staleAfter
    }

    @discardableResult
    private func refreshSnapshot(teamId: String) async throws -> TeamSnapshot {
        if let existing = inFlightSnapshotFetches[teamId] {
            return try await existing.value
        }
        let task = Task { try await self.underlying.teamSnapshot(teamId: teamId) }
        inFlightSnapshotFetches[teamId] = task
        defer { inFlightSnapshotFetches[teamId] = nil }
        let snapshot = try await task.value
        try? await store.saveTeamSnapshot(snapshot, teamId: teamId, cachedAt: Date())
        return snapshot
    }

    /// Fire-and-forget, deduplicated background refresh — cache-first reads return
    /// immediately with the value on disk; this keeps it from going stale without
    /// blocking or blanking the caller's render (design spec's "refresh in the
    /// background... retain the last good snapshot on failure": a failed refresh here
    /// just leaves the existing cached row in place, since `saveTeamSnapshot` only runs
    /// after a successful fetch).
    private func refreshSnapshotInBackground(teamId: String) {
        guard inFlightSnapshotFetches[teamId] == nil else { return }
        Task { try? await self.refreshSnapshot(teamId: teamId) }
    }

    // MARK: - App config (update gate)

    /// Unlike team data, this tries the network first — a stale cached minimum-build
    /// value is exactly wrong for a gate whose entire point is catching builds the
    /// *current* config just marked unsupported (design spec's "Database evolution and
    /// update gate": "cache the last known minimum... if the fetch fails, use the cached
    /// value").
    func appConfig() async throws -> AppConfig {
        do {
            let fresh = try await underlying.appConfig()
            try? await store.saveAppConfig(fresh, cachedAt: Date())
            return fresh
        } catch {
            if let cached = try? await store.appConfig() {
                return cached
            }
            throw error
        }
    }
}
