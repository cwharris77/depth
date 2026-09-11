import Foundation

// The stat-ledger vocabulary for PlayerProfileView's merged design (Claude Design "Player
// Profile", option 2, 2026-09-11): tabs are generated from the categories a player actually
// has data in, and each category declares ONE primary counting metric that drives both its
// bar and its headline column -- yards are never assumed. Everything else a category knows
// lives in the tap-to-open detail strip, so the ledger stays scannable and nothing is dropped.
//
// Scoped to what `player_stats` really stores. The design mock also shows passer rating,
// 4QC/GWD, pressures, snap share and missed tackles; none of those columns exist, and this
// file never presents an invented value (same rule as PlayerProfileDisplay). Derived rates
// (CMP%, YPA, per-game) are computed from stored columns only.

/// One labelled value. `short` is the on-screen compact label; `spoken` is what VoiceOver
/// reads, so no number is announced without the stat it belongs to.
struct PlayerStatFigure: Hashable {
    let value: String
    let short: String
    let spoken: String
}

enum PlayerStatCategory: String, CaseIterable, Hashable {
    case passing, rushing, receiving, tackles, passRush, turnovers, kicking, games

    var title: String {
        switch self {
        case .passing: "PASSING"
        case .rushing: "RUSHING"
        case .receiving: "RECEIVING"
        case .tackles: "TACKLES"
        case .passRush: "PASS RUSH"
        case .turnovers: "TURNOVERS"
        case .kicking: "KICKING"
        case .games: "GAMES"
        }
    }

    /// Names the bar's metric in the ledger caption ("PASS YDS VS BEST").
    var barMetricName: String {
        switch self {
        case .passing: "PASS YDS"
        case .rushing: "RUSH YDS"
        case .receiving: "REC YDS"
        case .tackles: "SOLO TACKLES"
        case .passRush: "SACKS"
        case .turnovers: "INTERCEPTIONS"
        case .kicking: "FG MADE"
        case .games: "GAMES"
        }
    }

    private var primaryColumn: PlayerStatColumn {
        switch self {
        case .passing: .passingYards
        case .rushing: .rushingYards
        case .receiving: .receivingYards
        case .tackles: .tackles
        case .passRush: .sacks
        case .turnovers: .interceptions
        case .kicking: .fieldGoalsMade
        case .games: .games
        }
    }

    /// The primary counting metric as a number, for the bar and the career-best scale.
    func primaryValue(_ stats: PlayerSeasonStats) -> Double {
        switch self {
        case .passing: Double(stats.passingYards ?? 0)
        case .rushing: Double(stats.rushingYards ?? 0)
        case .receiving: Double(stats.receivingYards ?? 0)
        case .tackles: Double(stats.defTacklesSolo ?? 0)
        case .passRush: stats.defSacks ?? 0
        case .turnovers: Double(stats.defInterceptions ?? 0)
        case .kicking: Double(stats.fgMade ?? 0)
        case .games: Double(stats.games ?? 0)
        }
    }

    func hasData(_ stats: PlayerSeasonStats) -> Bool {
        switch self {
        case .passing: (stats.attempts ?? 0) > 0 || (stats.passingYards ?? 0) != 0
        case .rushing: (stats.carries ?? 0) > 0 || (stats.rushingYards ?? 0) != 0
        case .receiving: (stats.receptions ?? 0) > 0 || (stats.targets ?? 0) > 0
        case .tackles: (stats.defTacklesSolo ?? 0) > 0
        case .passRush: (stats.defSacks ?? 0) > 0
        case .turnovers: (stats.defInterceptions ?? 0) > 0
        case .kicking: (stats.fgAtt ?? 0) > 0
        case .games: stats.hasPlayedGames
        }
    }

    func headline(_ stats: PlayerSeasonStats) -> PlayerStatFigure {
        figure(primaryColumn, stats)
    }

    /// The secondary figures that sit beside the headline ("31 TD · 9 INT"). Single-metric
    /// categories name their unit instead, so a bare "44" is never ambiguous.
    func summary(_ stats: PlayerSeasonStats) -> [PlayerStatFigure] {
        switch self {
        case .passing:
            [
                PlayerStatFigure(value: count(stats.passingTds), short: "TD", spoken: "touchdowns"),
                PlayerStatFigure(value: count(stats.passingInterceptions), short: "INT", spoken: "interceptions"),
            ]
        case .rushing:
            [
                PlayerStatFigure(value: count(stats.carries), short: "CAR", spoken: "carries"),
                PlayerStatFigure(value: count(stats.rushingTds), short: "TD", spoken: "touchdowns"),
            ]
        case .receiving:
            [
                PlayerStatFigure(value: count(stats.receptions), short: "REC", spoken: "receptions"),
                PlayerStatFigure(value: count(stats.receivingTds), short: "TD", spoken: "touchdowns"),
            ]
        case .kicking:
            [PlayerStatFigure(value: count(stats.fgAtt), short: "ATT", spoken: "attempts")]
        case .tackles, .passRush, .turnovers, .games:
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
        case .rushing:
            [figure(.rushingYardsPerCarry, stats), figure(.games, stats)]
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
        case .tackles, .passRush, .turnovers:
            [
                PlayerStatFigure(
                    value: perGame(primaryValue(stats), stats.games),
                    short: "PER GAME", spoken: "\(barMetricName.capitalized) per game"
                ),
            ]
        case .kicking:
            [figure(.fieldGoalPercentage, stats), figure(.games, stats)]
        case .games:
            []
        }
    }

    /// Bar width as a fraction of the player's best season in this category.
    func barFraction(_ stats: PlayerSeasonStats, among seasons: [PlayerSeasonStats]) -> Double {
        let best = seasons.map(primaryValue).max() ?? 0
        guard best > 0 else { return 0 }
        return min(max(primaryValue(stats) / best, 0), 1)
    }

    /// Tabs in position-relevance order, filtered to categories with data in any season.
    /// `.games` is the fallback for players whose position records nothing else (O-line,
    /// long snappers), so a loaded profile always has at least one tab.
    static func categories(for stats: [PlayerSeasonStats], position: Position) -> [PlayerStatCategory] {
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
        switch position {
        case .qb: [.passing, .rushing, .receiving]
        case .rb, .fb: [.rushing, .receiving, .passing]
        case .wr, .te, .kr, .pr: [.receiving, .rushing, .passing]
        case .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb, .cb, .lcb, .rcb, .nb, .s, .ss, .fs:
            [.tackles, .passRush, .turnovers]
        case .k, .p: [.kicking]
        case .lt, .lg, .c, .rg, .rt, .ot, .g, .ls: [.receiving, .rushing]
        }
    }

    private func figure(_ column: PlayerStatColumn, _ stats: PlayerSeasonStats) -> PlayerStatFigure {
        PlayerStatFigure(value: column.value(for: stats), short: column.header, spoken: column.accessibleName)
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
            defTacklesSolo: sum(\.defTacklesSolo), defSacks: sacks.isEmpty ? nil : sacks.reduce(0, +),
            defInterceptions: sum(\.defInterceptions), fgMade: sum(\.fgMade), fgAtt: sum(\.fgAtt)
        )
    }

    static func seasonCountLabel(_ count: Int) -> String {
        count == 1 ? "REG · 1 SEASON" : "REG · \(count) SEASONS"
    }

    /// One spoken sentence per ledger row: season, team, headline, then the summary.
    static func rowLabel(for stats: PlayerSeasonStats, category: PlayerStatCategory) -> String {
        var parts = ["\(stats.season) season"]
        if let team = stats.teamAbbrev, !team.isEmpty { parts.append(team) }
        let headline = category.headline(stats)
        parts.append("\(headline.spoken) \(headline.value)")
        parts.append(contentsOf: category.summary(stats).map { "\($0.value) \($0.spoken)" })
        return parts.joined(separator: ", ")
    }
}

extension PlayerProfileDisplay {
    private static let nameSuffixes: Set<String> = ["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]

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
        guard words.count > 1, let last = words.last?.first else { return String(first).uppercased() }
        return "\(first)\(last)".uppercased()
    }

    /// The single-line vitals strip ("AGE 27 · EXP 5 YRS · 6'4\" · 218 LB · ALABAMA").
    /// Absent values are left out rather than rendered as "AGE —". College rides last: the
    /// 2026-09-11 merge spec moved it off the deleted player card into this strip rather
    /// than adding a labeled block to the profile.
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
            parts.append(PlayerVital(text: college.uppercased(), spoken: "College, \(college)"))
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
