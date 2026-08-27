import Foundation

// The pure model behind Compare's redesigned By-team page (vault canvas "Refining the
// compare page", options 1b + 2a-2e + 3a/3b). Three concerns live here rather than in the
// view so each is unit-testable without SwiftUI:
//
//  1. `CompareSeasonStamp` — the provenance claim rendered beside the season picker.
//     Turn 3 of the canvas corrected turn 1's badge: FINAL is only honest for a season
//     that is actually over, because `CompareViewModel.effectiveStats(for:)` promotes the
//     live season the moment ONE game's metrics land. A live season therefore stamps
//     LIVE + a games-played count, and while that count is at or below
//     `CompareSampleGuard.cautionMaxGames` the page also drops every leader tint — a
//     one-game per-play rate is not a ranking.
//  2. `CompareMetricCatalog` — the grouped metric tables (Efficiency / Ball security /
//     Protection, …). Every row reads a field that already exists on
//     `TeamMatchupMetrics`; the three derived rows (turnover margin, sack rate, FG
//     made-attempted) are computed from two such fields and nothing is invented.
//  3. `CompareRecordCatalog` — the SEASON RECORD table, read off `TeamSeasonStats`.
//
// Rows carry a `direction` so leader resolution is data, not a per-row branch in the
// view: `.higher`/`.lower` name which way is better, `.neutral` marks a context row
// (attempt/play counts) that never has a winner even when the two numbers differ.

// MARK: - Sample-size guard

/// Whether a live season has played enough football for the page to call a leader.
enum CompareSampleGuard {
    /// Games played at or below which the caution strip shows and leader tints are
    /// suppressed. The canvas draws the caution at 1 game and gone by 8; its own "try
    /// next" line floats raising this to 4, so it is a named constant rather than a
    /// literal to make that a one-line change.
    static let cautionMaxGames = 1

    /// True while the sample is too thin to rank the two teams against each other.
    /// A completed season is never cautioned — its sample is whatever it is, and the
    /// user picked it deliberately.
    static func isThin(_ stamp: CompareSeasonStamp) -> Bool {
        guard case .live(let games) = stamp else { return false }
        return games <= cautionMaxGames
    }
}

// MARK: - Season stamp

/// Which kind of season the page is reading. Aug 26 (Cooper): this is no longer *shown* —
/// the FINAL/LIVE/UPCOMING badge and its "17 GAMES · JAN 6" line were removed ("I don't need
/// to see that the season already happened or how many games it had or when it ended"). It
/// survives because `CompareSampleGuard` still needs to know a live season from a finished
/// one: dropping leader tints on a one-game sample depends on that distinction, and nothing
/// else in the app draws it.
enum CompareSeasonStamp: Equatable {
    /// A completed season — whatever its sample, the user picked it deliberately.
    case final
    /// The season currently being played, with the games it has metrics through.
    case live(games: Int)
    /// A season that exists but has kicked off no games yet.
    case upcoming
    /// No season resolved, or no metrics row at all.
    case none
}

/// Derives the stamp for a resolved season. `isCompleted` is the caller's judgement
/// (a season year below `TeamStatsPage.currentSeason`), kept as a parameter so this stays
/// a pure function of its inputs rather than of the wall clock.
func compareSeasonStamp(
    metrics: TeamMatchupMetrics?,
    isCompleted: Bool,
    hasResolvedSeason: Bool = true
) -> CompareSeasonStamp {
    // Canvas 2a: with no season resolved there is nothing to date-stamp.
    guard hasResolvedSeason else { return .none }

    guard let metrics else {
        // A season still to be played has no metrics row at all — nflverse writes the
        // team_stats stub (a real 0-0) well before there is anything to aggregate. That
        // absence is itself the fact worth stamping, so it reads UPCOMING rather than
        // going blank (canvas 2d). A *completed* season missing metrics is a data gap, not
        // a schedule fact, and claims nothing.
        return isCompleted ? .none : .upcoming
    }
    // `games` is nullable by schema. A metrics row with no game count can't honestly
    // claim a sample size, so it degrades to `.none` rather than stamping "0 GAMES".
    guard let games = metrics.games else { return .none }
    guard games > 0 else { return .upcoming }
    return isCompleted ? .final : .live(games: games)
}

// MARK: - Metric rows

/// Which side of the comparison a value belongs to.
enum CompareSide: Equatable, Sendable {
    case a
    case b
}

/// Which direction is better for a metric — or that the metric has no better direction.
/// A `.neutral` row (offensive plays, punt attempts) shows both numbers for context and
/// never tints a leader, matching the canvas, where those rows stay plain white on both
/// sides even when the two values differ.
enum CompareMetricDirection: Equatable, Sendable {
    case higher
    case lower
    case neutral
}

/// One team's value for one metric: the number used to pick a leader, plus the string the
/// table prints. They are separate because some rows are displayable but not comparable —
/// "23 / 26" for field goals made-attempted has no single magnitude to rank.
struct CompareMetricValue: Equatable, Sendable {
    let comparable: Double?
    let display: String

    init(comparable: Double?, display: String) {
        self.comparable = comparable
        self.display = display
    }
}

/// A metric row's definition: how to read it off a metrics row and which way is better.
struct CompareMetricSpec: Identifiable, Sendable {
    let id: String
    let label: String
    let direction: CompareMetricDirection
    let read: @Sendable (TeamMatchupMetrics) -> CompareMetricValue?
}

/// A titled block of metric rows — one bordered card in the redesigned table stack.
struct CompareMetricGroup: Identifiable, Sendable {
    let id: String
    let title: String
    let metrics: [CompareMetricSpec]
}

/// A resolved row, ready to render: both display strings and which side (if either) leads.
struct CompareMetricRow: Identifiable, Equatable {
    let id: String
    let label: String
    let a: String
    let b: String
    let leader: CompareSide?
}

/// A resolved group. `rows` is already filtered to rows at least one side can supply, so
/// an empty group is dropped rather than rendering a card of em dashes.
struct CompareResolvedGroup: Identifiable, Equatable {
    let id: String
    let title: String
    let rows: [CompareMetricRow]
}

/// Placeholder for a metric neither side reports.
private let compareMissingValue = "—"

/// Resolves one spec against both sides. `allowLeader` is the sample-size guard: when the
/// live season is too thin (`CompareSampleGuard.isThin`), every row resolves with no
/// leader so the table prints plain numbers and tints nothing.
func resolveCompareRow(
    _ spec: CompareMetricSpec,
    a metricsA: TeamMatchupMetrics?,
    b metricsB: TeamMatchupMetrics?,
    allowLeader: Bool
) -> CompareMetricRow? {
    let valueA = metricsA.flatMap(spec.read)
    let valueB = metricsB.flatMap(spec.read)
    guard valueA != nil || valueB != nil else { return nil }
    return CompareMetricRow(
        id: spec.id,
        label: spec.label,
        a: valueA?.display ?? compareMissingValue,
        b: valueB?.display ?? compareMissingValue,
        leader: allowLeader
            ? compareLeader(valueA?.comparable, valueB?.comparable, direction: spec.direction)
            : nil
    )
}

/// Resolves every group for a unit, dropping groups that end up with no rows.
func resolveCompareGroups(
    for unit: Unit,
    a metricsA: TeamMatchupMetrics?,
    b metricsB: TeamMatchupMetrics?,
    allowLeader: Bool
) -> [CompareResolvedGroup] {
    CompareMetricCatalog.groups(for: unit).compactMap { group in
        let rows = group.metrics.compactMap {
            resolveCompareRow($0, a: metricsA, b: metricsB, allowLeader: allowLeader)
        }
        guard !rows.isEmpty else { return nil }
        return CompareResolvedGroup(id: group.id, title: group.title, rows: rows)
    }
}

/// The leader for a pair of comparable values, or nil when the metric is neutral, tied, or
/// missing on either side (a value only one team reports is not a win, it's a gap).
func compareLeader(
    _ valueA: Double?,
    _ valueB: Double?,
    direction: CompareMetricDirection
) -> CompareSide? {
    guard direction != .neutral, let valueA, let valueB, valueA != valueB else { return nil }
    let aLeads = direction == .higher ? valueA > valueB : valueA < valueB
    return aLeads ? .a : .b
}

// MARK: - Value formatting

/// The formatters the metric catalog builds values with. Kept here (rather than inline in
/// each spec) so "every integer groups its thousands" and "every signed rate shows its
/// plus" are single decisions instead of per-row ones.
enum CompareValueFormat {
    /// A signed rate — "+0.08" / "-0.04".
    static func signed(_ value: Double, digits: Int) -> String {
        let number = value.formatted(.number.precision(.fractionLength(digits)).grouping(.never))
        return value > 0 ? "+\(number)" : number
    }

    static func decimal(_ value: Double, digits: Int) -> String {
        value.formatted(.number.precision(.fractionLength(digits)).grouping(.never))
    }

    /// A count. Grouped, so "2,241" reads as yards rather than a serial number.
    static func integer(_ value: Int) -> String {
        value.formatted(.number.precision(.fractionLength(0)))
    }

    /// A signed count — used only by turnover margin, the one count with a meaningful sign.
    static func signedInteger(_ value: Int) -> String {
        value > 0 ? "+\(integer(value))" : integer(value)
    }

    /// A value already expressed on a 0-100 scale.
    static func percent(_ value: Double, digits: Int = 1) -> String {
        decimal(value, digits: digits) + "%"
    }

    /// A value stored as a 0-1 ratio. `TeamMatchupMetrics.fieldGoalPercentage` is one of
    /// these despite its name — web's `buildMatchupMetrics` sets it to `made / attempted`
    /// (`lib/utils/compare/matchup-metrics.ts`'s `ratio()`), so 19/21 arrives as 0.905, not
    /// 90.5. Formatting it with `percent` printed "0.9%" for every kicker in the league;
    /// that bug predates this redesign and is fixed here rather than carried forward.
    static func percent(fromRatio ratio: Double, digits: Int = 1) -> String {
        percent(ratio * 100, digits: digits)
    }
}

/// Builders that turn an optional source field into an optional `CompareMetricValue`, so a
/// spec body stays one line and a nil field consistently means "this row has no value for
/// this team" rather than a zero.
private func metricValue(_ value: Double?, _ display: (Double) -> String) -> CompareMetricValue? {
    value.map { CompareMetricValue(comparable: $0, display: display($0)) }
}

private func metricValue(_ value: Int?, _ display: (Int) -> String) -> CompareMetricValue? {
    value.map { CompareMetricValue(comparable: Double($0), display: display($0)) }
}

// MARK: - Metric catalog

/// The grouped unit-metric tables. Group titles and row order come straight from the
/// canvas; every row maps to a `TeamMatchupMetrics` field or a two-field derivation.
enum CompareMetricCatalog {
    static func groups(for unit: Unit) -> [CompareMetricGroup] {
        switch unit {
        case .offense: offense
        case .defense: defense
        case .special: special
        }
    }

    // MARK: Offense

    private static let offense: [CompareMetricGroup] = [
        CompareMetricGroup(id: "offense-efficiency", title: "EFFICIENCY", metrics: [
            CompareMetricSpec(id: "epa-per-play", label: "EPA / PLAY", direction: .higher) {
                metricValue($0.offensiveEPAPerPlay) { CompareValueFormat.signed($0, digits: 2) }
            },
            CompareMetricSpec(id: "pass-epa", label: "PASS EPA", direction: .higher) {
                metricValue($0.passingEPA) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "rush-epa", label: "RUSH EPA", direction: .higher) {
                metricValue($0.rushingEPA) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "offensive-plays", label: "OFFENSIVE PLAYS", direction: .neutral) {
                metricValue($0.offensivePlays) { CompareValueFormat.integer($0) }
            },
        ]),
        CompareMetricGroup(id: "offense-ball-security", title: "BALL SECURITY", metrics: [
            CompareMetricSpec(id: "giveaways", label: "GIVEAWAYS", direction: .lower) {
                metricValue($0.giveaways) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "interceptions-thrown", label: "INTERCEPTIONS", direction: .lower) {
                metricValue($0.passingInterceptions) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "fumbles-lost", label: "FUMBLES LOST", direction: .lower) {
                metricValue($0.fumblesLost) { CompareValueFormat.integer($0) }
            },
            // Derived: takeaways won minus giveaways conceded. Both sides of the subtraction
            // are ingested fields; a missing half makes the row absent, not zero.
            CompareMetricSpec(id: "turnover-margin", label: "TURNOVER MARGIN", direction: .higher) { metrics in
                guard let takeaways = metrics.defensiveTakeaways, let giveaways = metrics.giveaways
                else { return nil }
                let margin = takeaways - giveaways
                return CompareMetricValue(
                    comparable: Double(margin),
                    display: CompareValueFormat.signedInteger(margin)
                )
            },
        ]),
        CompareMetricGroup(id: "offense-protection", title: "PROTECTION", metrics: [
            CompareMetricSpec(id: "sacks-allowed", label: "SACKS ALLOWED", direction: .lower) {
                metricValue($0.sacksSuffered) { CompareValueFormat.integer($0) }
            },
            // Derived: sacks as a share of dropbacks. The denominator is attempts + sacks,
            // because a sack ends a dropback without recording a pass attempt.
            CompareMetricSpec(id: "sack-rate", label: "SACK RATE", direction: .lower) { metrics in
                guard let sacks = metrics.sacksSuffered, let attempts = metrics.passAttempts else { return nil }
                let dropbacks = attempts + sacks
                guard dropbacks > 0 else { return nil }
                let rate = Double(sacks) / Double(dropbacks) * 100
                return CompareMetricValue(comparable: rate, display: CompareValueFormat.percent(rate))
            },
            CompareMetricSpec(id: "pass-attempts", label: "PASS ATTEMPTS", direction: .neutral) {
                metricValue($0.passAttempts) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "rush-attempts", label: "RUSH ATTEMPTS", direction: .neutral) {
                metricValue($0.rushAttempts) { CompareValueFormat.integer($0) }
            },
        ]),
    ]

    // MARK: Defense

    private static let defense: [CompareMetricGroup] = [
        CompareMetricGroup(id: "defense-pressure", title: "PRESSURE", metrics: [
            CompareMetricSpec(id: "sacks", label: "SACKS", direction: .higher) {
                metricValue($0.defensiveSacks) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "qb-hits", label: "QB HITS", direction: .higher) {
                metricValue($0.quarterbackHits) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "qb-hits-per-game", label: "QB HITS / GAME", direction: .higher) {
                metricValue($0.quarterbackHitsPerGame) { CompareValueFormat.decimal($0, digits: 1) }
            },
        ]),
        CompareMetricGroup(id: "defense-takeaways", title: "TAKEAWAYS", metrics: [
            CompareMetricSpec(id: "takeaways", label: "TAKEAWAYS", direction: .higher) {
                metricValue($0.defensiveTakeaways) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "takeaways-per-game", label: "TAKEAWAYS / GAME", direction: .higher) {
                metricValue($0.defensiveTakeawaysPerGame) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "interceptions", label: "INTERCEPTIONS", direction: .higher) {
                metricValue($0.defensiveInterceptions) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "fumbles-forced", label: "FUMBLES FORCED", direction: .higher) {
                metricValue($0.defensiveFumblesForced) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "fumbles-recovered", label: "FUMBLES RECOVERED", direction: .higher) {
                metricValue($0.defensiveFumbleRecoveries) { CompareValueFormat.integer($0) }
            },
        ]),
    ]

    // MARK: Special teams

    private static let special: [CompareMetricGroup] = [
        CompareMetricGroup(id: "special-kicking", title: "KICKING", metrics: [
            CompareMetricSpec(id: "field-goal-pct", label: "FIELD GOAL %", direction: .higher) {
                metricValue($0.fieldGoalPercentage) { CompareValueFormat.percent(fromRatio: $0) }
            },
            // Made-attempted is a pair, not a magnitude: it prints for context and never
            // ranks (the percentage row above is the comparable form of the same fact).
            CompareMetricSpec(id: "field-goals", label: "FG MADE – ATT", direction: .neutral) { metrics in
                guard let made = metrics.fieldGoalsMade, let attempted = metrics.fieldGoalsAttempted
                else { return nil }
                return CompareMetricValue(
                    comparable: nil,
                    display: "\(CompareValueFormat.integer(made)) / \(CompareValueFormat.integer(attempted))"
                )
            },
        ]),
        CompareMetricGroup(id: "special-punting", title: "PUNTING", metrics: [
            CompareMetricSpec(id: "net-punt-per-attempt", label: "NET PUNT / ATT", direction: .higher) {
                metricValue($0.netPuntYardsPerAttempt) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "punt-attempts", label: "PUNT ATTEMPTS", direction: .neutral) {
                metricValue($0.puntAttempts) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "net-punt-yards", label: "NET PUNT YARDS", direction: .neutral) {
                metricValue($0.netPuntYards) { CompareValueFormat.integer($0) }
            },
        ]),
        CompareMetricGroup(id: "special-returns", title: "RETURNS", metrics: [
            CompareMetricSpec(id: "punt-return-per-attempt", label: "PUNT RET / ATT", direction: .higher) {
                metricValue($0.puntReturnYardsPerAttempt) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "kick-return-per-attempt", label: "KICK RET / ATT", direction: .higher) {
                metricValue($0.kickoffReturnYardsPerAttempt) { CompareValueFormat.decimal($0, digits: 1) }
            },
            CompareMetricSpec(id: "punt-returns", label: "PUNT RETURNS", direction: .neutral) {
                metricValue($0.puntReturns) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "kick-returns", label: "KICK RETURNS", direction: .neutral) {
                metricValue($0.kickoffReturns) { CompareValueFormat.integer($0) }
            },
            CompareMetricSpec(id: "special-teams-td", label: "SPECIAL TEAMS TD", direction: .higher) {
                metricValue($0.specialTeamsTouchdowns) { CompareValueFormat.integer($0) }
            },
        ]),
    ]
}

// MARK: - Season record table

/// The SEASON RECORD card that closes the metric stack. Unlike the metric groups this
/// reads `TeamSeasonStats`, which is never nil for a resolved season — so every row always
/// renders, and the "at least one side has it" filter the metric groups need doesn't apply.
enum CompareRecordCatalog {
    /// Win percentage, the comparable form of a W-L-T record. Ties count a half win, the
    /// NFL's own standings convention.
    static func winPercentage(wins: Int, losses: Int, ties: Int = 0) -> Double? {
        let games = wins + losses + ties
        guard games > 0 else { return nil }
        return (Double(wins) + Double(ties) / 2) / Double(games)
    }

    /// "12-5", or "12-4-1" when there is a tie to show.
    static func recordText(wins: Int, losses: Int, ties: Int = 0) -> String {
        ties > 0 ? "\(wins)-\(losses)-\(ties)" : "\(wins)-\(losses)"
    }

    /// The eight rows of the record table, in canvas order.
    static func rows(a statsA: TeamSeasonStats, b statsB: TeamSeasonStats) -> [CompareMetricRow] {
        [
            splitRow(
                id: "record", label: "RECORD",
                a: (statsA.overallWins, statsA.overallLosses, statsA.overallTies),
                b: (statsB.overallWins, statsB.overallLosses, statsB.overallTies)
            ),
            pointsRow(
                id: "points-for", label: "POINTS FOR", direction: .higher,
                a: statsA.pointsFor, b: statsB.pointsFor
            ),
            pointsRow(
                id: "points-against", label: "POINTS AGAINST", direction: .lower,
                a: statsA.pointsAgainst, b: statsB.pointsAgainst
            ),
            CompareMetricRow(
                id: "differential", label: "DIFFERENTIAL",
                a: CompareValueFormat.signedInteger(statsA.pointDifferential),
                b: CompareValueFormat.signedInteger(statsB.pointDifferential),
                leader: compareLeader(
                    Double(statsA.pointDifferential), Double(statsB.pointDifferential),
                    direction: .higher
                )
            ),
            splitRow(
                id: "home", label: "HOME",
                a: (statsA.homeWins, statsA.homeLosses, 0), b: (statsB.homeWins, statsB.homeLosses, 0)
            ),
            splitRow(
                id: "road", label: "ROAD",
                a: (statsA.roadWins, statsA.roadLosses, 0), b: (statsB.roadWins, statsB.roadLosses, 0)
            ),
            splitRow(
                id: "division", label: "DIVISION",
                a: (statsA.divisionWins, statsA.divisionLosses, 0),
                b: (statsB.divisionWins, statsB.divisionLosses, 0)
            ),
            splitRow(
                id: "conference", label: "CONFERENCE",
                a: (statsA.conferenceWins, statsA.conferenceLosses, 0),
                b: (statsB.conferenceWins, statsB.conferenceLosses, 0)
            ),
        ]
    }

    private static func splitRow(
        id: String,
        label: String,
        a: (wins: Int, losses: Int, ties: Int),
        b: (wins: Int, losses: Int, ties: Int)
    ) -> CompareMetricRow {
        CompareMetricRow(
            id: id,
            label: label,
            a: recordText(wins: a.wins, losses: a.losses, ties: a.ties),
            b: recordText(wins: b.wins, losses: b.losses, ties: b.ties),
            leader: compareLeader(
                winPercentage(wins: a.wins, losses: a.losses, ties: a.ties),
                winPercentage(wins: b.wins, losses: b.losses, ties: b.ties),
                direction: .higher
            )
        )
    }

    private static func pointsRow(
        id: String,
        label: String,
        direction: CompareMetricDirection,
        a: Int,
        b: Int
    ) -> CompareMetricRow {
        CompareMetricRow(
            id: id,
            label: label,
            a: CompareValueFormat.integer(a),
            b: CompareValueFormat.integer(b),
            leader: compareLeader(Double(a), Double(b), direction: direction)
        )
    }
}
