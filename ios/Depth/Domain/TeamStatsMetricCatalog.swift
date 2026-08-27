import Foundation

// The nflverse team metrics as the Stats page shows them: one team, grouped by unit,
// each value captioned with its league rank. Port of web's METRIC_SECTIONS and
// rankLabel in components/TeamStatsView.tsx.
//
// Distinct from `CompareMetricCatalog` on purpose, and the difference is the whole
// design. A Compare table answers "which of these two is bigger", so it needs a leader
// and two value columns. This page answers "where does this team sit in the league", so
// the rank caption replaces Compare's second column. That is also why every
// `direction: .neutral` metric in Compare's catalog is absent here: they are
// denominators and context for a two-team comparison, have no better/worse direction,
// and so cannot carry the rank that is the entire point of this treatment.

/// English ordinal suffix (1st/2nd/3rd/4th…). Port of web's `ordinal` in
/// lib/utils/format.ts — the 11–13 teens are an exception to the mod-10 rule (11th, not
/// 11st), so they are checked before the mod-10 switch.
func ordinal(_ n: Int) -> String {
    let mod100 = n % 100
    if mod100 >= 11 && mod100 <= 13 { return "\(n)th" }
    switch n % 10 {
    case 1: return "\(n)st"
    case 2: return "\(n)nd"
    case 3: return "\(n)rd"
    default: return "\(n)th"
    }
}

/// How a rank reads in copy, matching web's `rankLabel` third argument.
enum TeamStatsRankQualifier: String, Sendable {
    case overall
    case most
    case least
}

/// "First in NFL" / "Last in NFL" / "3rd most" / "6th least". `lastRank` is the league
/// size, so a team ranked last says so rather than "32nd most". Nil rank renders no
/// caption at all — the value stands alone rather than implying a position.
func teamStatsRankLabel(
    _ rank: Int?,
    lastRank: Int,
    qualifier: TeamStatsRankQualifier
) -> String? {
    guard let rank, rank > 0 else { return nil }
    if rank == 1 { return "First in NFL" }
    if rank == lastRank { return "Last in NFL" }
    return "\(ordinal(rank)) \(qualifier.rawValue)"
}

struct TeamStatsMetricSpec: Identifiable, Sendable {
    let id: String
    let label: String
    /// Nil means the source column was missing — the row is dropped, never zeroed.
    let value: @Sendable (TeamMatchupMetrics) -> Double?
    let format: @Sendable (Double) -> String
    /// This metric's league position on `TeamStatsRanks`. A closure rather than a
    /// KeyPath because KeyPath is not Sendable, and this catalog is a static let under
    /// Swift 6 strict concurrency.
    let rank: @Sendable (TeamStatsRanks) -> Int?
    let qualifier: TeamStatsRankQualifier
}

struct TeamStatsMetricGroup: Identifiable, Sendable {
    let id: String
    let title: String
    let metrics: [TeamStatsMetricSpec]
}

/// One metric resolved against a season: its display string and its league rank.
struct ResolvedTeamStatsMetric: Identifiable, Sendable {
    let id: String
    let label: String
    let display: String
    let rankCaption: String?
}

struct ResolvedTeamStatsGroup: Identifiable, Sendable {
    let id: String
    let title: String
    let metrics: [ResolvedTeamStatsMetric]
}

enum TeamStatsMetricFormat {
    static func signed(_ digits: Int) -> @Sendable (Double) -> String {
        { value in
            let sign: String = value > 0 ? "+" : ""
            let formatted: String = String(format: "%.\(digits)f", value)
            return sign + formatted
        }
    }

    static func decimal(_ digits: Int) -> @Sendable (Double) -> String {
        { value in String(format: "%.\(digits)f", value) }
    }

    static let integer: @Sendable (Double) -> String = { value in String(Int(value.rounded())) }

    /// Both rate metrics are stored 0-1 (see `TeamMatchupMetrics.sackRate`), so the
    /// multiply lives here rather than in every call site.
    static let percent: @Sendable (Double) -> String = { value in String(format: "%.1f%%", value * 100) }
}

enum TeamStatsMetricCatalog {
    static let groups: [TeamStatsMetricGroup] = [
        TeamStatsMetricGroup(id: "offense", title: "OFFENSE", metrics: [
            TeamStatsMetricSpec(
                id: "epa-per-play", label: "EPA / PLAY",
                value: { $0.offensiveEPAPerPlay }, format: TeamStatsMetricFormat.signed(2),
                rank: { $0.offensiveEPAPerPlay }, qualifier: .overall
            ),
            TeamStatsMetricSpec(
                id: "sack-rate", label: "SACK RATE",
                value: { $0.sackRate }, format: TeamStatsMetricFormat.percent,
                rank: { $0.sackRate }, qualifier: .least
            ),
            TeamStatsMetricSpec(
                id: "pass-epa", label: "PASS EPA",
                value: { $0.passingEPA }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.passingEPA }, qualifier: .most
            ),
            TeamStatsMetricSpec(
                id: "rush-epa", label: "RUSH EPA",
                value: { $0.rushingEPA }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.rushingEPA }, qualifier: .most
            ),
            // Labelled INTS THROWN, not INTERCEPTIONS: DEFENSE carries its own
            // INTERCEPTIONS row two groups down meaning the opposite thing. Compare's
            // catalog labels both "INTERCEPTIONS" and gets away with it only because its
            // unit lenses are never on screen together (Cooper, 2026-08-27).
            TeamStatsMetricSpec(
                id: "ints-thrown", label: "INTS THROWN",
                value: { $0.passingInterceptions.map(Double.init) },
                format: TeamStatsMetricFormat.integer,
                rank: { $0.passingInterceptions }, qualifier: .least
            ),
            TeamStatsMetricSpec(
                id: "fumbles-lost", label: "FUMBLES LOST",
                value: { $0.fumblesLost.map(Double.init) },
                format: TeamStatsMetricFormat.integer,
                rank: { $0.fumblesLost }, qualifier: .least
            ),
        ]),
        TeamStatsMetricGroup(id: "defense", title: "DEFENSE", metrics: [
            TeamStatsMetricSpec(
                id: "sacks", label: "SACKS",
                value: { $0.defensiveSacks }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.defensiveSacks }, qualifier: .most
            ),
            TeamStatsMetricSpec(
                id: "qb-hits-per-game", label: "QB HITS / GM",
                value: { $0.quarterbackHitsPerGame }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.quarterbackHitsPerGame }, qualifier: .most
            ),
            TeamStatsMetricSpec(
                id: "takeaways", label: "TAKEAWAYS",
                value: { $0.defensiveTakeaways.map(Double.init) },
                format: TeamStatsMetricFormat.integer,
                rank: { $0.defensiveTakeaways }, qualifier: .most
            ),
            TeamStatsMetricSpec(
                id: "interceptions", label: "INTERCEPTIONS",
                value: { $0.defensiveInterceptions.map(Double.init) },
                format: TeamStatsMetricFormat.integer,
                rank: { $0.defensiveInterceptions }, qualifier: .most
            ),
        ]),
        TeamStatsMetricGroup(id: "special", title: "SPECIAL TEAMS", metrics: [
            TeamStatsMetricSpec(
                id: "field-goal-pct", label: "FIELD GOAL %",
                value: { $0.fieldGoalPercentage }, format: TeamStatsMetricFormat.percent,
                rank: { $0.fieldGoalPercentage }, qualifier: .overall
            ),
            TeamStatsMetricSpec(
                id: "net-punt-per-att", label: "NET PUNT / ATT",
                value: { $0.netPuntYardsPerAttempt }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.netPuntYardsPerAttempt }, qualifier: .most
            ),
            TeamStatsMetricSpec(
                id: "punt-ret-avg", label: "PUNT RET AVG",
                value: { $0.puntReturnYardsPerAttempt }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.puntReturnYardsPerAttempt }, qualifier: .most
            ),
            TeamStatsMetricSpec(
                id: "kick-ret-avg", label: "KICK RET AVG",
                value: { $0.kickoffReturnYardsPerAttempt }, format: TeamStatsMetricFormat.decimal(1),
                rank: { $0.kickoffReturnYardsPerAttempt }, qualifier: .most
            ),
        ]),
    ]

    /// Resolves every group against one season. Metrics whose source column is missing
    /// are dropped BEFORE the view pairs them into rows, so a gap closes rather than
    /// leaving a hole mid-row; a group left with nothing renders no heading at all.
    ///
    /// `showRanks` is false below a two-game sample: a league position off one game is
    /// noise presented as fact (same posture as Compare's `isThinSample`).
    static func resolve(
        metrics: TeamMatchupMetrics?,
        ranks: TeamStatsRanks?,
        lastRank: Int,
        showRanks: Bool
    ) -> [ResolvedTeamStatsGroup] {
        guard let metrics else { return [] }
        return groups.compactMap { group in
            let resolved = group.metrics.compactMap { spec -> ResolvedTeamStatsMetric? in
                guard let value = spec.value(metrics) else { return nil }
                return ResolvedTeamStatsMetric(
                    id: spec.id,
                    label: spec.label,
                    display: spec.format(value),
                    rankCaption: showRanks
                        ? teamStatsRankLabel(
                            ranks.flatMap(spec.rank), lastRank: lastRank,
                            qualifier: spec.qualifier
                        )
                        : nil
                )
            }
            return resolved.isEmpty
                ? nil
                : ResolvedTeamStatsGroup(id: group.id, title: group.title, metrics: resolved)
        }
    }
}
