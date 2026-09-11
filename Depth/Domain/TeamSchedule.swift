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
    /// The selected team's conference, for the postseason header ("NFC · 11-6"). nil when
    /// the team list did not resolve the team; the header then shows the record alone.
    let conference: String?

    init(
        season: Int,
        games: [ScheduleGame],
        preseason: [ScheduleGame] = [],
        postseason: PostseasonRun? = nil,
        conference: String? = nil
    ) {
        self.season = season
        self.games = games
        self.preseason = preseason
        self.postseason = postseason
        self.conference = conference
    }

    enum CodingKeys: String, CodingKey {
        case season, games, preseason, postseason, conference
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        season = try container.decode(Int.self, forKey: .season)
        games = try container.decode([ScheduleGame].self, forKey: .games)
        preseason = try container.decodeIfPresent([ScheduleGame].self, forKey: .preseason) ?? []
        // Caches written before the 3c run model remain a valid regular-season cache.
        postseason = try container.decodeIfPresent(PostseasonRun.self, forKey: .postseason)
        conference = try container.decodeIfPresent(String.self, forKey: .conference)
    }

    /// True once every scheduled regular-season game has a final score. `team_stats`
    /// publishes a conference standings position all season, so a seed is only a real
    /// playoff seed — and its absence only means "missed" — after this is true.
    var isRegularSeasonComplete: Bool {
        !games.isEmpty && games.allSatisfy { $0.isBye || $0.result != nil }
    }

    /// Regular-season record from played games, "W-L" or "W-L-T" when a tie exists.
    var regularSeasonRecord: String {
        let results = games.compactMap(\.result)
        let wins = results.filter { $0 == .win }.count
        let losses = results.filter { $0 == .loss }.count
        let ties = results.filter { $0 == .tie }.count
        return ties > 0 ? "\(wins)-\(losses)-\(ties)" : "\(wins)-\(losses)"
    }
}

/// What the PLAYOFFS phase can truthfully say about a season. `notStarted` covers an
/// upcoming or in-progress season: no seed is final yet, so claiming a team missed the
/// postseason would be a false negative (the same trap DEP-120 fixed on Stats).
enum PlayoffsState: Equatable, Sendable {
    case notStarted
    case missed
    case run(PostseasonRun)
}

// The postseason ladder is intentionally a fixed four-round shape. A missing game is a
// truthful unreached round (or an earned Wild Card bye), rather than an invented matchup.
struct PostseasonRun: Equatable, Sendable, Codable {
    let seed: Int
    let rounds: [PostseasonRound]

    var terminalRound: PostseasonRoundKind? {
        rounds.last(where: { $0.game?.result != nil })?.kind
    }

    /// Index of the last decided round — the point the rail draws to. nil before any
    /// postseason game has a result.
    var terminalIndex: Int? {
        rounds.lastIndex(where: { $0.game?.result != nil })
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

    /// The round's title for a season. The Super Bowl carries its game number — played
    /// the February after `season`, so the 1966 season's is I — in Roman numerals, except
    /// Super Bowl 50, which the league branded with Arabic numerals.
    func title(season: Int) -> String {
        guard self == .superBowl else { return title }
        let number = season - 1965
        guard number > 0 else { return title }
        return number == 50 ? "SUPER BOWL 50" : "SUPER BOWL \(romanNumeral(number))"
    }

    private func romanNumeral(_ value: Int) -> String {
        let symbols: [(Int, String)] = [
            (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
            (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
        ]
        var remaining = value
        var result = ""
        for (amount, symbol) in symbols {
            while remaining >= amount {
                result += symbol
                remaining -= amount
            }
        }
        return result
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

    /// Card eyebrow and accessibility prefix. Week 0 only exists in the preseason: the
    /// ESPN preseason ingest (web/lib/espn/preseason.ts) numbers the Hall of Fame game 0 and
    /// "Preseason Week N" as N, while ScheduleMapper rejects a regular-season week below 1.
    var weekTitle: String {
        week == 0 ? "Hall of Fame" : "Week \(week)"
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
