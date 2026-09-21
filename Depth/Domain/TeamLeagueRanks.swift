import Foundation

// Swift port of web's `buildLeagueRanks` (web/lib/roster-source.db.ts) and its
// `TeamStatsRanks` contract (web/lib/roster-source.ts).
//
// One team's league position (1 = best) per metric, per season. A rank is absent
// whenever the team's own source value is missing, so the Stats page renders the value
// with no rank caption rather than implying a last-place finish.
//
// Why the Stats page needs this at all: a Compare table answers "which of these two is
// bigger"; a single-team page answers "where does this team sit in the league". The
// league rank is what replaces Compare's second team column, so every metric the Stats
// page renders needs one.

struct TeamStatsRanks: Equatable, Codable, Sendable {
    var winPercent: Int?
    var pointsFor: Int?
    var pointsAgainst: Int?
    var pointDifferential: Int?
    var passingYards: Int?
    var rushingYards: Int?
    // Team-level (rendered in the record breakdown, beside DIFF)
    var turnoverMargin: Int?
    // Offense
    var offensiveEPAPerPlay: Int?
    var sackRate: Int?
    var passingEPA: Int?
    var rushingEPA: Int?
    var passingInterceptions: Int?
    var fumblesLost: Int?
    // Defense
    var defensiveSacks: Int?
    var quarterbackHitsPerGame: Int?
    var defensiveTakeaways: Int?
    var defensiveInterceptions: Int?
    // Special teams
    var fieldGoalPercentage: Int?
    var netPuntYardsPerAttempt: Int?
    var puntReturnYardsPerAttempt: Int?
    var kickoffReturnYardsPerAttempt: Int?
    // Offensive line (team_line_stats; nflverse pbp, pressure via FTN charting). ALY and
    // the level-yard rates rank higher-first; stuffed/sack/pressure rates rank ascending
    // (fewer is better).
    var adjustedLineYards: Int?
    var stuffedRate: Int?
    var powerSuccessRate: Int?
    var secondLevelYardsPerRush: Int?
    var openFieldYardsPerRush: Int?
    var lineSackRate: Int?
    var pressureRate: Int?
    var avgTimeToThrow: Int?
    var avgPassRushers: Int?
    /// Per-metric populations after the line-stat coverage/null filters. This prevents a
    /// qualified subset from being presented as a rank across all 32 NFL teams.
    var lineRankPopulation: [String: Int] = [:]
}

extension TeamStatsRanks {
    enum CodingKeys: String, CodingKey {
        case winPercent, pointsFor, pointsAgainst, pointDifferential, passingYards, rushingYards
        case turnoverMargin, offensiveEPAPerPlay, sackRate, passingEPA, rushingEPA
        case passingInterceptions, fumblesLost, defensiveSacks, quarterbackHitsPerGame
        case defensiveTakeaways, defensiveInterceptions, fieldGoalPercentage
        case netPuntYardsPerAttempt, puntReturnYardsPerAttempt, kickoffReturnYardsPerAttempt
        case adjustedLineYards, stuffedRate, powerSuccessRate, secondLevelYardsPerRush
        case openFieldYardsPerRush, lineSackRate, pressureRate, avgTimeToThrow, avgPassRushers
        case lineRankPopulation
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        winPercent = try container.decodeIfPresent(Int.self, forKey: .winPercent)
        pointsFor = try container.decodeIfPresent(Int.self, forKey: .pointsFor)
        pointsAgainst = try container.decodeIfPresent(Int.self, forKey: .pointsAgainst)
        pointDifferential = try container.decodeIfPresent(Int.self, forKey: .pointDifferential)
        passingYards = try container.decodeIfPresent(Int.self, forKey: .passingYards)
        rushingYards = try container.decodeIfPresent(Int.self, forKey: .rushingYards)
        turnoverMargin = try container.decodeIfPresent(Int.self, forKey: .turnoverMargin)
        offensiveEPAPerPlay = try container.decodeIfPresent(Int.self, forKey: .offensiveEPAPerPlay)
        sackRate = try container.decodeIfPresent(Int.self, forKey: .sackRate)
        passingEPA = try container.decodeIfPresent(Int.self, forKey: .passingEPA)
        rushingEPA = try container.decodeIfPresent(Int.self, forKey: .rushingEPA)
        passingInterceptions = try container.decodeIfPresent(
            Int.self, forKey: .passingInterceptions)
        fumblesLost = try container.decodeIfPresent(Int.self, forKey: .fumblesLost)
        defensiveSacks = try container.decodeIfPresent(Int.self, forKey: .defensiveSacks)
        quarterbackHitsPerGame = try container.decodeIfPresent(
            Int.self, forKey: .quarterbackHitsPerGame)
        defensiveTakeaways = try container.decodeIfPresent(Int.self, forKey: .defensiveTakeaways)
        defensiveInterceptions = try container.decodeIfPresent(
            Int.self, forKey: .defensiveInterceptions)
        fieldGoalPercentage = try container.decodeIfPresent(Int.self, forKey: .fieldGoalPercentage)
        netPuntYardsPerAttempt = try container.decodeIfPresent(
            Int.self, forKey: .netPuntYardsPerAttempt)
        puntReturnYardsPerAttempt = try container.decodeIfPresent(
            Int.self, forKey: .puntReturnYardsPerAttempt)
        kickoffReturnYardsPerAttempt = try container.decodeIfPresent(
            Int.self, forKey: .kickoffReturnYardsPerAttempt)
        adjustedLineYards = try container.decodeIfPresent(Int.self, forKey: .adjustedLineYards)
        stuffedRate = try container.decodeIfPresent(Int.self, forKey: .stuffedRate)
        powerSuccessRate = try container.decodeIfPresent(Int.self, forKey: .powerSuccessRate)
        secondLevelYardsPerRush = try container.decodeIfPresent(
            Int.self, forKey: .secondLevelYardsPerRush)
        openFieldYardsPerRush = try container.decodeIfPresent(
            Int.self, forKey: .openFieldYardsPerRush)
        lineSackRate = try container.decodeIfPresent(Int.self, forKey: .lineSackRate)
        pressureRate = try container.decodeIfPresent(Int.self, forKey: .pressureRate)
        avgTimeToThrow = try container.decodeIfPresent(Int.self, forKey: .avgTimeToThrow)
        avgPassRushers = try container.decodeIfPresent(Int.self, forKey: .avgPassRushers)
        lineRankPopulation =
            try container.decodeIfPresent([String: Int].self, forKey: .lineRankPopulation) ?? [:]
    }
}

enum TeamLeagueRanks {
    enum Order {
        case descending
        case ascending
    }

    /// The league position of `teamId` among `rows` for one metric, or nil when this
    /// team has no value for it. Ties share a rank (both "3rd"), matching web's
    /// `rankValue` — `firstIndex(of:)` on the sorted values finds the first equal entry.
    static func rank<Row, Value: Comparable>(
        _ rows: [Row],
        teamId: String,
        id: (Row) -> String,
        order: Order = .descending,
        value: (Row) -> Value?
    ) -> Int? {
        guard let teamRow = rows.first(where: { id($0) == teamId }),
            let teamValue = value(teamRow)
        else { return nil }
        let values =
            rows
            .compactMap(value)
            .sorted { order == .descending ? $0 > $1 : $0 < $1 }
        guard let index = values.firstIndex(of: teamValue) else { return nil }
        return index + 1
    }

    static func rankWithPopulation<Row, Value: Comparable>(
        _ rows: [Row],
        teamId: String,
        id: (Row) -> String,
        order: Order = .descending,
        value: (Row) -> Value?
    ) -> (rank: Int, population: Int)? {
        guard let teamRow = rows.first(where: { id($0) == teamId }),
            let teamValue = value(teamRow)
        else { return nil }
        let values =
            rows
            .compactMap(value)
            .sorted { order == .descending ? $0 > $1 : $0 < $1 }
        guard let index = values.firstIndex(of: teamValue) else { return nil }
        return (rank: index + 1, population: values.count)
    }
}

/// One season's nflverse row for a single team, already reduced to the values a rank is
/// built from. Derived once per team per season (see `TeamMetricsDerivation`) so the
/// fifteen rank passes below read a stored value instead of recomputing the same season
/// fifteen times.
struct TeamSeasonRankValues: Equatable, Sendable {
    let teamId: String
    let season: Int
    let passingYards: Int?
    let rushingYards: Int?
    let passingEPA: Double?
    let rushingEPA: Double?
    let passingInterceptions: Int?
    let fumblesLost: Int?
    let defensiveSacks: Double?
    let defensiveInterceptions: Int?
    let derived: DerivedTeamMetrics
}

/// The ESPN standings half of the rank inputs — the four values that come from
/// team_stats rather than team_season_stats.
struct TeamSeasonRecordRankValues: Equatable, Sendable {
    let teamId: String
    let season: Int
    let winPercent: Double?
    let pointsFor: Int?
    let pointsAgainst: Int?
    let pointDifferential: Int?
}

/// The offensive-line half of the rank inputs — one `team_line_stats` row per team-season
/// (web: `TeamLineStatsRankRow`). Ranks are built from these same stored values the page
/// renders, never a recomputation.
struct TeamSeasonLineRankValues: Equatable, Sendable {
    let teamId: String
    let season: Int
    let adjustedLineYards: Double?
    let stuffedRate: Double?
    let powerSuccessRate: Double?
    let secondLevelYardsPerRush: Double?
    let openFieldYardsPerRush: Double?
    let sackRate: Double?
    let pressureRate: Double?
    let avgTimeToThrow: Double?
    let avgPassRushers: Double?
}

extension TeamLeagueRanks {
    /// Ranks one team across every season present in `record`, mirroring web's
    /// `buildLeagueRanks`. Seasons are keyed off the ESPN rows: an nflverse season with
    /// no matching team_stats row produces no entry, exactly as on web.
    static func build(
        teamId: String,
        record: [TeamSeasonRecordRankValues],
        nflverse: [TeamSeasonRankValues],
        line: [TeamSeasonLineRankValues] = []
    ) -> [Int: TeamStatsRanks] {
        let recordBySeason = Dictionary(grouping: record, by: \.season)
        let nflverseBySeason = Dictionary(grouping: nflverse, by: \.season)
        let lineBySeason = Dictionary(grouping: line, by: \.season)

        return recordBySeason.reduce(into: [:]) { result, entry in
            let (season, recordRows) = entry
            let rows = nflverseBySeason[season] ?? []
            let lineRows = lineBySeason[season] ?? []
            let espnRank = {
                (order: Order, value: @escaping (TeamSeasonRecordRankValues) -> Double?) in
                rank(recordRows, teamId: teamId, id: \.teamId, order: order, value: value)
            }
            let nflRank = { (order: Order, value: @escaping (TeamSeasonRankValues) -> Double?) in
                rank(rows, teamId: teamId, id: \.teamId, order: order, value: value)
            }
            let lineRank = {
                (order: Order, value: @escaping (TeamSeasonLineRankValues) -> Double?) in
                rankWithPopulation(
                    lineRows, teamId: teamId, id: \.teamId, order: order, value: value)
            }
            let adjustedLineYards = lineRank(.descending) { $0.adjustedLineYards }
            let stuffedRate = lineRank(.ascending) { $0.stuffedRate }
            let powerSuccessRate = lineRank(.descending) { $0.powerSuccessRate }
            let secondLevelYardsPerRush = lineRank(.descending) { $0.secondLevelYardsPerRush }
            let openFieldYardsPerRush = lineRank(.descending) { $0.openFieldYardsPerRush }
            let lineSackRate = lineRank(.ascending) { $0.sackRate }
            let pressureRate = lineRank(.ascending) { $0.pressureRate }
            let avgTimeToThrow = lineRank(.ascending) { $0.avgTimeToThrow }
            let avgPassRushers = lineRank(.descending) { $0.avgPassRushers }

            result[season] = TeamStatsRanks(
                winPercent: espnRank(.descending) { $0.winPercent },
                pointsFor: espnRank(.descending) { $0.pointsFor.map(Double.init) },
                // Fewer points allowed is better.
                pointsAgainst: espnRank(.ascending) { $0.pointsAgainst.map(Double.init) },
                pointDifferential: espnRank(.descending) { $0.pointDifferential.map(Double.init) },
                passingYards: nflRank(.descending) { $0.passingYards.map(Double.init) },
                rushingYards: nflRank(.descending) { $0.rushingYards.map(Double.init) },
                turnoverMargin: nflRank(.descending) { $0.derived.turnoverMargin.map(Double.init) },
                // Offense. Sack rate, interceptions thrown, and fumbles lost rank
                // ascending — for these, fewer is better.
                offensiveEPAPerPlay: nflRank(.descending) { $0.derived.offensiveEPAPerPlay },
                sackRate: nflRank(.ascending) { $0.derived.sackRate },
                passingEPA: nflRank(.descending) { $0.passingEPA },
                rushingEPA: nflRank(.descending) { $0.rushingEPA },
                passingInterceptions: nflRank(.ascending) {
                    $0.passingInterceptions.map(Double.init)
                },
                fumblesLost: nflRank(.ascending) { $0.fumblesLost.map(Double.init) },
                // Defense
                defensiveSacks: nflRank(.descending) { $0.defensiveSacks },
                quarterbackHitsPerGame: nflRank(.descending) { $0.derived.quarterbackHitsPerGame },
                defensiveTakeaways: nflRank(.descending) {
                    $0.derived.defensiveTakeaways.map(Double.init)
                },
                defensiveInterceptions: nflRank(.descending) {
                    $0.defensiveInterceptions.map(Double.init)
                },
                // Special teams
                fieldGoalPercentage: nflRank(.descending) { $0.derived.fieldGoalPercentage },
                netPuntYardsPerAttempt: nflRank(.descending) { $0.derived.netPuntYardsPerAttempt },
                puntReturnYardsPerAttempt: nflRank(.descending) {
                    $0.derived.puntReturnYardsPerAttempt
                },
                kickoffReturnYardsPerAttempt: nflRank(.descending) {
                    $0.derived.kickoffReturnYardsPerAttempt
                },
                // Offensive line
                adjustedLineYards: adjustedLineYards?.rank,
                stuffedRate: stuffedRate?.rank,
                powerSuccessRate: powerSuccessRate?.rank,
                secondLevelYardsPerRush: secondLevelYardsPerRush?.rank,
                openFieldYardsPerRush: openFieldYardsPerRush?.rank,
                lineSackRate: lineSackRate?.rank,
                pressureRate: pressureRate?.rank,
                avgTimeToThrow: avgTimeToThrow?.rank,
                avgPassRushers: avgPassRushers?.rank,
                lineRankPopulation: [
                    "adjustedLineYards": adjustedLineYards?.population,
                    "stuffedRate": stuffedRate?.population,
                    "powerSuccessRate": powerSuccessRate?.population,
                    "secondLevelYardsPerRush": secondLevelYardsPerRush?.population,
                    "openFieldYardsPerRush": openFieldYardsPerRush?.population,
                    "lineSackRate": lineSackRate?.population,
                    "pressureRate": pressureRate?.population,
                    "avgTimeToThrow": avgTimeToThrow?.population,
                    "avgPassRushers": avgPassRushers?.population,
                ].compactMapValues { $0 }
            )
        }
    }
}
