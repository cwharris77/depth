import Foundation

// Swift port of web's lib/utils/team-metrics/derive.ts, and the one place nflverse
// team-metric math lives on this surface.
//
// Two callers need the same derived values from the same team_season_stats columns and
// must never disagree: `TeamStatsMapper.mapMatchupMetrics`, which builds the
// TeamMatchupMetrics a page renders, and `TeamLeagueRanks.build`, which ranks all 32
// teams on those same values. If each recomputed the math, a page could show one number
// and rank it as if it were another — a disagreement neither the compiler nor a view
// test would catch, because both halves would be internally consistent.
//
// Every helper refuses to turn a missing source value into zero (AGENTS.md invariant 6).
// A partial nflverse season yields nil, which callers render as an absent row and an
// absent rank — never as a team that gained nothing and allowed nothing.

/// The raw team_season_stats columns every derived value below is computed from. Both
/// `TeamMatchupMetricsDTO` and `TeamSeasonStatsRankDTO` conform, so one derivation
/// serves the per-team read and the league-wide rank read.
protocol RawTeamMetricColumns {
    var games: Int? { get }
    var attempts: Int? { get }
    var carries: Int? { get }
    var sacksSuffered: Int? { get }
    var passingEPA: Double? { get }
    var rushingEPA: Double? { get }
    var passingInterceptions: Int? { get }
    var fumblesLostTotal: Int? { get }
    var quarterbackHits: Int? { get }
    var defensiveInterceptions: Int? { get }
    var defensiveFumbleRecoveries: Int? { get }
    var fieldGoalsMade: Int? { get }
    var fieldGoalsAttempted: Int? { get }
    var puntAttempts: Int? { get }
    var netPuntYards: Int? { get }
    var puntReturns: Int? { get }
    var puntReturnYards: Int? { get }
    var kickoffReturns: Int? { get }
    var kickoffReturnYards: Int? { get }
}

struct DerivedTeamMetrics: Equatable, Sendable {
    let offensiveEPA: Double?
    let offensivePlays: Int?
    let offensiveEPAPerPlay: Double?
    /// Sacks as a share of dropbacks, 0–1. The denominator is attempts + sacks, because
    /// a sack ends a dropback without recording a pass attempt.
    let sackRate: Double?
    let giveaways: Int?
    let defensiveTakeaways: Int?
    let defensiveTakeawaysPerGame: Double?
    /// Takeaways won minus giveaways conceded. Signed, and nil unless BOTH halves are
    /// known — a team with an unknown giveaway count has an unknown margin, not a margin
    /// equal to its takeaways.
    let turnoverMargin: Int?
    let quarterbackHitsPerGame: Double?
    let fieldGoalPercentage: Double?
    let netPuntYardsPerAttempt: Double?
    let puntReturnYardsPerAttempt: Double?
    let kickoffReturnYardsPerAttempt: Double?
}

enum TeamMetrics {
    /// Adds source columns, refusing the sum when ANY input is missing: a partial total
    /// would read as a real, smaller number rather than as missing data.
    static func sum(_ values: Double?...) -> Double? {
        var total = 0.0
        for value in values {
            guard let value else { return nil }
            total += value
        }
        return total
    }

    static func sum(_ values: Int?...) -> Int? {
        var total = 0
        for value in values {
            guard let value else { return nil }
            total += value
        }
        return total
    }

    /// Divides, refusing a zero or negative denominator so an empty sample yields nil
    /// rather than an infinity leaking into a rank sort.
    static func ratio(_ numerator: Double?, _ denominator: Double?) -> Double? {
        guard let numerator, let denominator, denominator > 0 else { return nil }
        return numerator / denominator
    }

    static func ratio(_ numerator: Int?, _ denominator: Int?) -> Double? {
        guard let numerator, let denominator else { return nil }
        return ratio(Double(numerator), Double(denominator))
    }

    static func derive(_ row: some RawTeamMetricColumns) -> DerivedTeamMetrics {
        let offensiveEPA = sum(row.passingEPA, row.rushingEPA)
        let offensivePlays = sum(row.attempts, row.carries, row.sacksSuffered)
        let dropbacks = sum(row.attempts, row.sacksSuffered)
        let giveaways = sum(row.passingInterceptions, row.fumblesLostTotal)
        let defensiveTakeaways = sum(row.defensiveInterceptions, row.defensiveFumbleRecoveries)

        return DerivedTeamMetrics(
            offensiveEPA: offensiveEPA,
            offensivePlays: offensivePlays,
            offensiveEPAPerPlay: ratio(offensiveEPA, offensivePlays.map(Double.init)),
            sackRate: ratio(row.sacksSuffered, dropbacks),
            giveaways: giveaways,
            defensiveTakeaways: defensiveTakeaways,
            defensiveTakeawaysPerGame: ratio(defensiveTakeaways, row.games),
            turnoverMargin: defensiveTakeaways.flatMap { takeaways in
                giveaways.map { takeaways - $0 }
            },
            quarterbackHitsPerGame: ratio(row.quarterbackHits, row.games),
            fieldGoalPercentage: ratio(row.fieldGoalsMade, row.fieldGoalsAttempted),
            netPuntYardsPerAttempt: ratio(row.netPuntYards, row.puntAttempts),
            puntReturnYardsPerAttempt: ratio(row.puntReturnYards, row.puntReturns),
            kickoffReturnYardsPerAttempt: ratio(row.kickoffReturnYards, row.kickoffReturns)
        )
    }
}
