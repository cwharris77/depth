import Foundation
import Testing
@testable import Depth

// Explicit mapper tests for the team-stats page conversion — every DTO → domain mapping,
// including the nil-column → 0-0-record degrade path (round-4 spec Testing: "malformed/
// missing season row → 0-0 record, not a crash", AGENTS.md invariant 6), plus the
// nfl-season date heuristic pinned against fixed dates (mirrors web's
// lib/utils/team/nfl-season.ts).

private func row(
    season: Int,
    overallWins: Int? = 12,
    overallLosses: Int? = 4,
    overallTies: Int? = 0,
    homeWins: Int? = 7,
    homeLosses: Int? = 2,
    roadWins: Int? = 5,
    roadLosses: Int? = 2,
    divisionWins: Int? = 3,
    divisionLosses: Int? = 1,
    conferenceWins: Int? = 8,
    conferenceLosses: Int? = 4,
    pointsFor: Int? = 402,
    pointsAgainst: Int? = 291,
    pointDifferential: Int? = 111,
    winPercent: Double? = 0.75,
    streak: String? = "W3",
    playoffSeed: Int? = 2
) -> TeamStatsRowDTO {
    TeamStatsRowDTO(
        season: season,
        overallWins: overallWins, overallLosses: overallLosses, overallTies: overallTies,
        homeWins: homeWins, homeLosses: homeLosses,
        roadWins: roadWins, roadLosses: roadLosses,
        divisionWins: divisionWins, divisionLosses: divisionLosses,
        conferenceWins: conferenceWins, conferenceLosses: conferenceLosses,
        pointsFor: pointsFor, pointsAgainst: pointsAgainst, pointDifferential: pointDifferential,
        winPercent: winPercent, streak: streak, playoffSeed: playoffSeed
    )
}

private func team(id: String = "bills") -> Team {
    Team(
        id: id, city: "Buffalo", name: "Bills", abbrev: "BUF", conference: "AFC", division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a"),
        logo: nil, logoDark: nil
    )
}

private func matchupRow(
    season: Int = 2025,
    passingYards: Int? = nil,
    rushingYards: Int? = nil,
    games: Int? = 17,
    attempts: Int? = 500,
    carries: Int? = 425,
    sacksSuffered: Int? = 25,
    passingEPA: Double? = 72,
    rushingEPA: Double? = 23,
    passingInterceptions: Int? = 10,
    fumblesLostTotal: Int? = 7,
    defensiveSacks: Double? = 42,
    quarterbackHits: Int? = 96,
    defensiveInterceptions: Int? = 16,
    defensiveFumbleRecoveries: Int? = 9,
    defensiveFumblesForced: Int? = 12,
    fieldGoalsMade: Int? = 30,
    fieldGoalsAttempted: Int? = 36,
    puntAttempts: Int? = 68,
    netPuntYards: Int? = 2_788,
    puntReturns: Int? = 34,
    puntReturnYards: Int? = 374,
    kickoffReturns: Int? = 24,
    kickoffReturnYards: Int? = 600,
    specialTeamsTouchdowns: Int? = 2
) -> TeamMatchupMetricsDTO {
    TeamMatchupMetricsDTO(
        season: season,
        updatedAt: "2026-08-23T12:00:00.000Z",
        passingYards: passingYards,
        rushingYards: rushingYards,
        games: games,
        attempts: attempts,
        carries: carries,
        sacksSuffered: sacksSuffered,
        passingEPA: passingEPA,
        rushingEPA: rushingEPA,
        passingInterceptions: passingInterceptions,
        fumblesLostTotal: fumblesLostTotal,
        defensiveSacks: defensiveSacks,
        quarterbackHits: quarterbackHits,
        defensiveInterceptions: defensiveInterceptions,
        defensiveFumbleRecoveries: defensiveFumbleRecoveries,
        defensiveFumblesForced: defensiveFumblesForced,
        fieldGoalsMade: fieldGoalsMade,
        fieldGoalsAttempted: fieldGoalsAttempted,
        puntAttempts: puntAttempts,
        netPuntYards: netPuntYards,
        puntReturns: puntReturns,
        puntReturnYards: puntReturnYards,
        kickoffReturns: kickoffReturns,
        kickoffReturnYards: kickoffReturnYards,
        specialTeamsTouchdowns: specialTeamsTouchdowns
    )
}

private struct MatchupMetricsFixtureCase: Decodable {
    let description: String
    let input: TeamMatchupMetricsDTO
    let expected: TeamMatchupMetrics
}

/// A fixed off-season date (Aug 2026) — upcoming season = 2026, currentSeason = 2026.
private func offseasonDate() -> Date {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    return calendar.date(from: DateComponents(year: 2026, month: 8, day: 15))!
}

@Test func mapsFullSeasonRow() {
    let stats = TeamStatsMapper.mapSeason(row(season: 2025))
    #expect(stats.season == 2025)
    #expect(stats.overallWins == 12)
    #expect(stats.overallLosses == 4)
    #expect(stats.overallTies == 0)
    #expect(stats.homeWins == 7)
    #expect(stats.roadLosses == 2)
    #expect(stats.divisionWins == 3)
    #expect(stats.conferenceLosses == 4)
    #expect(stats.pointsFor == 402)
    #expect(stats.pointsAgainst == 291)
    #expect(stats.pointDifferential == 111)
}

@Suite struct MatchupMetricsMapperTests {
    @Test func matchesTypeScriptDomainFixture() throws {
        let cases = try loadFixture(
            "matchup-metrics",
            as: [MatchupMetricsFixtureCase].self
        )

        for fixture in cases {
            let page = TeamStatsMapper.map(
                team: team(),
                rows: [row(season: fixture.input.season)],
                matchupRows: [fixture.input],
                now: offseasonDate()
            )
            #expect(page.seasons.first?.matchupMetrics == fixture.expected, "\(fixture.description)")
        }
    }

    @Test func mapsCompleteMatchupMetricsWithAuditableRates() {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            matchupRows: [matchupRow()],
            now: offseasonDate()
        )
        let metrics = page.seasons.first?.matchupMetrics

        #expect(metrics?.source == .nflverse)
        #expect(metrics?.season == 2025)
        #expect(metrics?.updatedAt == "2026-08-23T12:00:00.000Z")
        #expect(metrics?.offensiveEPA == 95)
        #expect(metrics?.offensivePlays == 950)
        #expect(metrics?.offensiveEPAPerPlay == 0.1)
        #expect(metrics?.giveaways == 17)
        #expect(metrics?.defensiveTakeaways == 25)
        #expect(metrics?.quarterbackHitsPerGame == 96.0 / 17.0)
        #expect(metrics?.fieldGoalPercentage == 30.0 / 36.0)
        #expect(metrics?.netPuntYardsPerAttempt == 41)
        #expect(metrics?.puntReturnYardsPerAttempt == 11)
        #expect(metrics?.kickoffReturnYardsPerAttempt == 25)
    }

    @Test func cachePayloadRoundTripPreservesMatchupMetrics() throws {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            matchupRows: [matchupRow()],
            now: offseasonDate()
        )

        let payload = try JSONEncoder().encode(page)
        let decoded = try JSONDecoder().decode(TeamStatsPage.self, from: payload)

        #expect(decoded == page)
        #expect(decoded.seasons.first?.matchupMetrics?.offensiveEPAPerPlay == 0.1)
    }

    @Test func cachePayloadWrittenBeforeMatchupMetricsStillDecodes() throws {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            matchupRows: [matchupRow()],
            now: offseasonDate()
        )
        let payload = try JSONEncoder().encode(page)
        var object = try #require(JSONSerialization.jsonObject(with: payload) as? [String: Any])
        var seasons = try #require(object["seasons"] as? [[String: Any]])
        seasons[0].removeValue(forKey: "matchupMetrics")
        object["seasons"] = seasons

        let legacyPayload = try JSONSerialization.data(withJSONObject: object)
        let decoded = try JSONDecoder().decode(TeamStatsPage.self, from: legacyPayload)

        #expect(decoded.seasons.first?.season == 2025)
        #expect(decoded.seasons.first?.matchupMetrics == nil)
    }

    @Test func partialMatchupMetricsStayUnavailableInsteadOfBecomingZero() {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            matchupRows: [
                matchupRow(
                    carries: nil,
                    rushingEPA: nil,
                    fumblesLostTotal: nil,
                    defensiveFumbleRecoveries: nil,
                    fieldGoalsAttempted: nil,
                    puntAttempts: 0,
                    netPuntYards: 0
                )
            ],
            now: offseasonDate()
        )
        let metrics = page.seasons.first?.matchupMetrics

        #expect(metrics?.offensiveEPA == nil)
        #expect(metrics?.offensivePlays == nil)
        #expect(metrics?.offensiveEPAPerPlay == nil)
        #expect(metrics?.giveaways == nil)
        #expect(metrics?.defensiveTakeaways == nil)
        #expect(metrics?.fieldGoalPercentage == nil)
        #expect(metrics?.netPuntYardsPerAttempt == nil)
    }

    @Test func missingMatchupRowLeavesTheSeasonMetricsAbsent() {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            matchupRows: [],
            now: offseasonDate()
        )

        #expect(page.seasons.first?.matchupMetrics == nil)
    }

    @Test func matchupLeaderLabelDegradesWhenEitherSideIsMissing() {
        #expect(matchupLeaderLabel(
            teamALabel: "Seattle", valueA: nil,
            teamBLabel: "San Francisco", valueB: 0.03,
            metricLabel: "offensive EPA/play"
        ) == nil)
    }

    @Test func matchupLeaderLabelSupportsLowerIsBetterMetrics() {
        #expect(matchupLeaderLabel(
            teamALabel: "Seattle", valueA: 12,
            teamBLabel: "San Francisco", valueB: 17,
            metricLabel: "giveaways",
            direction: .lower
        ) == "Seattle leads in giveaways")
    }

    @Test func matchupComparisonKeepsBothValuesBesideTheLeaderLabel() {
        let comparison = compareMatchupMetric(
            teamALabel: "Seattle", valueA: 12,
            teamBLabel: "San Francisco", valueB: 17,
            metricLabel: "giveaways",
            direction: .lower
        )

        #expect(comparison.teamAValue == 12)
        #expect(comparison.teamBValue == 17)
        #expect(comparison.leaderLabel == "Seattle leads in giveaways")
    }

    @Test func partialMatchupComparisonHasNoLeaderLabel() {
        let comparison = compareMatchupMetric(
            teamALabel: "Seattle", valueA: nil,
            teamBLabel: "San Francisco", valueB: 0.03,
            metricLabel: "offensive EPA/play"
        )

        #expect(comparison.teamAValue == nil)
        #expect(comparison.teamBValue == 0.03)
        #expect(comparison.leaderLabel == nil)
    }
}

@Test func nilColumnsMapToAZeroZeroRecordNotACrash() {
    // A stub/upcoming team_stats row (ingest can land one before kickoff) has every
    // stat column null — web renders "0-0" / "0 GAMES PLAYED", never a failure. The
    // `?? 0` fallbacks must produce that same shape without throwing.
    let stats = TeamStatsMapper.mapSeason(
        TeamStatsRowDTO(
            season: 2026, overallWins: nil, overallLosses: nil, overallTies: nil,
            homeWins: nil, homeLosses: nil, roadWins: nil, roadLosses: nil,
            divisionWins: nil, divisionLosses: nil, conferenceWins: nil, conferenceLosses: nil,
            pointsFor: nil, pointsAgainst: nil, pointDifferential: nil,
            winPercent: nil, streak: nil, playoffSeed: nil
        )
    )
    #expect(stats.season == 2026)
    // A stub row also carries no streak/seed/win% — they stay absent, not zeroed.
    #expect(stats.streak == nil)
    #expect(stats.playoffSeed == nil)
    #expect(stats.winPercent == nil)
    #expect(stats.overallWins == 0)
    #expect(stats.overallLosses == 0)
    #expect(stats.overallTies == 0)
    #expect(stats.pointDifferential == 0)
}

@Test func seasonsAreOrderedNewestFirst() {
    let page = TeamStatsMapper.map(
        team: team(),
        rows: [row(season: 2023), row(season: 2025), row(season: 2024)],
        now: offseasonDate()
    )
    #expect(page.seasons.map(\.season) == [2025, 2024, 2023])
}

@Test func offseasonExposesAnUpcomingSeasonAndCurrentSeason() {
    let page = TeamStatsMapper.map(team: team(), rows: [row(season: 2025)], now: offseasonDate())
    #expect(page.upcomingSeason == 2026)
    #expect(page.currentSeason == 2026)
    #expect(page.seasons.first?.season == 2025)
}

@Test func emptySeasonListIsValidForAnUnknownTeam() {
    let page = TeamStatsMapper.map(team: team(), rows: [], now: offseasonDate())
    #expect(page.seasons.isEmpty)
    #expect(page.upcomingSeason == 2026, "an empty list still carries the off-season chip")
}

@Test func inSeasonHidesUpcomingSeasonAndRollsCurrentSeasonToPlayingYear() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    let october = calendar.date(from: DateComponents(year: 2026, month: 10, day: 4))!

    let page = TeamStatsMapper.map(team: team(), rows: [row(season: 2026)], now: october)
    #expect(page.upcomingSeason == nil, "no upcoming chip while in-season")
    #expect(page.currentSeason == 2026, "Sep–Dec of 2026 is the 2026 season")
}

@Test func januaryStillReportsThePriorSeasonAsCompleted() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    let january = calendar.date(from: DateComponents(year: 2027, month: 1, day: 15))!

    let state = TeamStatsMapper.nflSeasonState(now: january)
    #expect(state.completedSeason == 2026)
    #expect(state.upcomingSeason == 2027)
    #expect(state.isOffseason == false)
}

// MARK: - Web-parity fields and league ranks

private func rankRow(
    _ teamId: String,
    season: Int = 2025,
    winPercent: Double? = nil,
    pointsFor: Int? = nil,
    pointsAgainst: Int? = nil,
    pointDifferential: Int? = nil
) -> TeamStatsRankDTO {
    TeamStatsRankDTO(
        teamId: teamId, season: season, winPercent: winPercent,
        pointsFor: pointsFor, pointsAgainst: pointsAgainst,
        pointDifferential: pointDifferential
    )
}

/// Every metric column defaults to nil, so a test names only the columns its metric
/// reads and every other rank is legitimately absent.
private func metricRankRow(
    _ teamId: String,
    season: Int = 2025,
    passingYards: Int? = nil,
    rushingYards: Int? = nil,
    games: Int? = nil,
    attempts: Int? = nil,
    carries: Int? = nil,
    sacksSuffered: Int? = nil,
    passingEPA: Double? = nil,
    rushingEPA: Double? = nil,
    passingInterceptions: Int? = nil,
    fumblesLostTotal: Int? = nil,
    defensiveSacks: Double? = nil,
    quarterbackHits: Int? = nil,
    defensiveInterceptions: Int? = nil,
    defensiveFumbleRecoveries: Int? = nil,
    fieldGoalsMade: Int? = nil,
    fieldGoalsAttempted: Int? = nil,
    puntAttempts: Int? = nil,
    netPuntYards: Int? = nil,
    puntReturns: Int? = nil,
    puntReturnYards: Int? = nil,
    kickoffReturns: Int? = nil,
    kickoffReturnYards: Int? = nil
) -> TeamSeasonStatsRankDTO {
    TeamSeasonStatsRankDTO(
        teamId: teamId, season: season, passingYards: passingYards, rushingYards: rushingYards,
        games: games, attempts: attempts, carries: carries, sacksSuffered: sacksSuffered,
        passingEPA: passingEPA, rushingEPA: rushingEPA,
        passingInterceptions: passingInterceptions, fumblesLostTotal: fumblesLostTotal,
        defensiveSacks: defensiveSacks, quarterbackHits: quarterbackHits,
        defensiveInterceptions: defensiveInterceptions,
        defensiveFumbleRecoveries: defensiveFumbleRecoveries,
        fieldGoalsMade: fieldGoalsMade, fieldGoalsAttempted: fieldGoalsAttempted,
        puntAttempts: puntAttempts, netPuntYards: netPuntYards,
        puntReturns: puntReturns, puntReturnYards: puntReturnYards,
        kickoffReturns: kickoffReturns, kickoffReturnYards: kickoffReturnYards
    )
}

@Suite struct TeamStatsParityFieldTests {
    @Test func exposesAnIncomingCoachDuringTheOffseason() {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            incomingCoach: TeamIncomingCoach(name: "Ben Johnson"),
            now: offseasonDate()
        )

        #expect(page.incomingCoach == TeamIncomingCoach(name: "Ben Johnson"))
    }

    @Test func mapsStreakSeedWinPercentAndSeasonScopedCoach() {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025), row(season: 2024)],
            coachRows: [TeamCoachSeasonDTO(season: 2025, coachName: "Sean McDermott", coachExperience: 9)],
            now: offseasonDate()
        )
        let current = page.seasons.first
        #expect(current?.streak == "W3")
        #expect(current?.playoffSeed == 2)
        #expect(current?.winPercent == 0.75)
        #expect(current?.coach == TeamSeasonCoach(name: "Sean McDermott", experience: 9))
        // The coach is season-scoped: 2024 has no curated row, so it has no coach rather
        // than inheriting 2025's.
        #expect(page.seasons.last?.coach == nil)
    }

    @Test func absentStreakAndSeedStayNilInsteadOfBecomingZero() {
        // playoffSeed 0 means "missed the playoffs" — a `?? 0` here would turn a missing
        // column into that claim.
        let stats = TeamStatsMapper.mapSeason(row(season: 2025, streak: nil, playoffSeed: nil))
        #expect(stats.streak == nil)
        #expect(stats.playoffSeed == nil)
    }

    @Test func carriesPassAndRushYardsFromTheMatchupRow() {
        let page = TeamStatsMapper.map(
            team: team(),
            rows: [row(season: 2025)],
            matchupRows: [matchupRow(season: 2025)],
            now: offseasonDate()
        )
        // matchupRow's defaults leave the yardage columns nil, so the season carries no
        // yardage rather than zero.
        #expect(page.seasons.first?.passingYards == nil)
        #expect(page.seasons.first?.rushingYards == nil)
    }
}

@Suite struct TeamLeagueRanksTests {
    private let espn = [
        rankRow("bills", winPercent: 0.75, pointsFor: 402, pointsAgainst: 291, pointDifferential: 111),
        rankRow("chiefs", winPercent: 0.88, pointsFor: 430, pointsAgainst: 280, pointDifferential: 150),
        rankRow("jets", winPercent: 0.25, pointsFor: 250, pointsAgainst: 400, pointDifferential: -150),
    ]

    private func ranks(_ rows: [TeamSeasonStatsRankDTO]) -> TeamStatsRanks? {
        TeamStatsMapper.mapRanks(teamId: "bills", recordRows: espn, metricRows: rows)[2025]
    }

    @Test func ranksRecordMetricsWithPointsAgainstAscending() {
        let result = ranks([])
        #expect(result?.winPercent == 2)
        #expect(result?.pointsFor == 2)
        // Fewer points allowed is better, so the Bills' 291 is 2nd best, not 2nd most.
        #expect(result?.pointsAgainst == 2)
        #expect(result?.pointDifferential == 2)
    }

    @Test func ranksHigherIsBetterMetrics() {
        let result = ranks([
            metricRankRow("bills", passingEPA: 30, rushingEPA: 10, defensiveSacks: 44),
            metricRankRow("chiefs", passingEPA: 45, rushingEPA: 5, defensiveSacks: 50),
            metricRankRow("jets", passingEPA: 15, rushingEPA: 1, defensiveSacks: 30),
        ])
        #expect(result?.passingEPA == 2)
        #expect(result?.rushingEPA == 1)
        #expect(result?.defensiveSacks == 2)
    }

    @Test func ranksLowerIsBetterMetricsAscending() {
        let result = ranks([
            metricRankRow("bills", attempts: 600, sacksSuffered: 30, passingInterceptions: 9, fumblesLostTotal: 5),
            metricRankRow("chiefs", attempts: 600, sacksSuffered: 20, passingInterceptions: 6, fumblesLostTotal: 9),
            metricRankRow("jets", attempts: 600, sacksSuffered: 50, passingInterceptions: 15, fumblesLostTotal: 12),
        ])
        // Fewer is better for all three.
        #expect(result?.sackRate == 2)
        #expect(result?.passingInterceptions == 2)
        #expect(result?.fumblesLost == 1)
    }

    @Test func ranksDerivedMetrics() {
        let result = ranks([
            metricRankRow(
                "bills", games: 17, attempts: 600, carries: 380, sacksSuffered: 20,
                passingEPA: 30, rushingEPA: 10, passingInterceptions: 9, fumblesLostTotal: 5,
                quarterbackHits: 102, defensiveInterceptions: 12, defensiveFumbleRecoveries: 8,
                fieldGoalsMade: 28, fieldGoalsAttempted: 32
            ),
            metricRankRow(
                "chiefs", games: 17, attempts: 600, carries: 380, sacksSuffered: 20,
                passingEPA: 45, rushingEPA: 15, passingInterceptions: 6, fumblesLostTotal: 9,
                quarterbackHits: 68, defensiveInterceptions: 10, defensiveFumbleRecoveries: 4,
                fieldGoalsMade: 30, fieldGoalsAttempted: 32
            ),
            metricRankRow(
                "jets", games: 17, attempts: 600, carries: 380, sacksSuffered: 20,
                passingEPA: 15, rushingEPA: 5, passingInterceptions: 15, fumblesLostTotal: 12,
                quarterbackHits: 136, defensiveInterceptions: 20, defensiveFumbleRecoveries: 6,
                fieldGoalsMade: 20, fieldGoalsAttempted: 32
            ),
        ])
        #expect(result?.offensiveEPAPerPlay == 2)
        #expect(result?.quarterbackHitsPerGame == 2)
        // bills 12+8=20, chiefs 10+4=14, jets 20+6=26 — the Jets lead.
        #expect(result?.defensiveTakeaways == 2)
        #expect(result?.fieldGoalPercentage == 2)
        // bills (12+8)-(9+5) = +6; chiefs (10+4)-(6+9) = -1; jets (20+6)-(15+12) = -1
        #expect(result?.turnoverMargin == 1)
    }

    @Test func tiedTeamsShareARank() {
        let result = ranks([
            metricRankRow("bills", defensiveSacks: 44),
            metricRankRow("chiefs", defensiveSacks: 44),
            metricRankRow("jets", defensiveSacks: 30),
        ])
        #expect(result?.defensiveSacks == 1)
    }

    @Test func omitsARankWhenTheTeamIsMissingAColumnItNeeds() {
        // The Bills have attempts but no sacks, so their sack rate is unknown — not 0%,
        // which would rank them first in the league.
        let result = ranks([
            metricRankRow("bills", attempts: 600),
            metricRankRow("chiefs", attempts: 600, sacksSuffered: 20),
            metricRankRow("jets", attempts: 600, sacksSuffered: 50),
        ])
        #expect(result?.sackRate == nil)
    }

    @Test func omitsARankOnAZeroDenominator() {
        let result = ranks([
            metricRankRow("bills", fieldGoalsMade: 0, fieldGoalsAttempted: 0),
            metricRankRow("chiefs", fieldGoalsMade: 30, fieldGoalsAttempted: 32),
        ])
        #expect(result?.fieldGoalPercentage == nil)
    }

    @Test func omitsTurnoverMarginWhenOnlyOneHalfIsKnown() {
        let result = ranks([
            metricRankRow("bills", defensiveInterceptions: 12, defensiveFumbleRecoveries: 8),
            metricRankRow(
                "chiefs", passingInterceptions: 6, fumblesLostTotal: 9,
                defensiveInterceptions: 10, defensiveFumbleRecoveries: 4
            ),
        ])
        #expect(result?.turnoverMargin == nil)
    }

    @Test func producesNoRanksWhenTheRecordReadIsEmpty() {
        #expect(TeamStatsMapper.mapRanks(teamId: "bills", recordRows: [], metricRows: []).isEmpty)
    }

    @Test func cachedPageWrittenBeforeRanksExistedStillDecodes() throws {
        // The cache is disposable, but a decode failure costs a live refetch on every
        // launch until it is wiped — so every field added here must be defaulted.
        let legacy = """
        {"team":{"id":"bills","city":"Buffalo","name":"Bills","abbrev":"BUF",
        "conference":"AFC","division":"East","colors":{"primary":"#00338d",
        "secondary":"#d50a0a","accent":"#d50a0a"}},
        "seasons":[],"currentSeason":2026}
        """.data(using: .utf8)!
        let page = try JSONDecoder().decode(TeamStatsPage.self, from: legacy)
        #expect(page.leagueRanksBySeason.isEmpty)
        #expect(page.seasons.isEmpty)
    }
}
