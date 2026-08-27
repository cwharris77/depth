import Foundation

// Swift port of web's `buildLeagueRanks` (lib/roster-source.db.ts) and its
// `TeamStatsRanks` contract (lib/roster-source.ts).
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
        let values = rows
            .compactMap(value)
            .sorted { order == .descending ? $0 > $1 : $0 < $1 }
        guard let index = values.firstIndex(of: teamValue) else { return nil }
        return index + 1
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

extension TeamLeagueRanks {
    /// Ranks one team across every season present in `record`, mirroring web's
    /// `buildLeagueRanks`. Seasons are keyed off the ESPN rows: an nflverse season with
    /// no matching team_stats row produces no entry, exactly as on web.
    static func build(
        teamId: String,
        record: [TeamSeasonRecordRankValues],
        nflverse: [TeamSeasonRankValues]
    ) -> [Int: TeamStatsRanks] {
        let recordBySeason = Dictionary(grouping: record, by: \.season)
        let nflverseBySeason = Dictionary(grouping: nflverse, by: \.season)

        return recordBySeason.reduce(into: [:]) { result, entry in
            let (season, recordRows) = entry
            let rows = nflverseBySeason[season] ?? []
            let espnRank = { (order: Order, value: @escaping (TeamSeasonRecordRankValues) -> Double?) in
                rank(recordRows, teamId: teamId, id: \.teamId, order: order, value: value)
            }
            let nflRank = { (order: Order, value: @escaping (TeamSeasonRankValues) -> Double?) in
                rank(rows, teamId: teamId, id: \.teamId, order: order, value: value)
            }

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
                passingInterceptions: nflRank(.ascending) { $0.passingInterceptions.map(Double.init) },
                fumblesLost: nflRank(.ascending) { $0.fumblesLost.map(Double.init) },
                // Defense
                defensiveSacks: nflRank(.descending) { $0.defensiveSacks },
                quarterbackHitsPerGame: nflRank(.descending) { $0.derived.quarterbackHitsPerGame },
                defensiveTakeaways: nflRank(.descending) { $0.derived.defensiveTakeaways.map(Double.init) },
                defensiveInterceptions: nflRank(.descending) { $0.defensiveInterceptions.map(Double.init) },
                // Special teams
                fieldGoalPercentage: nflRank(.descending) { $0.derived.fieldGoalPercentage },
                netPuntYardsPerAttempt: nflRank(.descending) { $0.derived.netPuntYardsPerAttempt },
                puntReturnYardsPerAttempt: nflRank(.descending) { $0.derived.puntReturnYardsPerAttempt },
                kickoffReturnYardsPerAttempt: nflRank(.descending) { $0.derived.kickoffReturnYardsPerAttempt }
            )
        }
    }
}
