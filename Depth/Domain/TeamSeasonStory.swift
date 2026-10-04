import Foundation

// Chooses the one season story the Stats overview leads with, plus the facts that earn it.
// Every claim is a league rank the page already carries, so the story can only say what the
// data verifies: a metric without both a value and a rank is never a candidate, and a season
// below the two-game sample has no story of its own.

/// A metric the overview can cite. `id` matches the reference ledger's row ids so the
/// ledger can mark the rows the story is built from.
struct TeamStoryMetric: Sendable, Identifiable {
    let id: String
    /// Evidence-row label ("Rushing EPA").
    let label: String
    /// Headline noun ("run game" → "A top-five run game.").
    let noun: String
    /// Lockup caption beside the big rank ("in rushing EPA").
    let lockupLabel: String
    /// One line of plain-language context under an evidence row.
    let blurb: String
    let value: @Sendable (TeamSeasonStats) -> Double?
    let format: @Sendable (Double) -> String
    let rank: @Sendable (TeamStatsRanks) -> Int?
    /// Teams ranked for this metric. The line metrics rank only teams that pass the
    /// charting coverage gate, so their population can be smaller than the league.
    let population: @Sendable (TeamStatsRanks) -> Int?
    /// The two metrics that substantiate this one when it leads.
    let related: [String]
}

/// One cited fact: a value with its league rank, and last season's rank when known.
struct TeamStoryFact: Equatable, Sendable, Identifiable {
    let id: String
    let label: String
    let blurb: String
    let display: String
    let rank: Int
    let population: Int
    let priorRank: Int?
}

struct TeamSeasonStory: Equatable, Sendable {
    enum Kind: Equatable, Sendable {
        case standout
        case middling
    }

    let kind: Kind
    /// The season the story describes. Differs from the selected season when the selected
    /// one is too young to rank and the story carries over from last season.
    let season: Int
    let headline: String
    let lead: TeamStoryFact
    let lockupLabel: String
    /// "Up from 14th in 2025", or the defensive half of a middling story.
    let leadContext: String?
    /// The lead fact first, then the related facts that have data.
    let evidence: [TeamStoryFact]
    let gamesPlayed: Int
    /// True when the season is complete, so its ranks are final.
    let isFinal: Bool

    var metricIds: Set<String> { Set(evidence.map(\.id)) }

    /// Where the claim's scope lives: the sample it covers and who it is ranked against.
    var scope: String {
        let sample = isFinal ? "\(season) regular season, final" : "Through \(gamesPlayed) games"
        return "\(sample) · ranked among \(lead.population) teams"
    }
}

/// What the overview shows for the selected season.
struct TeamStatsOverviewStory: Equatable, Sendable {
    let story: TeamSeasonStory
    /// True when the selected season has no ranks yet and this is last season's story.
    let isCarryover: Bool
}

enum TeamSeasonStoryBuilder {
    static let leagueSize = 32
    /// Matches the Stats page's thin-sample rule: no league position off one game.
    static let minimumGamesForRanks = 2

    // MARK: Catalog

    static let metrics: [TeamStoryMetric] = [
        TeamStoryMetric(
            id: "points-for", label: "Points scored", noun: "scoring offense",
            lockupLabel: "in points scored", blurb: "Total points this season",
            value: { Double($0.pointsFor) }, format: TeamStatsMetricFormat.integer,
            rank: { $0.pointsFor }, population: { _ in nil },
            related: ["epa-per-play", "to-margin"]),
        TeamStoryMetric(
            id: "points-against", label: "Points allowed", noun: "scoring defense",
            lockupLabel: "in scoring defense", blurb: "Fewest allowed ranks 1st",
            value: { Double($0.pointsAgainst) }, format: TeamStatsMetricFormat.integer,
            rank: { $0.pointsAgainst }, population: { _ in nil },
            related: ["takeaways", "sacks"]),
        TeamStoryMetric(
            id: "diff", label: "Point differential", noun: "point differential",
            lockupLabel: "in point differential", blurb: "Points scored minus points allowed",
            value: { Double($0.pointDifferential) }, format: TeamStatsMetricFormat.signed(0),
            rank: { $0.pointDifferential }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "to-margin", label: "Turnover margin", noun: "turnover margin",
            lockupLabel: "in turnover margin", blurb: "Takeaways minus giveaways",
            value: { $0.matchupMetrics?.turnoverMargin.map(Double.init) },
            format: TeamStatsMetricFormat.signed(0),
            rank: { $0.turnoverMargin }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "pass-yds", label: "Passing yards", noun: "passing offense",
            lockupLabel: "in passing yards", blurb: "Volume through the air",
            value: { $0.passingYards.map(Double.init) }, format: TeamStatsMetricFormat.integer,
            rank: { $0.passingYards }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "rush-yds", label: "Rushing yards", noun: "rushing offense",
            lockupLabel: "in rushing yards", blurb: "Volume, not just efficiency",
            value: { $0.rushingYards.map(Double.init) }, format: TeamStatsMetricFormat.integer,
            rank: { $0.rushingYards }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "epa-per-play", label: "EPA per play", noun: "offense",
            lockupLabel: "in EPA per play", blurb: "Points added per snap vs. an average play",
            value: { $0.matchupMetrics?.offensiveEPAPerPlay },
            format: TeamStatsMetricFormat.signed(2),
            rank: { $0.offensiveEPAPerPlay }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "sack-rate", label: "Sack rate", noun: "sack rate",
            lockupLabel: "in sack rate", blurb: "Share of dropbacks sacked; lower ranks higher",
            value: { $0.matchupMetrics?.sackRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.sackRate }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "pass-epa", label: "Passing EPA", noun: "passing attack",
            lockupLabel: "in passing EPA", blurb: "Points added by passes vs. an average play",
            value: { $0.matchupMetrics?.passingEPA }, format: TeamStatsMetricFormat.signed(1),
            rank: { $0.passingEPA }, population: { _ in nil },
            related: ["pass-yds", "sack-rate"]),
        TeamStoryMetric(
            id: "rush-epa", label: "Rushing EPA", noun: "run game",
            lockupLabel: "in rushing EPA", blurb: "Points added by runs vs. an average play",
            value: { $0.matchupMetrics?.rushingEPA }, format: TeamStatsMetricFormat.signed(1),
            rank: { $0.rushingEPA }, population: { _ in nil },
            related: ["rush-yds", "stuffed-rate"]),
        TeamStoryMetric(
            id: "sacks", label: "Sacks", noun: "pass rush",
            lockupLabel: "in sacks", blurb: "Quarterback takedowns by the defense",
            value: { $0.matchupMetrics?.defensiveSacks }, format: TeamStatsMetricFormat.decimal(1),
            rank: { $0.defensiveSacks }, population: { _ in nil },
            related: ["qb-hits-per-game", "points-against"]),
        TeamStoryMetric(
            id: "qb-hits-per-game", label: "QB hits per game", noun: "pass rush",
            lockupLabel: "in QB hits per game", blurb: "Hits on the quarterback, sacks included",
            value: { $0.matchupMetrics?.quarterbackHitsPerGame },
            format: TeamStatsMetricFormat.decimal(1),
            rank: { $0.quarterbackHitsPerGame }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "takeaways", label: "Takeaways", noun: "takeaway defense",
            lockupLabel: "in takeaways", blurb: "Interceptions plus fumble recoveries",
            value: { $0.matchupMetrics?.defensiveTakeaways.map(Double.init) },
            format: TeamStatsMetricFormat.integer,
            rank: { $0.defensiveTakeaways }, population: { _ in nil },
            related: ["interceptions", "to-margin"]),
        TeamStoryMetric(
            id: "interceptions", label: "Interceptions", noun: "ball-hawking defense",
            lockupLabel: "in interceptions", blurb: "Passes picked off by the defense",
            value: { $0.matchupMetrics?.defensiveInterceptions.map(Double.init) },
            format: TeamStatsMetricFormat.integer,
            rank: { $0.defensiveInterceptions }, population: { _ in nil }, related: []),
        TeamStoryMetric(
            id: "adj-line-yards", label: "Adjusted line yards", noun: "line in the run game",
            lockupLabel: "in adjusted line yards", blurb: "Rushing yards credited to the line",
            value: { $0.lineStats?.adjustedLineYards }, format: TeamStatsMetricFormat.decimal(2),
            rank: { $0.adjustedLineYards },
            population: { $0.lineRankPopulation["adjustedLineYards"] },
            related: ["rush-yds", "stuffed-rate"]),
        TeamStoryMetric(
            id: "stuffed-rate", label: "Stuffed rate", noun: "line in the run game",
            lockupLabel: "in stuffed rate", blurb: "Runs stopped at or behind the line",
            value: { $0.lineStats?.stuffedRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.stuffedRate }, population: { $0.lineRankPopulation["stuffedRate"] },
            related: []),
        TeamStoryMetric(
            id: "line-sack-rate", label: "Sack rate allowed", noun: "pass protection",
            lockupLabel: "in sack rate allowed", blurb: "Share of dropbacks sacked",
            value: { $0.lineStats?.sackRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.lineSackRate }, population: { $0.lineRankPopulation["lineSackRate"] },
            related: []),
        TeamStoryMetric(
            id: "pressure-rate", label: "Pressure rate allowed", noun: "line in pass protection",
            lockupLabel: "in pass protection", blurb: "Dropbacks under pressure, FTN charting",
            value: { $0.lineStats?.pressureRate }, format: TeamStatsMetricFormat.percent,
            rank: { $0.pressureRate }, population: { $0.lineRankPopulation["pressureRate"] },
            related: ["line-sack-rate", "pass-epa"]),
    ]

    /// Metrics that can lead a story, in tie-break order: on an equal rank the earlier one
    /// wins.
    static let headlineCandidates = [
        "points-for", "points-against", "pass-epa", "rush-epa", "takeaways", "sacks",
        "adj-line-yards", "pressure-rate",
    ]

    static let middlingEvidence = ["points-for", "points-against", "diff"]

    static func metric(_ id: String) -> TeamStoryMetric? {
        metrics.first { $0.id == id }
    }

    // MARK: Selection

    /// The story for the selected season, or last season's when the selected one has
    /// fewer than two games (including an upcoming season with no row yet). Nil when
    /// neither season has the ranks to support a claim.
    static func overviewStory(page: TeamStatsPage, selectedSeason: Int) -> TeamStatsOverviewStory? {
        if let stats = page.seasons.first(where: { $0.season == selectedSeason }),
            games(stats) >= minimumGamesForRanks
        {
            return story(page: page, stats: stats).map {
                TeamStatsOverviewStory(story: $0, isCarryover: false)
            }
        }
        guard
            let prior = page.seasons.first(where: { $0.season == selectedSeason - 1 }),
            games(prior) >= minimumGamesForRanks
        else { return nil }
        return story(page: page, stats: prior).map {
            TeamStatsOverviewStory(story: $0, isCarryover: true)
        }
    }

    static func story(page: TeamStatsPage, stats: TeamSeasonStats) -> TeamSeasonStory? {
        guard let ranks = page.leagueRanksBySeason[stats.season] else { return nil }
        return story(
            stats: stats,
            ranks: ranks,
            priorRanks: page.leagueRanksBySeason[stats.season - 1],
            isFinal: stats.season < page.currentSeason
        )
    }

    /// Picks the lead in this order: the best top-5 rank (a 1st reads "The league’s best"); else the worst bottom-5 rank;
    /// else the best top-10; else the worst bottom-10; else, with every candidate in the
    /// middle of the league, the plain middling story.
    static func story(
        stats: TeamSeasonStats,
        ranks: TeamStatsRanks,
        priorRanks: TeamStatsRanks?,
        isFinal: Bool
    ) -> TeamSeasonStory? {
        let candidates = headlineCandidates.compactMap { id -> TeamStoryFact? in
            metric(id).flatMap { fact($0, stats: stats, ranks: ranks, priorRanks: priorRanks) }
        }
        guard !candidates.isEmpty else { return nil }

        let best = candidates.enumerated().min { lhs, rhs in
            (lhs.element.rank, lhs.offset) < (rhs.element.rank, rhs.offset)
        }?.element
        // Worst by distance from the bottom of each metric's own population, so a line
        // metric ranked among 28 qualified teams compares fairly with a 32-team one.
        let worst = candidates.enumerated().min { lhs, rhs in
            let l = lhs.element.population - lhs.element.rank
            let r = rhs.element.population - rhs.element.rank
            return (l, lhs.offset) < (r, rhs.offset)
        }?.element

        let lead: (fact: TeamStoryFact, tier: String)?
        if let best, best.rank <= 5 {
            lead = (best, "top-five")
        } else if let worst, worst.rank > worst.population - 5 {
            lead = (worst, "bottom-five")
        } else if let best, best.rank <= 10 {
            lead = (best, "top-ten")
        } else if let worst, worst.rank > worst.population - 10 {
            lead = (worst, "bottom-ten")
        } else {
            lead = nil
        }

        let games = games(stats)
        if let lead, let spec = metric(lead.fact.id) {
            let related = spec.related.compactMap { id in
                metric(id).flatMap { fact($0, stats: stats, ranks: ranks, priorRanks: priorRanks) }
            }
            return TeamSeasonStory(
                kind: .standout,
                season: stats.season,
                headline: lead.fact.rank == 1
                    ? "The league’s best \(spec.noun)." : "A \(lead.tier) \(spec.noun).",
                lead: lead.fact,
                lockupLabel: spec.lockupLabel,
                leadContext: priorContext(lead.fact, season: stats.season),
                evidence: [lead.fact] + related,
                gamesPlayed: games,
                isFinal: isFinal
            )
        }

        let evidence = middlingEvidence.compactMap { id in
            metric(id).flatMap { fact($0, stats: stats, ranks: ranks, priorRanks: priorRanks) }
        }
        guard let offense = evidence.first(where: { $0.id == "points-for" }) else { return nil }
        let defense = evidence.first { $0.id == "points-against" }
        return TeamSeasonStory(
            kind: .middling,
            season: stats.season,
            headline: "Middle of the league on both sides of the ball.",
            lead: offense,
            lockupLabel: "in points scored",
            leadContext: defense.map { "Defense: \(ordinal($0.rank)) in points allowed" },
            evidence: evidence,
            gamesPlayed: games,
            isFinal: isFinal
        )
    }

    static func games(_ stats: TeamSeasonStats) -> Int {
        stats.overallWins + stats.overallLosses + stats.overallTies
    }

    private static func fact(
        _ spec: TeamStoryMetric,
        stats: TeamSeasonStats,
        ranks: TeamStatsRanks,
        priorRanks: TeamStatsRanks?
    ) -> TeamStoryFact? {
        guard let value = spec.value(stats), let rank = spec.rank(ranks), rank > 0 else {
            return nil
        }
        let population = spec.population(ranks) ?? leagueSize
        return TeamStoryFact(
            id: spec.id,
            label: spec.label,
            blurb: spec.blurb,
            display: spec.format(value),
            rank: rank,
            population: max(population, rank),
            priorRank: priorRanks.flatMap(spec.rank)
        )
    }

    private static func priorContext(_ fact: TeamStoryFact, season: Int) -> String? {
        guard let prior = fact.priorRank else { return nil }
        let year = season - 1
        if prior == fact.rank { return "Also \(ordinal(prior)) in \(year)" }
        return prior > fact.rank
            ? "Up from \(ordinal(prior)) in \(year)"
            : "Down from \(ordinal(prior)) in \(year)"
    }
}

// MARK: - Pace against last season

/// This season's record against last season's after the same number of games.
struct TeamSeasonPace: Equatable, Sendable {
    let games: Int
    let priorSeason: Int
    let wins: Int
    let priorWins: Int
    let priorLosses: Int
    let priorTies: Int

    var winDelta: Int { wins - priorWins }

    var priorRecord: String {
        priorTies > 0 ? "\(priorWins)-\(priorLosses)-\(priorTies)" : "\(priorWins)-\(priorLosses)"
    }

    /// The signed part the hero colors: "+2 wins", "2 fewer wins", or nil for a level
    /// record.
    var lead: String? {
        switch winDelta {
        case 0: return nil
        case let delta where delta > 0: return "+\(delta) \(delta == 1 ? "win" : "wins")"
        case let delta: return "\(-delta) fewer \(delta == -1 ? "win" : "wins")"
        }
    }

    /// The rest of the line after `lead`.
    var detail: String {
        let span =
            "\(priorSeason) through \(games) \(games == 1 ? "game" : "games") (\(priorRecord))"
        switch winDelta {
        case 0: return "Same record as \(span)"
        case let delta where delta > 0: return "on \(span)"
        default: return "than \(span)"
        }
    }

    /// "+2 wins on 2025 through 11 games (6-5)".
    var summary: String {
        [lead, detail].compactMap { $0 }.joined(separator: " ")
    }

    /// Nil when this season has no games, or last season's schedule has fewer decided
    /// games than this one has played, so the comparison would not be like for like.
    static func compare(_ stats: TeamSeasonStats, priorSchedule: TeamSchedule?) -> TeamSeasonPace? {
        let games = TeamSeasonStoryBuilder.games(stats)
        guard games > 0, let priorSchedule, priorSchedule.season == stats.season - 1 else {
            return nil
        }
        let results = priorSchedule.games
            .filter { !$0.isBye }
            .sorted { $0.week < $1.week }
            .compactMap(\.result)
        guard results.count >= games else { return nil }
        let window = results.prefix(games)
        return TeamSeasonPace(
            games: games,
            priorSeason: priorSchedule.season,
            wins: stats.overallWins,
            priorWins: window.filter { $0 == .win }.count,
            priorLosses: window.filter { $0 == .loss }.count,
            priorTies: window.filter { $0 == .tie }.count
        )
    }
}
