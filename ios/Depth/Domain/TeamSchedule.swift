import Foundation

// Immutable regular-season schedule rendered by the Schedule feature. Scores and
// opponent identity remain optional because public source data can legitimately be
// incomplete; callers show an explicit unavailable/no-result state instead of inventing
// a score or opponent.
//
// Codable so T5's cache layer can store one schedule as a JSON payload per SwiftData row
// (same pattern as TeamSnapshot/TeamStatsPage).
struct TeamSchedule: Equatable, Sendable, Codable {
    static let earliestSeason = 1999
    let season: Int
    let games: [ScheduleGame]
}

enum ScheduleResult: String, Equatable, Sendable, Codable {
    case win = "W"
    case loss = "L"
    case tie = "T"
}

struct ScheduleGame: Equatable, Identifiable, Sendable, Codable {
    let week: Int
    let isBye: Bool
    let date: String?
    let isHome: Bool
    let opponent: Team?
    let teamScore: Int?
    let opponentScore: Int?
    let result: ScheduleResult?
    /// Optional keeps schedules cached before DEP-315 decodable. A present value is
    /// explicitly nflverse's market view, never Depth's forecast model.
    let market: ScheduleGameMarket?

    init(
        week: Int,
        isBye: Bool,
        date: String?,
        isHome: Bool,
        opponent: Team?,
        teamScore: Int?,
        opponentScore: Int?,
        result: ScheduleResult?,
        market: ScheduleGameMarket? = nil
    ) {
        self.week = week
        self.isBye = isBye
        self.date = date
        self.isHome = isHome
        self.opponent = opponent
        self.teamScore = teamScore
        self.opponentScore = opponentScore
        self.result = result
        self.market = market
    }

    var id: Int { week }
}

// The current nflverse pregame market snapshot, oriented to the selected team. Raw
// American odds stay beside the normalized two-sided probability for auditability.
struct ScheduleGameMarket: Equatable, Sendable, Codable {
    enum Source: String, Equatable, Sendable, Codable {
        case nflverse
    }

    let teamMoneyline: Double?
    let opponentMoneyline: Double?
    let teamSpread: Double?
    let teamSpreadOdds: Double?
    let opponentSpreadOdds: Double?
    let totalLine: Double?
    let underOdds: Double?
    let overOdds: Double?
    let impliedWinProbability: Double?
    let favoriteTeamId: String?
    let isPickEm: Bool
    let isNeutralSite: Bool
    let source: Source
    let updatedAt: String?
}
