import Foundation

// The nflverse team metrics as the Stats page shows them: one team, grouped by unit,
// each value captioned with its league rank. Port of web's METRIC_SECTIONS and
// rankLabel in web/components/TeamStatsView.tsx.
//
// Distinct from `CompareMetricCatalog` on purpose, and the difference is the whole
// design. A Compare table answers "which of these two is bigger", so it needs a leader
// and two value columns. This page answers "where does this team sit in the league", so
// the rank caption replaces Compare's second column. That is also why every
// `direction: .neutral` metric in Compare's catalog is absent here: they are
// denominators and context for a two-team comparison, have no better/worse direction,
// and so cannot carry the rank that is the entire point of this treatment.

/// English ordinal suffix (1st/2nd/3rd/4th…). Port of web's `ordinal` in
/// web/lib/utils/format.ts — the 11–13 teens are an exception to the mod-10 rule (11th, not
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

// Swift twins of web's lib/utils/team/playoff-seed.ts. `team_stats.playoff_seed` is
// ESPN's `playoffseed`, which is a team's position within its conference (1-16), NOT a
// playoff seed — a team that missed still gets a number, so rendering it as "SEED 13"
// claimed a 5-12 team made the postseason. The NFL went from six playoff teams per
// conference to seven in 2020, and team_stats reaches back to 2002, so the boundary
// covers most of the ingested history.
private let sevenTeamFieldFrom = 2020

func playoffSpotsPerConference(season: Int) -> Int {
    season >= sevenTeamFieldFrom ? 7 : 6
}

/// True when `seed` is a real postseason seed for that season, false when it is only a
/// standings position.
func isPlayoffSeed(_ seed: Int?, season: Int) -> Bool {
    guard let seed, seed > 0 else { return false }
    return seed <= playoffSpotsPerConference(season: season)
}

/// True when `seed` skipped the Wild Card round: the top two seeds per conference in the
/// six-team era, only the 1 seed since the field grew to seven in 2020.
func earnsFirstRoundBye(seed: Int, season: Int) -> Bool {
    seed >= 1 && seed <= (season >= sevenTeamFieldFrom ? 1 : 2)
}

/// ESPN writes "-" as the streak for a season with no games played. That is not a
/// streak, and printing it left a stray dash in the hero.
func displayStreak(_ streak: String?) -> String? {
    guard let streak else { return nil }
    let trimmed = streak.trimmingCharacters(in: .whitespaces)
    return trimmed.isEmpty || trimmed == "-" ? nil : trimmed
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
    qualifier: TeamStatsRankQualifier,
    qualifiedTeams: Int? = nil
) -> String? {
    guard let rank, rank > 0 else { return nil }
    if let qualifiedTeams, qualifiedTeams < lastRank {
        return "\(ordinal(rank)) of \(qualifiedTeams) qualified teams"
    }
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
    /// Optional attribution line shown beneath the group (e.g. the offensive line's
    /// nflverse / FTN-charting credit). Nil renders none.
    var sourceNote: String? = nil
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
    static let percent: @Sendable (Double) -> String = { value in
        String(format: "%.1f%%", value * 100)
    }
}

enum TeamStatsMetricCatalog {
    static let groups: [TeamStatsMetricGroup] = [
        TeamStatsMetricGroup(
            id: "offense", title: "OFFENSE",
            metrics: [
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
        TeamStatsMetricGroup(
            id: "defense", title: "DEFENSE",
            metrics: [
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
        TeamStatsMetricGroup(
            id: "special", title: "SPECIAL TEAMS",
            metrics: [
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
                    value: { $0.puntReturnYardsPerAttempt },
                    format: TeamStatsMetricFormat.decimal(1),
                    rank: { $0.puntReturnYardsPerAttempt }, qualifier: .most
                ),
                TeamStatsMetricSpec(
                    id: "kick-ret-avg", label: "KICK RET AVG",
                    value: { $0.kickoffReturnYardsPerAttempt },
                    format: TeamStatsMetricFormat.decimal(1),
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

/// The offensive line is its own unit with its own source table (`team_line_stats`,
/// derived from nflverse play-by-play by web/lib/nflverse/line-metrics.ts), so it gets a
/// separate catalog rather than being folded into `TeamStatsMetricCatalog`'s
/// `TeamMatchupMetrics`-keyed groups. Same resolve shape, same rank captions, same
/// drop-don't-zero filtering.
enum TeamLineMetricCatalog {
    /// Attribution shown with the group. The run-family metrics derive from nflverse
    /// play-by-play; the pressure columns are FTN-charted and shipped through the same
    /// pbp release, so both sources are named wherever the pass-pro metrics appear.
    static let sourceNote = "nflverse · pressure by FTN charting"

    struct TeamLineMetricSpec: Identifiable, Sendable {
        let id: String
        let label: String
        /// Nil means the source column was missing — the metric is dropped, never zeroed.
        let value: @Sendable (TeamLineStats) -> Double?
        let format: @Sendable (Double) -> String
        let rank: @Sendable (TeamStatsRanks) -> Int?
        let rankPopulation: @Sendable (TeamStatsRanks) -> Int?
        let qualifier: TeamStatsRankQualifier
    }

    /// ALY and the level-yard rates are higher-is-better; stuffed/sack/pressure rates are
    /// lower-is-better (fewer is better), so they rank ascending. Time to throw and
    /// rushers faced are context, ranked without a better/worse qualifier.
    static let metrics: [TeamLineMetricSpec] = [
        TeamLineMetricSpec(
            id: "adj-line-yards", label: "ADJ LINE YDS",
            value: { $0.adjustedLineYards }, format: TeamStatsMetricFormat.decimal(2),
            rank: { $0.adjustedLineYards },
            rankPopulation: { $0.lineRankPopulation["adjustedLineYards"] },
            qualifier: .most
        ),
        TeamLineMetricSpec(
            id: "stuffed-rate", label: "STUFFED %",
            value: { $0.stuffedRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.stuffedRate }, rankPopulation: { $0.lineRankPopulation["stuffedRate"] },
            qualifier: .least
        ),
        TeamLineMetricSpec(
            id: "power-success", label: "POWER SUCCESS",
            value: { $0.powerSuccessRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.powerSuccessRate },
            rankPopulation: { $0.lineRankPopulation["powerSuccessRate"] },
            qualifier: .most
        ),
        TeamLineMetricSpec(
            id: "second-level-per-rush", label: "2ND LEVEL / RUSH",
            value: { $0.secondLevelYardsPerRush }, format: TeamStatsMetricFormat.decimal(2),
            rank: { $0.secondLevelYardsPerRush },
            rankPopulation: { $0.lineRankPopulation["secondLevelYardsPerRush"] },
            qualifier: .most
        ),
        TeamLineMetricSpec(
            id: "open-field-per-rush", label: "OPEN FIELD / RUSH",
            value: { $0.openFieldYardsPerRush }, format: TeamStatsMetricFormat.decimal(2),
            rank: { $0.openFieldYardsPerRush },
            rankPopulation: { $0.lineRankPopulation["openFieldYardsPerRush"] },
            qualifier: .most
        ),
        TeamLineMetricSpec(
            id: "line-sack-rate", label: "SACK RATE",
            value: { $0.sackRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.lineSackRate }, rankPopulation: { $0.lineRankPopulation["lineSackRate"] },
            qualifier: .least
        ),
        TeamLineMetricSpec(
            id: "pressure-rate", label: "PRESSURE RATE",
            value: { $0.pressureRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.pressureRate }, rankPopulation: { $0.lineRankPopulation["pressureRate"] },
            qualifier: .least
        ),
        TeamLineMetricSpec(
            id: "time-to-throw", label: "TIME TO THROW",
            value: { $0.avgTimeToThrow }, format: TeamStatsMetricFormat.decimal(2),
            rank: { $0.avgTimeToThrow },
            rankPopulation: { $0.lineRankPopulation["avgTimeToThrow"] },
            qualifier: .overall
        ),
        TeamLineMetricSpec(
            id: "pass-rushers", label: "PASS RUSHERS",
            value: { $0.avgPassRushers }, format: TeamStatsMetricFormat.decimal(1),
            rank: { $0.avgPassRushers },
            rankPopulation: { $0.lineRankPopulation["avgPassRushers"] },
            qualifier: .overall
        ),
    ]

    /// Resolves the line group for one season. A season with no `team_line_stats` row
    /// (including one below the derivation's coverage gate) yields nothing, so the
    /// section is absent rather than partly filled.
    static func resolve(
        line: TeamLineStats?,
        ranks: TeamStatsRanks?,
        lastRank: Int,
        showRanks: Bool
    ) -> [ResolvedTeamStatsGroup] {
        guard let line else { return [] }
        let resolved = metrics.compactMap { spec -> ResolvedTeamStatsMetric? in
            guard let value = spec.value(line) else { return nil }
            return ResolvedTeamStatsMetric(
                id: spec.id,
                label: spec.label,
                display: spec.format(value),
                rankCaption: showRanks
                    ? teamStatsRankLabel(
                        ranks.flatMap(spec.rank), lastRank: lastRank, qualifier: spec.qualifier,
                        qualifiedTeams: ranks.flatMap(spec.rankPopulation)
                    )
                    : nil
            )
        }
        guard !resolved.isEmpty else { return [] }
        return [
            ResolvedTeamStatsGroup(
                id: "offensive-line", title: "OFFENSIVE LINE", metrics: resolved,
                sourceNote: sourceNote
            )
        ]
    }
}
