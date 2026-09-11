import Foundation

// Exact projection row for player_recent_snaps. Every selected database column has an
// explicit snake-case key so Supabase decoding cannot silently depend on decoder-wide
// key strategies, and updatedAt remains a string for byte-for-byte web parity.
struct RecentParticipationDTO: Decodable, Sendable {
    let teamId: String
    let season: Int
    let playerId: String
    let windowStartWeek: Int
    let windowEndWeek: Int
    let windowGameIds: [String]
    let games: Int
    let offenseSnaps: Int
    let offensePercentage: Double?
    let defenseSnaps: Int
    let defensePercentage: Double?
    let specialTeamsSnaps: Int
    let specialTeamsPercentage: Double?
    let source: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case teamId = "team_id"
        case season
        case playerId = "player_id"
        case windowStartWeek = "window_start_week"
        case windowEndWeek = "window_end_week"
        case windowGameIds = "window_game_ids"
        case games
        case offenseSnaps = "offense_snaps"
        case offensePercentage = "offense_pct"
        case defenseSnaps = "defense_snaps"
        case defensePercentage = "defense_pct"
        case specialTeamsSnaps = "special_teams_snaps"
        case specialTeamsPercentage = "special_teams_pct"
        case source
        case updatedAt = "updated_at"
    }
}
