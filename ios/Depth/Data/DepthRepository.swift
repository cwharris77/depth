import Foundation

// The one seam Features/ is allowed to depend on for data access — views never query
// Supabase or receive a raw client directly (design spec's Architecture section).
protocol DepthRepository: Sendable {
    /// The 32-team list used by the searchable team selector (T6) — flat columns only,
    /// no nested depth-chart/uniform embeds (Performance Review #1's `select(*)`
    /// prohibition applies here too: this is a separate, lighter projection from
    /// `teamSnapshot`, not a side effect of it).
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
    /// The team's season-record page plus DEP-312's bounded nflverse Compare evidence:
    /// read-only `teams`, `team_stats`, and `team_season_stats` projections with no
    /// schema change. Cached like the snapshot (cache-first with background refresh),
    /// not delegated like the schedule — the Stats data flow reuses the snapshot cache
    /// layer rather than inventing a second one.
    func teamStats(teamId: String) async throws -> TeamStatsPage
    /// Cross-team player search for the switcher (2026-08-15 navigation-parity round 2:
    /// "search should work for players as well as teams"), mirroring web's
    /// `searchAllPlayers`. Searches every ingested team's players, not just the selected
    /// roster. A default no-op keeps test doubles honest until a real implementation
    /// lands; only SupabaseDepthRepository overrides it.
    func searchPlayers(query: String) async throws -> [PlayerHit]
    /// All 32 teams' kits as flat listings for the uniform archive (mirrors web's
    /// `listUniforms`). One query joins uniform rows with team conference/division in
    /// code — kit metadata only, no player/depth-chart embeds, so the payload stays
    /// bounded. Cache-first like the team list (stable, ~105 rows).
    func listUniforms() async throws -> [UniformListing]
    /// The public `app_config` singleton backing the update gate (design spec's
    /// "Database evolution and update gate"). Callers cache the last known value and
    /// fall back to it when this throws.
    func appConfig() async throws -> AppConfig
}

extension DepthRepository {
    func searchPlayers(query: String) async throws -> [PlayerHit] { [] }
    func listUniforms() async throws -> [UniformListing] { [] }
}
