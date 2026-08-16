import Foundation

// Supabase/PostgREST DTO for the projected team_stats query — the exact shape of
// `SELECT ... FROM team_stats` (SupabaseDepthRepository.teamStatsSelect), matching the
// columns in supabase/migrations/20260712160000_add_team_stats.sql. Never crosses into
// Features/; TeamStatsMapper converts to the immutable Domain structs. All stat columns
// are optional (nullable by schema) — a present row is always complete in practice
// (web's writeTeamStats skips the upsert on a partial entry), so the mapper defaults
// missing values to 0 rather than treating them as an error. Explicit CodingKeys per
// field, no blanket snake_case conversion — a column rename is a compile error here
// rather than a silent decode failure (same convention as TeamSnapshotDTO).
struct TeamStatsRowDTO: Decodable {
    let season: Int
    let overallWins: Int?
    let overallLosses: Int?
    let overallTies: Int?
    let homeWins: Int?
    let homeLosses: Int?
    let roadWins: Int?
    let roadLosses: Int?
    let divisionWins: Int?
    let divisionLosses: Int?
    let conferenceWins: Int?
    let conferenceLosses: Int?
    let pointsFor: Int?
    let pointsAgainst: Int?
    let pointDifferential: Int?

    enum CodingKeys: String, CodingKey {
        case season
        case overallWins = "overall_wins"
        case overallLosses = "overall_losses"
        case overallTies = "overall_ties"
        case homeWins = "home_wins"
        case homeLosses = "home_losses"
        case roadWins = "road_wins"
        case roadLosses = "road_losses"
        case divisionWins = "division_wins"
        case divisionLosses = "division_losses"
        case conferenceWins = "conference_wins"
        case conferenceLosses = "conference_losses"
        case pointsFor = "points_for"
        case pointsAgainst = "points_against"
        case pointDifferential = "point_differential"
    }
}