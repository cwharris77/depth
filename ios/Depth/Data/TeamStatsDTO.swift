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

// Exact PostgREST projection for DEP-312's bounded team_season_stats read. This is a
// deliberately small subset of the wide nflverse row: only raw values consumed by the
// approved Compare lenses plus season/freshness provenance.
struct TeamMatchupMetricsDTO: Decodable {
    let season: Int
    let updatedAt: String
    let games: Int?
    let attempts: Int?
    let carries: Int?
    let sacksSuffered: Int?
    let passingEPA: Double?
    let rushingEPA: Double?
    let passingInterceptions: Int?
    let fumblesLostTotal: Int?
    let defensiveSacks: Double?
    let quarterbackHits: Int?
    let defensiveInterceptions: Int?
    let defensiveFumbleRecoveries: Int?
    let defensiveFumblesForced: Int?
    let fieldGoalsMade: Int?
    let fieldGoalsAttempted: Int?
    let puntAttempts: Int?
    let netPuntYards: Int?
    let puntReturns: Int?
    let puntReturnYards: Int?
    let kickoffReturns: Int?
    let kickoffReturnYards: Int?
    let specialTeamsTouchdowns: Int?

    enum CodingKeys: String, CodingKey {
        case season
        case updatedAt = "updated_at"
        case games
        case attempts
        case carries
        case sacksSuffered = "sacks_suffered"
        case passingEPA = "passing_epa"
        case rushingEPA = "rushing_epa"
        case passingInterceptions = "passing_interceptions"
        case fumblesLostTotal = "fumbles_lost_total"
        case defensiveSacks = "def_sacks"
        case quarterbackHits = "def_qb_hits"
        case defensiveInterceptions = "def_interceptions"
        case defensiveFumbleRecoveries = "def_fumbles"
        case defensiveFumblesForced = "def_fumbles_forced"
        case fieldGoalsMade = "fg_made"
        case fieldGoalsAttempted = "fg_att"
        case puntAttempts = "pt_att"
        case netPuntYards = "pt_net_yards"
        case puntReturns = "punt_returns"
        case puntReturnYards = "punt_return_yards"
        case kickoffReturns = "kickoff_returns"
        case kickoffReturnYards = "kickoff_return_yards"
        case specialTeamsTouchdowns = "special_teams_tds"
    }
}
