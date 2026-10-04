import Foundation
import Testing

@testable import Depth

// The overview's story rules: lead with the best top-5 rank; a bottom-5 rank only when
// nothing is top-5; then top-10 / bottom-10; and the plain middling story when every
// candidate sits in the middle of the league. Every fact must carry a real rank.

private func season(
    _ year: Int,
    wins: Int = 8, losses: Int = 3,
    metrics: TeamMatchupMetrics? = nil,
    line: TeamLineStats? = nil
) -> TeamSeasonStats {
    var stats = TeamSeasonStats(
        season: year,
        overallWins: wins, overallLosses: losses, overallTies: 0,
        homeWins: 5, homeLosses: 1, roadWins: 3, roadLosses: 2,
        divisionWins: 2, divisionLosses: 1, conferenceWins: 6, conferenceLosses: 2,
        pointsFor: 294, pointsAgainst: 221, pointDifferential: 73,
        matchupMetrics: metrics
    )
    stats.rushingYards = 1570
    stats.passingYards = 2545
    stats.lineStats = line
    return stats
}

private func metrics(_ year: Int) -> TeamMatchupMetrics {
    TeamMatchupMetrics(
        source: .nflverse, season: year, updatedAt: "2026-11-20",
        games: 11, passingEPA: 40.2, rushingEPA: 31.5, passAttempts: nil, rushAttempts: nil,
        sacksSuffered: nil, offensiveEPA: nil, offensivePlays: nil, offensiveEPAPerPlay: 0.11,
        sackRate: 0.051, passingInterceptions: nil, fumblesLost: nil, giveaways: nil,
        turnoverMargin: 6, defensiveSacks: 28, quarterbackHits: nil,
        quarterbackHitsPerGame: 6.1, defensiveInterceptions: 9, defensiveFumbleRecoveries: nil,
        defensiveFumblesForced: nil, defensiveTakeaways: 14, defensiveTakeawaysPerGame: nil,
        fieldGoalsMade: nil, fieldGoalsAttempted: nil, fieldGoalPercentage: nil,
        puntAttempts: nil, netPuntYards: nil, netPuntYardsPerAttempt: nil, puntReturns: nil,
        puntReturnYards: nil, puntReturnYardsPerAttempt: nil, kickoffReturns: nil,
        kickoffReturnYards: nil, kickoffReturnYardsPerAttempt: nil, specialTeamsTouchdowns: nil
    )
}

/// Every headline candidate ranked `rank` unless overridden.
private func ranks(_ rank: Int = 16, _ overrides: (inout TeamStatsRanks) -> Void = { _ in })
    -> TeamStatsRanks
{
    var r = TeamStatsRanks(
        pointsFor: rank, pointsAgainst: rank, pointDifferential: rank,
        passingYards: rank, rushingYards: rank, turnoverMargin: rank,
        offensiveEPAPerPlay: rank, sackRate: rank, passingEPA: rank, rushingEPA: rank,
        defensiveSacks: rank, quarterbackHitsPerGame: rank, defensiveTakeaways: rank,
        defensiveInterceptions: rank
    )
    overrides(&r)
    return r
}

private func story(_ r: TeamStatsRanks, prior: TeamStatsRanks? = nil) -> TeamSeasonStory? {
    TeamSeasonStoryBuilder.story(
        stats: season(2026, metrics: metrics(2026)), ranks: r, priorRanks: prior,
        isFinal: false)
}

@Test func bestTopFiveRankLeadsWithItsRelatedEvidence() throws {
    let s = try #require(
        story(
            ranks(16) {
                $0.rushingEPA = 3; $0.rushingYards = 3
            }))
    #expect(s.kind == .standout)
    #expect(s.headline == "A top-five run game.")
    #expect(s.lead.id == "rush-epa")
    #expect(s.lead.rank == 3)
    // Rushing yards has data; stuffed rate has no line row, so it drops rather than zeroes.
    #expect(s.evidence.map(\.id) == ["rush-epa", "rush-yds"])
}

@Test func aFirstPlaceRankReadsAsTheLeaguesBest() throws {
    let s = try #require(story(ranks(16) { $0.defensiveSacks = 1 }))
    #expect(s.headline == "The league’s best pass rush.")
}

@Test func tiedTopRanksBreakByCandidateOrder() throws {
    let s = try #require(
        story(
            ranks(16) {
                $0.passingEPA = 2; $0.defensiveSacks = 2
            }))
    #expect(s.lead.id == "pass-epa")
}

@Test func bottomFiveLeadsOnlyWithoutATopFive() throws {
    let bottom = try #require(story(ranks(16) { $0.pointsAgainst = 31 }))
    #expect(bottom.headline == "A bottom-five scoring defense.")

    let mixed = try #require(
        story(
            ranks(16) {
                $0.pointsAgainst = 31; $0.defensiveSacks = 5
            }))
    #expect(mixed.headline == "A top-five pass rush.")
}

@Test func topTenFillsTheGapBeforeTheMiddlingStory() throws {
    let s = try #require(story(ranks(16) { $0.defensiveTakeaways = 8 }))
    #expect(s.headline == "A top-ten takeaway defense.")
}

@Test func middleOfTheLeagueSaysSoPlainly() throws {
    let s = try #require(
        story(
            ranks(16) {
                $0.pointsFor = 15; $0.pointsAgainst = 17
            }))
    #expect(s.kind == .middling)
    #expect(s.headline == "Middle of the league on both sides of the ball.")
    #expect(s.leadContext == "Defense: 17th in points allowed")
    #expect(s.evidence.map(\.id) == ["points-for", "points-against", "diff"])
}

@Test func priorSeasonRankBecomesTheLeadContext() throws {
    let up = try #require(
        story(ranks(16) { $0.rushingEPA = 3 }, prior: ranks(16) { $0.rushingEPA = 14 }))
    #expect(up.leadContext == "Up from 14th in 2025")
    #expect(up.lead.priorRank == 14)

    let down = try #require(
        story(ranks(16) { $0.rushingEPA = 3 }, prior: ranks(16) { $0.rushingEPA = 1 }))
    #expect(down.leadContext == "Down from 1st in 2025")
}

@Test func noRanksMeansNoStory() {
    #expect(story(TeamStatsRanks()) == nil)
}

@Test func lineMetricsRankWithinTheirQualifiedPopulation() throws {
    let line = TeamLineStats(
        source: .nflverse, season: 2026, updatedAt: "2026-11-20", rushes: nil,
        lineYards: nil, adjustedLineYards: 4.9, stuffedRate: 0.148, powerSuccessRate: nil,
        secondLevelYards: nil, secondLevelYardsPerRush: nil, openFieldYards: nil,
        openFieldYardsPerRush: nil, dropbacks: nil, sacksAllowed: nil, sackRate: nil,
        pressuresAllowed: nil, pressureRate: nil, avgTimeToThrow: nil, avgPassRushers: nil)
    var r = ranks(16)
    r.adjustedLineYards = 2
    r.stuffedRate = 4
    r.lineRankPopulation = ["adjustedLineYards": 28, "stuffedRate": 28]
    let s = try #require(
        TeamSeasonStoryBuilder.story(
            stats: season(2026, metrics: metrics(2026), line: line), ranks: r, priorRanks: nil,
            isFinal: false))
    #expect(s.lead.id == "adj-line-yards")
    #expect(s.scope == "Through 11 games · ranked among 28 teams")
    #expect(s.lead.population == 28)
    #expect(s.evidence.map(\.id) == ["adj-line-yards", "rush-yds", "stuffed-rate"])
}

@Test func scopeNamesTheSampleAndWhetherItIsFinal() throws {
    let live = try #require(story(ranks(16) { $0.rushingEPA = 3 }))
    #expect(live.scope == "Through 11 games · ranked among 32 teams")

    let final = try #require(
        TeamSeasonStoryBuilder.story(
            stats: season(2024, metrics: metrics(2024)), ranks: ranks(16) { $0.rushingEPA = 3 },
            priorRanks: nil, isFinal: true))
    #expect(final.scope == "2024 regular season, final · ranked among 32 teams")
}

// MARK: Overview selection

private func page(_ seasons: [TeamSeasonStats], ranks byYear: [Int: TeamStatsRanks])
    -> TeamStatsPage
{
    TeamStatsPage(
        team: Team(
            id: "rams", city: "Los Angeles", name: "Rams", abbrev: "LAR",
            conference: "NFC", division: "West",
            colors: TeamColors(primary: "#003594", secondary: "#FFA300", accent: "#FFA300"),
            logo: nil, logoDark: nil),
        seasons: seasons,
        upcomingSeason: nil,
        leagueRanksBySeason: byYear,
        currentSeason: 2026
    )
}

@Test func underTwoGamesCarriesLastSeasonsStoryOver() throws {
    let p = page(
        [
            season(2026, wins: 1, losses: 0, metrics: metrics(2026)),
            season(2025, metrics: metrics(2025)),
        ],
        ranks: [2026: ranks(1), 2025: ranks(16) { $0.defensiveSacks = 4 }])
    let overview = try #require(TeamSeasonStoryBuilder.overviewStory(page: p, selectedSeason: 2026))
    #expect(overview.isCarryover)
    #expect(overview.story.season == 2025)
    #expect(overview.story.isFinal)
    #expect(overview.story.headline == "A top-five pass rush.")
}

@Test func upcomingSeasonWithNoRowCarriesLastSeasonOver() throws {
    let p = page(
        [season(2026, metrics: metrics(2026))], ranks: [2026: ranks(16) { $0.rushingEPA = 3 }])
    let overview = try #require(TeamSeasonStoryBuilder.overviewStory(page: p, selectedSeason: 2027))
    #expect(overview.isCarryover)
    #expect(overview.story.season == 2026)
}

@Test func rankedSeasonTellsItsOwnStory() throws {
    let p = page(
        [season(2026, metrics: metrics(2026))], ranks: [2026: ranks(16) { $0.rushingEPA = 3 }])
    let overview = try #require(TeamSeasonStoryBuilder.overviewStory(page: p, selectedSeason: 2026))
    #expect(!overview.isCarryover)
    #expect(overview.story.lead.id == "rush-epa")
}

// MARK: Pace

private func schedule(_ year: Int, _ results: [ScheduleResult?], byeWeek: Int? = nil)
    -> TeamSchedule
{
    var week = 0
    var games: [ScheduleGame] = []
    for result in results {
        week += 1
        if week == byeWeek {
            games.append(
                ScheduleGame(
                    week: week, isBye: true, date: nil, isHome: false, opponent: nil,
                    teamScore: nil, opponentScore: nil, result: nil))
            week += 1
        }
        games.append(
            ScheduleGame(
                week: week, isBye: false, date: nil, isHome: true, opponent: nil,
                teamScore: nil, opponentScore: nil, result: result))
    }
    return TeamSchedule(season: year, games: games)
}

@Test func paceComparesTheSameNumberOfGamesSkippingByes() throws {
    let prior = schedule(
        2025, [.win, .loss, .win, .loss, .win, .loss, .win, .loss, .win, .win, .loss, .loss],
        byeWeek: 6)
    let pace = try #require(
        TeamSeasonPace.compare(season(2026, wins: 8, losses: 3), priorSchedule: prior))
    #expect(pace.games == 11)
    #expect(pace.priorRecord == "6-5")
    #expect(pace.winDelta == 2)
    #expect(pace.summary == "+2 wins on 2025 through 11 games (6-5)")
}

@Test func paceWordsLevelAndWorseRecords() throws {
    let prior = schedule(2025, Array(repeating: .win, count: 4) + [.loss])
    let worse = try #require(
        TeamSeasonPace.compare(season(2026, wins: 2, losses: 3), priorSchedule: prior))
    #expect(worse.summary == "2 fewer wins than 2025 through 5 games (4-1)")

    let level = try #require(
        TeamSeasonPace.compare(season(2026, wins: 4, losses: 1), priorSchedule: prior))
    #expect(level.lead == nil)
    #expect(level.summary == "Same record as 2025 through 5 games (4-1)")
}

@Test func paceSaysGameInTheSingular() throws {
    let prior = schedule(2025, [.loss, .win])
    let pace = try #require(
        TeamSeasonPace.compare(season(2026, wins: 1, losses: 0), priorSchedule: prior))
    #expect(pace.summary == "+1 win on 2025 through 1 game (0-1)")
}

@Test func paceIsAbsentWithoutALikeForLikeSample() {
    let short = schedule(2025, [.win, .win, nil, nil])
    #expect(TeamSeasonPace.compare(season(2026, wins: 2, losses: 1), priorSchedule: short) == nil)
    #expect(TeamSeasonPace.compare(season(2026, wins: 0, losses: 0), priorSchedule: short) == nil)
    let wrongYear = schedule(2023, [.win, .win, .win])
    #expect(
        TeamSeasonPace.compare(season(2026, wins: 2, losses: 1), priorSchedule: wrongYear) == nil)
}
