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
    /// The selected team's latest available regular-season schedule when `season` is
    /// nil, or a requested historical season. This remains a standalone read so it
    /// does not bloat the cacheable depth-chart snapshot.
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule
    /// Independent lazy profile read. It is intentionally excluded from team snapshots
    /// and cache persistence because opening a player is the only consumer.
    func playerStats(playerId: String) async throws -> [PlayerSeasonStats]
    /// The public `app_config` singleton backing the update gate (design spec's
    /// "Database evolution and update gate"). Callers cache the last known value and
    /// fall back to it when this throws.
    func appConfig() async throws -> AppConfig
}
