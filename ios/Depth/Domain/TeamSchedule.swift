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
    let preseason: [ScheduleGame]
    /// A nil run means the team did not qualify or the source has not published a valid
    /// seed yet. This keeps the Schedule screen from implying postseason participation.
    let postseason: PostseasonRun?

    init(
        season: Int,
        games: [ScheduleGame],
        preseason: [ScheduleGame] = [],
        postseason: PostseasonRun? = nil
    ) {
        self.season = season
        self.games = games
        self.preseason = preseason
        self.postseason = postseason
    }

    enum CodingKeys: String, CodingKey {
        case season, games, preseason, postseason
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        season = try container.decode(Int.self, forKey: .season)
        games = try container.decode([ScheduleGame].self, forKey: .games)
        preseason = try container.decodeIfPresent([ScheduleGame].self, forKey: .preseason) ?? []
        // Caches written before the 3c run model remain a valid regular-season cache.
        postseason = try container.decodeIfPresent(PostseasonRun.self, forKey: .postseason)
    }
}

// The postseason ladder is intentionally a fixed four-round shape. A missing game is a
// truthful unreached round (or an earned Wild Card bye), rather than an invented matchup.
struct PostseasonRun: Equatable, Sendable, Codable {
    let seed: Int
    let rounds: [PostseasonRound]

    var terminalRound: PostseasonRoundKind? {
        rounds.last(where: { $0.game?.result != nil })?.kind
    }
}

enum PostseasonRoundKind: String, Equatable, Sendable, Codable, CaseIterable {
    case wildCard
    case divisional
    case conference
    case superBowl

    var title: String {
        switch self {
        case .wildCard: "WILD CARD"
        case .divisional: "DIVISIONAL"
        case .conference: "CONFERENCE"
        case .superBowl: "SUPER BOWL"
        }
    }

    static func from(gameType: String) -> Self? {
        switch gameType {
        case "WC": .wildCard
        case "DIV": .divisional
        case "CON": .conference
        case "SB": .superBowl
        default: nil
        }
    }
}

struct PostseasonRound: Equatable, Sendable, Codable, Identifiable {
    let kind: PostseasonRoundKind
    let game: ScheduleGame?

    var id: PostseasonRoundKind { kind }
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
