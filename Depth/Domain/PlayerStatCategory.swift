import Foundation

// The stat-ledger vocabulary for PlayerProfileView: tabs are generated from the categories a player actually
// has data in, and each category declares ONE primary counting metric that drives both its
// bar and its headline column -- yards are never assumed. Everything else a category knows
// lives in the tap-to-open detail strip, so the ledger stays scannable and nothing is dropped.
//
// Scoped to what the per-player stat files really carry. Passer rating, 4QC/GWD and pressures
// are not published, so this file never presents an invented value. Derived rates (CMP%, YPA,
// per-game) are computed from stored columns only. Snap share is the one real line for
// O-line and long snappers; punters lead with their punting line. Fields only the advanced
// sources publish (missed tackles, yards before/after contact, time to throw, CPOE) show in
// a season's detail strip only when that season has them.

/// One labelled value. `short` is the on-screen compact label; `spoken` is what VoiceOver
/// reads, so no number is announced without the stat it belongs to.
struct PlayerStatFigure: Hashable {
    let value: String
    let short: String
    let spoken: String
}

enum PlayerStatCategory: String, CaseIterable, Hashable {
    case passing, rushing, receiving, returns, tackles, passRush, turnovers, kicking, punting,
        snaps, penalties, games

    var title: String {
        switch self {
        case .passing: "PASSING"
        case .rushing: "RUSHING"
        case .receiving: "RECEIVING"
        case .returns: "RETURNS"
        case .tackles: "TACKLES"
        case .passRush: "PASS RUSH"
        case .turnovers: "TURNOVERS"
        case .kicking: "KICKING"
        case .punting: "PUNTING"
        case .snaps: "SNAPS"
        case .penalties: "PENALTIES"
        case .games: "GAMES"
        }
    }

    /// Names the bar's metric in the ledger caption ("PASS YDS VS BEST").
    var barMetricName: String {
        switch self {
        case .passing: "PASS YDS"
        case .rushing: "RUSH YDS"
        case .receiving: "REC YDS"
        case .returns: "RETURN YDS"
        case .tackles: "SOLO TACKLES"
        case .passRush: "SACKS"
        case .turnovers: "INTERCEPTIONS"
        case .kicking: "FG MADE"
        case .punting: "PUNT YDS"
        case .snaps: "SNAPS"
        case .penalties: "PENALTIES"
        case .games: "GAMES"
        }
    }

    private var primaryColumn: PlayerStatColumn {
        switch self {
        case .passing: .passingYards
        case .rushing: .rushingYards
        case .receiving: .receivingYards
        case .returns: .returnYards
        case .tackles: .tackles
        case .passRush: .sacks
        case .turnovers: .interceptions
        case .kicking: .fieldGoalsMade
        case .punting: .puntYards
        // .snaps is unit-dependent (offense vs special teams); headline/primaryValue pick
        // the right column per player. This nominal value is only a fallback.
        case .snaps: .offenseSnaps
        case .penalties: .penalties
        case .games: .games
        }
    }

    /// The primary counting metric as a number, for the bar and the career-best scale.
    func primaryValue(_ stats: PlayerSeasonStats) -> Double {
        switch self {
        case .passing: Double(stats.passingYards ?? 0)
        case .rushing: Double(stats.rushingYards ?? 0)
        case .receiving: Double(stats.receivingYards ?? 0)
        case .returns: Double((stats.puntReturnYards ?? 0) + (stats.kickoffReturnYards ?? 0))
        case .tackles: Double(stats.defTacklesSolo ?? 0)
        case .passRush: stats.defSacks ?? 0
        case .turnovers: Double(stats.defInterceptions ?? 0)
        case .kicking: Double(stats.fgMade ?? 0)
        case .punting: Double(stats.puntYards ?? 0)
        case .snaps: Double(snapCount(stats))
        case .penalties: Double(stats.penalties ?? 0)
        case .games: Double(stats.games ?? 0)
        }
    }

    func hasData(_ stats: PlayerSeasonStats) -> Bool {
        switch self {
        case .passing: (stats.attempts ?? 0) > 0 || (stats.passingYards ?? 0) != 0
        case .rushing: (stats.carries ?? 0) > 0 || (stats.rushingYards ?? 0) != 0
        case .receiving: (stats.receptions ?? 0) > 0 || (stats.targets ?? 0) > 0
        case .returns: (stats.puntReturns ?? 0) > 0 || (stats.kickoffReturns ?? 0) > 0
        case .tackles:
            (stats.defTacklesSolo ?? 0) > 0 || (stats.defTackleAssists ?? 0) > 0
                || (stats.defTacklesForLoss ?? 0) > 0
        case .passRush: (stats.defSacks ?? 0) > 0 || (stats.defQbHits ?? 0) > 0
        case .turnovers:
            (stats.defInterceptions ?? 0) > 0 || (stats.defPassDefended ?? 0) > 0
                || (stats.defFumblesForced ?? 0) > 0 || (stats.fumbleRecoveries ?? 0) > 0
                || (stats.defTds ?? 0) > 0
        case .kicking: (stats.fgAtt ?? 0) > 0 || (stats.patAtt ?? 0) > 0
        case .punting: (stats.punts ?? 0) > 0
        case .snaps: snapCount(stats) > 0
        case .penalties: (stats.penalties ?? 0) > 0
        case .games: stats.hasPlayedGames
        }
    }

    func headline(_ stats: PlayerSeasonStats) -> PlayerStatFigure {
        switch self {
        case .snaps: figure(snapColumn(stats), stats)
        default: figure(primaryColumn, stats)
        }
    }

    /// The unit a SNAPS tab reports for this player. Offensive linemen lead with offense;
    /// long snappers and punters record only special-teams snaps. Picking the largest of
    /// the three keeps a stray special-teams rep from displacing an O-lineman's offensive
    /// load (and vice versa for a snapper who fills in on offense).
    private func snapColumn(_ stats: PlayerSeasonStats) -> PlayerStatColumn {
        let offense = stats.offenseSnaps ?? 0
        let defense = stats.defenseSnaps ?? 0
        let specialTeams = stats.specialTeamsSnaps ?? 0
        if defense > offense, defense > specialTeams { return .defenseSnaps }
        if specialTeams > offense, specialTeams > defense { return .specialTeamsSnaps }
        return .offenseSnaps
    }

    private func snapShareColumn(_ column: PlayerStatColumn) -> PlayerStatColumn {
        switch column {
        case .defenseSnaps: .defenseSnapShare
        case .specialTeamsSnaps: .specialTeamsSnapShare
        default: .offenseSnapShare
        }
    }

    private func snapCount(_ stats: PlayerSeasonStats) -> Int {
        switch snapColumn(stats) {
        case .defenseSnaps: stats.defenseSnaps ?? 0
        case .specialTeamsSnaps: stats.specialTeamsSnaps ?? 0
        default: stats.offenseSnaps ?? 0
        }
    }

    /// The secondary figures that sit beside the headline ("31 TD · 9 INT"). Single-metric
    /// categories name their unit instead, so a bare "44" is never ambiguous.
    func summary(_ stats: PlayerSeasonStats) -> [PlayerStatFigure] {
        switch self {
        case .passing:
            [
                PlayerStatFigure(value: count(stats.passingTds), short: "TD", spoken: "touchdowns"),
                PlayerStatFigure(
                    value: count(stats.passingInterceptions), short: "INT", spoken: "interceptions"),
            ]
        case .rushing:
            [
                PlayerStatFigure(value: count(stats.carries), short: "CAR", spoken: "carries"),
                PlayerStatFigure(value: count(stats.rushingTds), short: "TD", spoken: "touchdowns"),
            ]
        case .receiving:
            [
                PlayerStatFigure(
                    value: count(stats.receptions), short: "REC", spoken: "receptions"),
                PlayerStatFigure(
                    value: count(stats.receivingTds), short: "TD", spoken: "touchdowns"),
            ]
        case .returns:
            [
                PlayerStatFigure(
                    value: count(stats.puntReturns), short: "PR", spoken: "punt returns"),
                PlayerStatFigure(
                    value: count(stats.kickoffReturns), short: "KR", spoken: "kickoff returns"),
            ]
        case .tackles:
            [
                PlayerStatFigure(
                    value: count(stats.defTackleAssists), short: "AST", spoken: "assists"),
                PlayerStatFigure(
                    value: count(stats.defTacklesForLoss), short: "TFL", spoken: "tackles for loss"),
            ]
        case .passRush:
            [
                PlayerStatFigure(
                    value: count(stats.defQbHits), short: "QBH", spoken: "quarterback hits")
            ]
        case .turnovers:
            [
                PlayerStatFigure(
                    value: count(stats.defPassDefended), short: "PBU", spoken: "passes defended"),
                PlayerStatFigure(
                    value: count(stats.defFumblesForced), short: "FF", spoken: "forced fumbles"),
            ]
        case .kicking:
            [
                PlayerStatFigure(value: count(stats.fgAtt), short: "ATT", spoken: "attempts"),
                PlayerStatFigure(value: count(stats.patMade), short: "PAT", spoken: "extra points"),
            ]
        case .punting:
            [figure(.punts, stats), figure(.puntAverage, stats)]
        case .penalties:
            [
                PlayerStatFigure(
                    value: count(stats.penaltyYards), short: "PEN YDS", spoken: "penalty yards")
            ]
        case .snaps, .games:
            [PlayerStatFigure(value: count(stats.games), short: "GP", spoken: "games played")]
        }
    }

    /// The tap-to-open strip. Empty means the row has nothing more to show and isn't
    /// expandable.
    func details(_ stats: PlayerSeasonStats) -> [PlayerStatFigure] {
        switch self {
        case .passing:
            [
                figure(.completionsAttempts, stats),
                PlayerStatFigure(
                    value: percent(stats.completions, stats.attempts),
                    short: "CMP%", spoken: "Completion percentage"
                ),
                figure(.passingYardsPerAttempt, stats),
                figure(.games, stats),
            ]
                + present(.timeToThrow, stats.timeToThrow, stats)
                + present(.passingCpoe, stats.passingCpoe, stats)
        case .rushing:
            [figure(.rushingYardsPerCarry, stats), figure(.games, stats)]
                + present(
                    .yardsBeforeContactPerCarry, stats.rushingYardsBeforeContactPerCarry, stats)
                + present(.yardsAfterContactPerCarry, stats.rushingYardsAfterContactPerCarry, stats)
        case .receiving:
            [
                figure(.targets, stats),
                PlayerStatFigure(
                    value: percent(stats.receptions, stats.targets),
                    short: "CATCH%", spoken: "Catch percentage"
                ),
                figure(.receivingYardsPerReception, stats),
                figure(.games, stats),
            ]
        case .returns:
            [
                figure(.puntReturnYards, stats),
                figure(.kickoffReturnYards, stats),
                figure(.specialTeamsTds, stats),
                figure(.games, stats),
            ]
        case .tackles:
            [
                PlayerStatFigure(
                    value: perGame(primaryValue(stats), stats.games),
                    short: "PER GAME", spoken: "\(barMetricName.capitalized) per game"
                )
            ] + present(.missedTackles, stats.missedTackles, stats)
        case .passRush:
            [
                PlayerStatFigure(
                    value: perGame(primaryValue(stats), stats.games),
                    short: "PER GAME", spoken: "\(barMetricName.capitalized) per game"
                )
            ]
        case .turnovers:
            [
                PlayerStatFigure(
                    value: perGame(primaryValue(stats), stats.games),
                    short: "PER GAME", spoken: "\(barMetricName.capitalized) per game"
                ),
                figure(.fumbleRecoveries, stats),
                figure(.defensiveTds, stats),
            ]
        case .kicking:
            [
                figure(.fieldGoalPercentage, stats),
                figure(.fieldGoalLong, stats),
                figure(.games, stats),
            ]
        case .punting:
            [
                figure(.puntLong, stats), figure(.puntsInside20, stats),
                figure(.puntTouchbacks, stats),
            ]
                + present(.puntNetAverage, stats.puntNetYards, stats)
                + [figure(.games, stats)]
        case .snaps:
            [figure(snapShareColumn(snapColumn(stats)), stats)]
        case .penalties, .games:
            []
        }
    }

    /// Bar width as a fraction of the player's best season in this category.
    func barFraction(_ stats: PlayerSeasonStats, among seasons: [PlayerSeasonStats]) -> Double {
        let best = seasons.map(primaryValue).max() ?? 0
        guard best > 0 else { return 0 }
        return min(max(primaryValue(stats) / best, 0), 1)
    }

    /// The season the bars scale against: the top mark in this category, the newest season
    /// on a tie (seasons arrive newest first). Nil when no season recorded a positive mark.
    func careerBest(among seasons: [PlayerSeasonStats]) -> PlayerSeasonStats? {
        guard let top = seasons.map(primaryValue).max(), top > 0 else { return nil }
        return seasons.first { primaryValue($0) == top }
    }

    /// Tabs in position-relevance order, filtered to categories with data in any season.
    /// `.games` is the fallback for players whose position records nothing else -- a
    /// participation-only position before snap data exists, or a player who only has a
    /// games figure -- so a loaded profile always has at least one tab.
    static func categories(for stats: [PlayerSeasonStats], position: Position)
        -> [PlayerStatCategory]
    {
        let present = order(for: position).filter { category in
            category != .games && stats.contains(where: category.hasData)
        }
        if !present.isEmpty { return present }
        return stats.contains(where: \.hasPlayedGames) ? [.games] : []
    }

    // Only the player's own side of the ball is eligible. A quarterback's solo tackle after
    // an interception, or a kicker's on a return, is real data but not a stat line anyone
    // browses -- surfacing it as a TACKLES tab reads as a bug. Same-side trick plays (a
    // receiver's pass attempt) stay, since they belong to that player's category family.
    private static func order(for position: Position) -> [PlayerStatCategory] {
        switch position.family {
        case .quarterback: [.passing, .rushing, .receiving]
        case .backfield: [.rushing, .receiving, .passing, .returns]
        case .receiver: [.receiving, .rushing, .passing, .returns]
        case .returner: [.returns, .receiving, .rushing]
        case .edge, .interiorLine, .linebacker, .corner, .safety, .defensiveBack:
            [.tackles, .passRush, .turnovers, .returns]
        case .kicker: [.kicking]
        case .punter: [.punting, .snaps, .kicking]
        case .offensiveLine, .longSnapper:
            [.snaps, .penalties, .receiving, .rushing]
        }
    }

    private func figure(_ column: PlayerStatColumn, _ stats: PlayerSeasonStats) -> PlayerStatFigure
    {
        PlayerStatFigure(
            value: column.value(for: stats), short: column.header, spoken: column.accessibleName)
    }

    /// A figure for a field only some seasons carry (the advanced sources start in 2016-2018),
    /// omitted rather than shown as a dash when the season has none.
    private func present<Value>(
        _ column: PlayerStatColumn, _ value: Value?, _ stats: PlayerSeasonStats
    ) -> [PlayerStatFigure] {
        value == nil ? [] : [figure(column, stats)]
    }

    private func count(_ value: Int?) -> String { "\(value ?? 0)" }

    private func percent(_ numerator: Int?, _ denominator: Int?) -> String {
        guard let denominator, denominator > 0 else { return "—" }
        return String(format: "%.1f", Double(numerator ?? 0) / Double(denominator) * 100)
    }

    private func perGame(_ total: Double, _ games: Int?) -> String {
        guard let games, games > 0 else { return "—" }
        return String(format: "%.1f", total / Double(games))
    }
}

enum PlayerStatLedger {
    /// Sums every season into one row for the ledger's CAREER line. A column that is nil in
    /// every season stays nil, so the career row keeps "not recorded" distinct from zero.
    static func careerTotals(_ seasons: [PlayerSeasonStats]) -> PlayerSeasonStats {
        func sum(_ key: KeyPath<PlayerSeasonStats, Int?>) -> Int? {
            let values = seasons.compactMap { $0[keyPath: key] }
            return values.isEmpty ? nil : values.reduce(0, +)
        }
        let sacks = seasons.compactMap(\.defSacks)
        return PlayerSeasonStats(
            season: 0, seasonType: .regular, teamAbbrev: nil, games: sum(\.games),
            completions: sum(\.completions), attempts: sum(\.attempts),
            passingYards: sum(\.passingYards), passingTds: sum(\.passingTds),
            passingInterceptions: sum(\.passingInterceptions), carries: sum(\.carries),
            rushingYards: sum(\.rushingYards), rushingTds: sum(\.rushingTds),
            receptions: sum(\.receptions), targets: sum(\.targets),
            receivingYards: sum(\.receivingYards), receivingTds: sum(\.receivingTds),
            defTacklesSolo: sum(\.defTacklesSolo),
            defSacks: sacks.isEmpty ? nil : sacks.reduce(0, +),
            defInterceptions: sum(\.defInterceptions), fgMade: sum(\.fgMade), fgAtt: sum(\.fgAtt),
            defTackleAssists: sum(\.defTackleAssists), defTacklesForLoss: sum(\.defTacklesForLoss),
            defQbHits: sum(\.defQbHits), defPassDefended: sum(\.defPassDefended),
            defFumblesForced: sum(\.defFumblesForced), defTds: sum(\.defTds),
            defSafeties: sum(\.defSafeties), fumbleRecoveries: sum(\.fumbleRecoveries),
            fumbleRecoveryTds: sum(\.fumbleRecoveryTds), puntReturns: sum(\.puntReturns),
            puntReturnYards: sum(\.puntReturnYards), kickoffReturns: sum(\.kickoffReturns),
            kickoffReturnYards: sum(\.kickoffReturnYards), specialTeamsTds: sum(\.specialTeamsTds),
            penalties: sum(\.penalties), penaltyYards: sum(\.penaltyYards), patMade: sum(\.patMade),
            patAtt: sum(\.patAtt), fgLong: sum(\.fgLong), offenseSnaps: sum(\.offenseSnaps),
            // A summed share is meaningless and the career row never renders the share
            // detail; leave the percentages absent rather than averaging incomparable
            // denominators.
            offensePct: nil, defenseSnaps: sum(\.defenseSnaps), defensePct: nil,
            specialTeamsSnaps: sum(\.specialTeamsSnaps), specialTeamsPct: nil
        )
    }

    /// Whether a ledger row gets the highlight. With a season open, every row for that year
    /// does (a mid-season trade has one row per team) and none otherwise, so a player whose
    /// career runs past the open season never highlights a later year. Without one, the
    /// newest row does.
    static func isHighlighted(
        _ row: PlayerSeasonStats, index: Int, highlightedSeason: Int?
    ) -> Bool {
        guard let highlightedSeason else { return index == 0 }
        return row.season == highlightedSeason
    }

    static func seasonCountLabel(_ count: Int) -> String {
        count == 1 ? "REG · 1 SEASON" : "REG · \(count) SEASONS"
    }

    /// The season whose regular-season totals can still grow: the schedule's season while
    /// any of its regular-season games is unplayed. Nil once the last game has a result, or
    /// when no schedule is available.
    static func inProgressSeason(_ schedule: TeamSchedule?) -> Int? {
        guard let schedule,
            schedule.games.contains(where: { !$0.isBye && $0.result == nil })
        else { return nil }
        return schedule.season
    }

    /// One spoken sentence per ledger row: season, team, headline, then the summary. The
    /// season's status stays in the first segment, so every later segment is a stat.
    static func rowLabel(
        for stats: PlayerSeasonStats, category: PlayerStatCategory,
        isCareerBest: Bool = false, isInProgress: Bool = false
    ) -> String {
        let seasonPhrase = isCareerBest ? "career-best season" : "season"
        var parts = ["\(stats.season) \(seasonPhrase)\(isInProgress ? " in progress" : "")"]
        if let team = stats.teamAbbrev, !team.isEmpty { parts.append(team) }
        let headline = category.headline(stats)
        parts.append("\(headline.spoken) \(headline.value)")
        parts.append(contentsOf: category.summary(stats).map { "\($0.value) \($0.spoken)" })
        return parts.joined(separator: ", ")
    }
}

/// One season's ledger line in compact form: the lead category's headline, then its summary.
struct PlayerCompactStatLine: Equatable {
    let figures: [PlayerStatFigure]
    let accessibilityLabel: String
}

extension PlayerStatLedger {
    /// The ledger's row for one season, reduced to the player's lead category, for surfaces
    /// too narrow for the full ledger. `season` nil reads the newest played season; a pinned
    /// season the player has no played row for is nil rather than a neighbouring year's line.
    /// A traded player's stint with `teamAbbrev` wins over their other stints that season.
    static func compactLine(
        for seasons: [PlayerSeasonStats], position: Position, season: Int?, teamAbbrev: String?
    ) -> PlayerCompactStatLine? {
        let played = seasons.filter(\.hasPlayedGames)
        guard let year = season ?? played.map(\.season).max() else { return nil }
        let stints = played.filter { $0.season == year }
        guard let row = stints.first(where: { $0.teamAbbrev == teamAbbrev }) ?? stints.first,
            let category = PlayerStatCategory.categories(for: [row], position: position).first
        else { return nil }

        let headline = category.headline(row)
        // `.games` names the same games-played figure as its headline and its summary.
        let summary = category == .games ? [] : category.summary(row)
        let spoken =
            ["\(year) season", "\(headline.spoken) \(headline.value)"]
            + summary.map { "\($0.value) \($0.spoken)" }
        return PlayerCompactStatLine(
            figures: [headline] + summary, accessibilityLabel: spoken.joined(separator: ", "))
    }
}

extension PlayerProfileDisplay {
    private static let nameSuffixes: Set<String> = [
        "jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v",
    ]

    /// The name across the back of the jersey: the surname, skipping generational suffixes
    /// ("Marvin Harrison Jr." -> "HARRISON"). Nil when the player has no recorded name.
    static func jerseyName(_ name: String) -> String? {
        let words = name.split(separator: " ").map(String.init)
        let surname = words.last(where: { !nameSuffixes.contains($0.lowercased()) }) ?? words.last
        return surname.map { $0.uppercased() }
    }

    /// Headshot fallback initials: first letter of the first name and of the surname.
    static func initials(_ name: String) -> String? {
        let words = name.split(separator: " ").map(String.init)
            .filter { !nameSuffixes.contains($0.lowercased()) }
        guard let first = words.first?.first else { return nil }
        guard words.count > 1, let last = words.last?.first else {
            return String(first).uppercased()
        }
        return "\(first)\(last)".uppercased()
    }

    /// The experience the vitals strip shows. Historical roster rows carry no experience, so
    /// the 0 the mapper fills in is a placeholder, not a rookie season, and is left out.
    static func shownExperience(_ value: Int, isHistorical: Bool) -> Int? {
        isHistorical ? nil : value
    }

    /// The single-line vitals strip ("AGE 27 · EXP 5 YRS · 6'4\" · 218 LB · ALABAMA").
    /// Absent values are left out rather than rendered as "AGE —". College rides last: the
    /// rather than adding a labeled block to the profile.
    static func vitals(
        age: Int?, experience: Int?, height: String?, weight: Int?, college: String? = nil
    ) -> [PlayerVital] {
        var parts: [PlayerVital] = []
        if let age, age > 0 {
            parts.append(PlayerVital(text: "AGE \(age)", spoken: "Age \(age)"))
        }
        if let experience {
            let text = Self.experience(experience)
            let shown = experience <= 0 ? text.uppercased() : "EXP \(text.uppercased())"
            parts.append(PlayerVital(text: shown, spoken: "Experience, \(text)"))
        }
        if let height = meaningful(height) {
            parts.append(PlayerVital(text: height, spoken: "Height \(height)"))
        }
        if let weight, weight > 0 {
            parts.append(PlayerVital(text: "\(weight) LB", spoken: "Weight \(weight) pounds"))
        }
        if let college = meaningful(college) {
            // ESPN stores a transfer's schools as one ";"-separated string ("West Alabama;
            // Garden City CC; Oklahoma State" — 44 characters). The strip is one line, and its
            // parts carry equal layout priority, so a value that long shrinks AGE/EXP/height/
            // weight too; show only the first school and leave the full list to VoiceOver
            // omittingEmptySubsequences: false on purpose. The default drops a leading
            // empty component, so a degenerate ";Oklahoma State" would silently promote the
            // SECOND school as if it were the first; keeping the empty component makes that
            // input fall through to the raw value below instead of quietly lying. Not
            // reachable with real ESPN data — this is a correctness guard, not a fix.
            let first =
                college.split(separator: ";", omittingEmptySubsequences: false).first
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) } ?? ""
            let shown = first.isEmpty ? college : first
            parts.append(PlayerVital(text: shown.uppercased(), spoken: "College, \(college)"))
        }
        return parts
    }

    /// The profile's BIO text, or nil to hide the section. Historical rosters synthesize
    /// bio as "{season} · {city} {name}" (HistoricalRosterMapper), which repeats what the
    /// screen already shows, so it never renders there.
    static func bio(_ value: String?, isHistorical: Bool) -> String? {
        isHistorical ? nil : meaningful(value)
    }
}

struct PlayerVital: Hashable {
    let text: String
    let spoken: String
}
