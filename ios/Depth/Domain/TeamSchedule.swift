import Foundation

// Immutable season schedule rendered by the Schedule feature. Scores and
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
    let preseasonGames: [ScheduleGame]
    let postseasonGames: [ScheduleGame]

    init(
        season: Int,
        games: [ScheduleGame],
        preseasonGames: [ScheduleGame] = [],
        postseasonGames: [ScheduleGame] = []
    ) {
        self.season = season
        self.games = games
        self.preseasonGames = preseasonGames
        self.postseasonGames = postseasonGames
    }

    private enum CodingKeys: String, CodingKey { case season, games, preseasonGames, postseasonGames }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            season: try container.decode(Int.self, forKey: .season),
            games: try container.decode([ScheduleGame].self, forKey: .games),
            preseasonGames: try container.decodeIfPresent([ScheduleGame].self, forKey: .preseasonGames) ?? [],
            postseasonGames: try container.decodeIfPresent([ScheduleGame].self, forKey: .postseasonGames) ?? []
        )
    }
}

enum ScheduleResult: String, Equatable, Sendable, Codable {
    case win = "W"
    case loss = "L"
    case tie = "T"
}

struct ScheduleGame: Equatable, Identifiable, Sendable, Codable {
    let week: Int
    let gameType: String
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
        gameType: String = "REG",
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
        self.gameType = gameType
        self.isBye = isBye
        self.date = date
        self.isHome = isHome
        self.opponent = opponent
        self.teamScore = teamScore
        self.opponentScore = opponentScore
        self.result = result
        self.market = market
    }

    private enum CodingKeys: String, CodingKey {
        case week, gameType, isBye, date, isHome, opponent, teamScore, opponentScore, result, market
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            week: try container.decode(Int.self, forKey: .week),
            gameType: try container.decodeIfPresent(String.self, forKey: .gameType) ?? "REG",
            isBye: try container.decode(Bool.self, forKey: .isBye),
            date: try container.decodeIfPresent(String.self, forKey: .date),
            isHome: try container.decode(Bool.self, forKey: .isHome),
            opponent: try container.decodeIfPresent(Team.self, forKey: .opponent),
            teamScore: try container.decodeIfPresent(Int.self, forKey: .teamScore),
            opponentScore: try container.decodeIfPresent(Int.self, forKey: .opponentScore),
            result: try container.decodeIfPresent(ScheduleResult.self, forKey: .result),
            market: try container.decodeIfPresent(ScheduleGameMarket.self, forKey: .market)
        )
    }

    var id: Int { week }

    var phaseLabel: String {
        switch gameType {
        case "PRE": return "Preseason"
        case "WC": return "Wild Card"
        case "DIV": return "Divisional"
        case "CON": return "Conference"
        case "SB": return "Super Bowl"
        default: return "Week \(week)"
        }
    }
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
