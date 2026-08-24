import Foundation

// Mirrors lib/roster-source.ts's TeamStatsPage / lib/types.ts's TeamStats. The base
// record fields remain the round-4 Stats page contract; DEP-312 adds only the bounded
// nflverse evidence needed by Compare. `seasons` is newest-first, matching web's
// fetchTeamStatsPage ordering (`.order('season', { ascending: false })`).
// `upcomingSeason` is set for ALL teams during the NFL off-season (web:
// `isOffseason ? upcomingSeason : undefined`), letting the season switcher show an
// upcoming chip for every team. Codable so the snapshot cache layer can persist it as
// one JSON payload per team, exactly like `TeamSnapshot`.
struct TeamStatsPage: Equatable, Codable, Sendable {
    let team: Team
    let seasons: [TeamSeasonStats]
    let upcomingSeason: Int?
    /// The current NFL season year. A season is "completed" (all games played, playoff
    /// outcomes known) when its year is less than this. Used to scope the next-game card
    /// to the current/upcoming season tab (web: TeamStatsView's isViewingCurrentSeason /
    /// isViewingUpcomingSeason).
    let currentSeason: Int
}

// One team_stats row per ingested season (current + up to two prior, web's
// docs/superpowers/specs/2026-07-14-multi-season-team-stats-design.md). Every field is
// non-optional here because a present row was always written from a complete parse
// (web's writeTeamStats skips the upsert on a partial entry); the mapper's `?? 0`
// fallbacks guard only the nullable-by-schema DTO type.
struct TeamSeasonStats: Equatable, Codable, Sendable {
    let season: Int
    let overallWins: Int
    let overallLosses: Int
    let overallTies: Int
    let homeWins: Int
    let homeLosses: Int
    let roadWins: Int
    let roadLosses: Int
    let divisionWins: Int
    let divisionLosses: Int
    let conferenceWins: Int
    let conferenceLosses: Int
    let pointsFor: Int
    let pointsAgainst: Int
    let pointDifferential: Int
    /// DEP-312's bounded nflverse evidence contract. Optional at the object level so
    /// seasons without a matching source row—and caches written before this additive
    /// field existed—remain valid rather than fabricating zero-valued metrics.
    let matchupMetrics: TeamMatchupMetrics?
}

// Auditable inputs for Compare's Offense, Defense, and Special Teams lenses (DEP-312).
// Raw source values stay beside derived rates so the presentation layer can explain a
// number without reimplementing data math. Every nullable source field stays optional.
struct TeamMatchupMetrics: Equatable, Codable, Sendable {
    enum Source: String, Equatable, Codable, Sendable {
        case nflverse
    }

    let source: Source
    let season: Int
    let updatedAt: String
    let games: Int?
    let passingEPA: Double?
    let rushingEPA: Double?
    let passAttempts: Int?
    let rushAttempts: Int?
    let sacksSuffered: Int?
    let offensiveEPA: Double?
    let offensivePlays: Int?
    let offensiveEPAPerPlay: Double?
    let passingInterceptions: Int?
    let fumblesLost: Int?
    let giveaways: Int?
    let defensiveSacks: Double?
    let quarterbackHits: Int?
    let quarterbackHitsPerGame: Double?
    let defensiveInterceptions: Int?
    let defensiveFumbleRecoveries: Int?
    let defensiveFumblesForced: Int?
    let defensiveTakeaways: Int?
    let defensiveTakeawaysPerGame: Double?
    let fieldGoalsMade: Int?
    let fieldGoalsAttempted: Int?
    let fieldGoalPercentage: Double?
    let puntAttempts: Int?
    let netPuntYards: Int?
    let netPuntYardsPerAttempt: Double?
    let puntReturns: Int?
    let puntReturnYards: Int?
    let puntReturnYardsPerAttempt: Double?
    let kickoffReturns: Int?
    let kickoffReturnYards: Int?
    let kickoffReturnYardsPerAttempt: Double?
    let specialTeamsTouchdowns: Int?

    enum CodingKeys: String, CodingKey {
        case source
        case season
        case updatedAt
        case games
        case passingEPA = "passingEpa"
        case rushingEPA = "rushingEpa"
        case passAttempts
        case rushAttempts
        case sacksSuffered
        case offensiveEPA = "offensiveEpa"
        case offensivePlays
        case offensiveEPAPerPlay = "offensiveEpaPerPlay"
        case passingInterceptions
        case fumblesLost
        case giveaways
        case defensiveSacks
        case quarterbackHits
        case quarterbackHitsPerGame
        case defensiveInterceptions
        case defensiveFumbleRecoveries
        case defensiveFumblesForced
        case defensiveTakeaways
        case defensiveTakeawaysPerGame
        case fieldGoalsMade
        case fieldGoalsAttempted
        case fieldGoalPercentage
        case puntAttempts
        case netPuntYards
        case netPuntYardsPerAttempt
        case puntReturns
        case puntReturnYards
        case puntReturnYardsPerAttempt
        case kickoffReturns
        case kickoffReturnYards
        case kickoffReturnYardsPerAttempt
        case specialTeamsTouchdowns
    }
}

enum MatchupMetricDirection: Sendable {
    case higher
    case lower
}

// Fan-facing leader copy shared by the future lenses. Requiring both values prevents a
// partial nflverse row from turning into a confident comparison.
func matchupLeaderLabel(
    teamALabel: String,
    valueA: Double?,
    teamBLabel: String,
    valueB: Double?,
    metricLabel: String,
    direction: MatchupMetricDirection = .higher
) -> String? {
    guard let valueA, let valueB else { return nil }
    guard valueA != valueB else { return "Even in \(metricLabel)" }
    let aLeads = direction == .higher ? valueA > valueB : valueA < valueB
    return "\(aLeads ? teamALabel : teamBLabel) leads in \(metricLabel)"
}

struct MatchupMetricComparison: Equatable, Sendable {
    let teamAValue: Double?
    let teamBValue: Double?
    let leaderLabel: String?
}

func compareMatchupMetric(
    teamALabel: String,
    valueA: Double?,
    teamBLabel: String,
    valueB: Double?,
    metricLabel: String,
    direction: MatchupMetricDirection = .higher
) -> MatchupMetricComparison {
    MatchupMetricComparison(
        teamAValue: valueA,
        teamBValue: valueB,
        leaderLabel: matchupLeaderLabel(
            teamALabel: teamALabel,
            valueA: valueA,
            teamBLabel: teamBLabel,
            valueB: valueB,
            metricLabel: metricLabel,
            direction: direction
        )
    )
}
