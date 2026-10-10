import Foundation

// The one seam Features/ is allowed to depend on for data access — views never query
// Supabase or receive a raw client directly.
protocol DepthRepository: Sendable {
    /// The 32-team list used by the searchable team selector (T6) — flat columns only,
    /// no nested depth-chart/uniform embeds. This is a separate, lighter projection from
    /// `teamSnapshot`, not a side effect of it.
    func teams() async throws -> [Team]
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot
    /// Read-only historical roster, intentionally separate from the current snapshot
    /// cache because each season is opened on demand and is immutable once decoded.
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot
    /// The selected team's latest available regular-season schedule when `season` is
    /// nil, or a requested historical season. This remains a standalone read so it
    /// does not bloat the cacheable depth-chart snapshot.
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule
    /// Independent lazy profile read. It is intentionally excluded from team snapshots
    /// and cache persistence because opening a player is the only consumer.
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats]
    /// The team's season-record page plus the bounded nflverse Compare evidence:
    /// read-only `teams`, `team_stats`, and `team_season_stats` projections with no
    /// schema change. Cached like the snapshot (cache-first with background refresh),
    /// not delegated like the schedule — the Stats data flow reuses the snapshot cache
    /// layer rather than inventing a second one.
    func teamStats(teamId: String) async throws -> TeamStatsPage
    /// Bounded player participation evidence. This is a live, read-only
    /// current/previous-season query kept separate from TeamStatsPage and TeamSnapshot;
    /// a default nil keeps unrelated focused test doubles source-compatible.
    func recentParticipation(teamId: String) async throws -> RecentParticipation?
    /// Cross-team player search for the switcher, mirroring web's
    /// `searchAllPlayers`. Searches every ingested team's players, not just the selected
    /// roster. A default no-op keeps test doubles honest until a real implementation
    /// lands; only SupabaseDepthRepository overrides it.
    func searchPlayers(query: String) async throws -> [PlayerHit]
    /// The team's passing/rushing/receiving leaders for one season (Stats page's ROSTER
    /// LEADERS card, mirrors web's getRosterLeaders): re-derived per season tab, not
    /// pinned to the roster's newest season, so the season switcher shows each season's
    /// own leaders. A default nil keeps unrelated focused test doubles source-compatible.
    func rosterLeaders(teamId: String, season: Int) async throws -> RosterLeaders?
    /// The team's R2 stat history: per-game lines, defense-allowed rates and league ranks.
    /// Nil when no file exists for the team, which callers render as absent, never zero.
    /// Read-only and independent of Supabase, so a default nil keeps test doubles
    /// source-compatible.
    func teamStatHistory(teamId: String) async throws -> TeamStatHistory?
    /// The player's career highs and their league ranks from the R2 highlight file. Nil when
    /// no file exists, which callers render as absent, never zero. Resolves historical ids the
    /// same way `playerStats` does.
    func playerHighlights(playerId: String, teamId: String?) async throws -> PlayerHighlights?
    /// League-wide records for one stat from the R2 record file, or nil when none exists.
    func leagueRecords(stat: RecordStat) async throws -> LeagueRecords?
    /// All 32 teams' kits as flat listings for the uniform archive (mirrors web's
    /// `listUniforms`). One query joins uniform rows with team conference/division in
    /// code — kit metadata only, no player/depth-chart embeds, so the payload stays
    /// bounded. Cache-first like the team list (stable, ~105 rows).
    func listUniforms() async throws -> [UniformListing]
    /// The public `app_config` singleton backing the update gate. Callers cache the last
    /// known value and
    /// fall back to it when this throws.
    func appConfig() async throws -> AppConfig

    /// Network-first variants of the cached reads, for a user-initiated refresh. A caching
    /// repository fetches from its source regardless of how fresh its stored copy is and
    /// stores the result; on failure it throws and leaves the stored copy untouched so the
    /// caller can keep showing it. Repositories with no cache fall back to the ordinary read.
    func freshTeams() async throws -> [Team]
    func freshTeamSnapshot(teamId: String) async throws -> TeamSnapshot
    func freshTeamStats(teamId: String) async throws -> TeamStatsPage
    func freshTeamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule
    func freshUniforms() async throws -> [UniformListing]
    /// Warms the other cached reads after a user-initiated refresh (the team list, the uniform
    /// archive and, when given, that team's snapshot, stats and schedule) so the next screen
    /// opens with current data. `refreshed` is the read the caller has just fetched, which is
    /// skipped. Returns once the work is started, not when it finishes.
    func refreshRelatedInBackground(teamId: String?, after refreshed: RefreshedRead) async
}

/// The cached read a user-initiated refresh fetched itself.
enum RefreshedRead: Sendable {
    case teams, snapshot, stats, schedule, uniforms
}

extension DepthRepository {
    func freshTeams() async throws -> [Team] { try await teams() }
    func freshTeamSnapshot(teamId: String) async throws -> TeamSnapshot {
        try await teamSnapshot(teamId: teamId)
    }
    func freshTeamStats(teamId: String) async throws -> TeamStatsPage {
        try await teamStats(teamId: teamId)
    }
    func freshTeamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        try await teamSchedule(teamId: teamId, season: season)
    }
    func freshUniforms() async throws -> [UniformListing] { try await listUniforms() }
    func refreshRelatedInBackground(teamId: String?, after refreshed: RefreshedRead) async {}
    func recentParticipation(teamId: String) async throws -> RecentParticipation? { nil }
    func searchPlayers(query: String) async throws -> [PlayerHit] { [] }
    func rosterLeaders(teamId: String, season: Int) async throws -> RosterLeaders? { nil }
    func listUniforms() async throws -> [UniformListing] { [] }
    func teamStatHistory(teamId: String) async throws -> TeamStatHistory? { nil }
    func playerHighlights(playerId: String, teamId: String?) async throws -> PlayerHighlights? {
        nil
    }
    func leagueRecords(stat: RecordStat) async throws -> LeagueRecords? { nil }
}
