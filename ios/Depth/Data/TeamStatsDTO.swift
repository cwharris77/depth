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
    /// Web parity (TeamStatsView's hero right column): `streak` is preformatted by ESPN
    /// ("W3"), `playoffSeed` is 0 for a team that missed, which the view reads as
    /// "MISSED PLAYOFFS" only once the season is complete.
    let winPercent: Double?
    let streak: String?
    let playoffSeed: Int?

    enum CodingKeys: String, CodingKey {
        case season
        case winPercent = "win_percent"
        case streak
        case playoffSeed = "playoff_seed"
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
// Conforms to `RawTeamMetricColumns` so the per-team read and the league-wide rank read
// share one derivation (see Domain/TeamMetricsDerivation.swift).
struct TeamMatchupMetricsDTO: Decodable, RawTeamMetricColumns {
    let season: Int
    let updatedAt: String
    /// Web parity: the Stats page's PASS YDS / RUSH YDS row, which Compare never needed.
    let passingYards: Int?
    let rushingYards: Int?
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
        case passingYards = "passing_yards"
        case rushingYards = "rushing_yards"
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

// League-wide rank reads. Both are unscoped by team (all 32 × every season), so they
// carry only the columns a rank is actually built from — see web's
// TEAM_STATS_RANK_SELECT / TEAM_SEASON_STATS_RANK_SELECT, whose column lists these
// mirror exactly.

struct TeamStatsRankDTO: Decodable {
    let teamId: String
    let season: Int
    let winPercent: Double?
    let pointsFor: Int?
    let pointsAgainst: Int?
    let pointDifferential: Int?

    enum CodingKeys: String, CodingKey {
        case teamId = "team_id"
        case season
        case winPercent = "win_percent"
        case pointsFor = "points_for"
        case pointsAgainst = "points_against"
        case pointDifferential = "point_differential"
    }
}

// Conforms to `RawTeamMetricColumns` so a rank is computed from the same derivation the
// rendered value uses. A column dropped from the select would make its metric nil for
// every team at once rather than failing loudly — keep the properties, the CodingKeys,
// and SupabaseDepthRepository.teamSeasonStatsRankSelect edited together.
struct TeamSeasonStatsRankDTO: Decodable, RawTeamMetricColumns {
    let teamId: String
    let season: Int
    let passingYards: Int?
    let rushingYards: Int?
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
    let fieldGoalsMade: Int?
    let fieldGoalsAttempted: Int?
    let puntAttempts: Int?
    let netPuntYards: Int?
    let puntReturns: Int?
    let puntReturnYards: Int?
    let kickoffReturns: Int?
    let kickoffReturnYards: Int?

    enum CodingKeys: String, CodingKey {
        case teamId = "team_id"
        case season
        case passingYards = "passing_yards"
        case rushingYards = "rushing_yards"
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
        case fieldGoalsMade = "fg_made"
        case fieldGoalsAttempted = "fg_att"
        case puntAttempts = "pt_att"
        case netPuntYards = "pt_net_yards"
        case puntReturns = "punt_returns"
        case puntReturnYards = "punt_return_yards"
        case kickoffReturns = "kickoff_returns"
        case kickoffReturnYards = "kickoff_return_yards"
    }
}

// The hand-curated season-scoped head coach (web: TEAM_COACH_SEASONS_SELECT). A season
// with no curated row simply has no coach — degrade, don't fake (invariant 6).
struct TeamCoachSeasonDTO: Decodable {
    let season: Int
    let coachName: String
    let coachExperience: Int

    enum CodingKeys: String, CodingKey {
        case season
        case coachName = "coach_name"
        case coachExperience = "coach_experience"
    }
}
