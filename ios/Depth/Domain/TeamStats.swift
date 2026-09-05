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
    /// The current live coach when ESPN reports a zero-tenure hire. Unlike a season coach,
    /// this belongs to the upcoming season and must not be attached to prior results.
    var incomingCoach: TeamIncomingCoach?
    /// This team's league position per metric, keyed by season (web:
    /// `TeamStatsPage.leagueRanksBySeason`). An empty map is a truthful "no ranks known",
    /// so this stays non-optional — but a property default does NOT make the synthesized
    /// decoder tolerate a missing key, hence the custom `init(from:)` below. Without it a
    /// snapshot cached before this field existed fails to decode and costs a live refetch
    /// on every launch until the store is wiped.
    var leagueRanksBySeason: [Int: TeamStatsRanks] = [:]
    /// The current NFL season year. A season is "completed" (all games played, playoff
    /// outcomes known) when its year is less than this. Used to scope the next-game card
    /// to the current/upcoming season tab (web: TeamStatsView's isViewingCurrentSeason /
    /// isViewingUpcomingSeason).
    let currentSeason: Int

    init(
        team: Team,
        seasons: [TeamSeasonStats],
        upcomingSeason: Int?,
        incomingCoach: TeamIncomingCoach? = nil,
        leagueRanksBySeason: [Int: TeamStatsRanks] = [:],
        currentSeason: Int
    ) {
        self.team = team
        self.seasons = seasons
        self.upcomingSeason = upcomingSeason
        self.incomingCoach = incomingCoach
        self.leagueRanksBySeason = leagueRanksBySeason
        self.currentSeason = currentSeason
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        team = try container.decode(Team.self, forKey: .team)
        seasons = try container.decode([TeamSeasonStats].self, forKey: .seasons)
        upcomingSeason = try container.decodeIfPresent(Int.self, forKey: .upcomingSeason)
        incomingCoach = try container.decodeIfPresent(TeamIncomingCoach.self, forKey: .incomingCoach)
        currentSeason = try container.decode(Int.self, forKey: .currentSeason)
        // decodeIfPresent, not decode: a cache written before ranks existed has no such
        // key, and that must degrade to "no ranks" rather than failing the whole read.
        leagueRanksBySeason =
            try container.decodeIfPresent([Int: TeamStatsRanks].self, forKey: .leagueRanksBySeason)
            ?? [:]
    }
}

/// A newly hired coach reported by the live team record before they have a season result.
struct TeamIncomingCoach: Equatable, Codable, Sendable {
    let name: String
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
    /// Web-parity fields the round-4 port left out. All optional, which is both honest
    /// and load-bearing: a snapshot cached before they existed decodes with them absent,
    /// where a non-optional property — even one with a default — would fail the whole
    /// read and cost a live refetch on every launch until the store was wiped.
    ///
    /// Each would also be a lie at zero. `winPercent` 0 is a real winless season;
    /// `playoffSeed` 0 already means "missed the playoffs"; `streak` is preformatted by
    /// ESPN ("W3") and has no numeric identity. `coach` is season-scoped — the coach who
    /// led this team in 2023 is not the one leading it in 2025.
    var winPercent: Double?
    var streak: String?
    var playoffSeed: Int?
    var coach: TeamSeasonCoach?
    var passingYards: Int?
    var rushingYards: Int?
}

/// The hand-curated head coach for one season (web: `TeamStats.coach`, sourced from
/// team_coach_seasons, not ESPN's live `teams.coach_name`).
struct TeamSeasonCoach: Equatable, Codable, Sendable {
    let name: String
    let experience: Int
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
    /// Sacks as a share of dropbacks (0-1, not a percentage). Compare computed this
    /// inline in its own catalog; the Stats page ranks it league-wide, so it belongs on
    /// the contract rather than being recomputed per surface. Mirrors web's
    /// `TeamMatchupMetrics.sackRate`.
    let sackRate: Double?
    let passingInterceptions: Int?
    let fumblesLost: Int?
    let giveaways: Int?
    /// Takeaways won minus giveaways conceded. Signed, and nil unless BOTH halves are
    /// known — a team with an unknown giveaway count has an unknown margin, not one
    /// equal to its takeaways.
    let turnoverMargin: Int?
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
        case sackRate
        case passingInterceptions
        case fumblesLost
        case giveaways
        case turnoverMargin
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
