import Foundation

// Wraps a `DepthRepository` with T5's cache-first behavior (design spec locked decision
// #8) without touching `SupabaseDepthRepository`/`DepthRepository` themselves — this is
// purely a decorator over the existing seam. Concrete type (not the bare protocol) is
// what `DepthEnvironment` hands to Features/, so views get cache-first reads through the
// same repository call they'd make anyway, plus the extra cache-age accessors Features
// needs for stale labels — all without ever touching SwiftData or Supabase directly.
actor CachingDepthRepository: DepthRepository {
    private let underlying: DepthRepository
    private let store: CachedSnapshotStore

    /// 24-hour stale label threshold (design spec's "Data and state contract").
    static let staleAfter: TimeInterval = 24 * 3600

    private var inFlightListFetch: Task<[Team], Error>?
    private var inFlightSnapshotFetches: [String: Task<TeamSnapshot, Error>] = [:]
    private var inFlightStatsFetches: [String: Task<TeamStatsPage, Error>] = [:]

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

    /// Schedule reads are intentionally not folded into T5's snapshot cache: schedules
    /// update on a different cadence and this focused feature only needs delegation at
    /// the stable repository seam.
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        try await underlying.teamSchedule(teamId: teamId, season: season)
    }

    // MARK: - Team stats (round-4 Stats page)

    /// Round-4 spec's Data flow: cache-first, exactly like the snapshot — the Stats page
    /// sits behind the team-detail header on the primary navigation path, so it earns the
    /// same warm-cache budget as the depth chart instead of a fresh network read per
    /// visit. The spec says to reuse the snapshot cache layer, so this is the same
    /// cache-hit/background-refresh/retain-on-failure pattern as `teamSnapshot`, not the
    /// network-first `appConfig` split.
    func teamStats(teamId: String) async throws -> TeamStatsPage {
        if let cached = try? await store.teamStats(teamId: teamId) {
            refreshStatsInBackground(teamId: teamId)
            return cached
        }
        return try await refreshStats(teamId: teamId)
    }

    func teamStatsCachedAt(teamId: String) async -> Date? {
        try? await store.teamStatsCachedAt(teamId: teamId)
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

    /// Cross-team search is a per-keystroke read; caching it would serve stale hits.
    func searchPlayers(query: String) async throws -> [PlayerHit] {
        try await underlying.searchPlayers(query: query)
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
