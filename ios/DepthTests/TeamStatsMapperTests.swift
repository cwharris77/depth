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
    pointDifferential: Int? = 111
) -> TeamStatsRowDTO {
    TeamStatsRowDTO(
        season: season,
        overallWins: overallWins, overallLosses: overallLosses, overallTies: overallTies,
        homeWins: homeWins, homeLosses: homeLosses,
        roadWins: roadWins, roadLosses: roadLosses,
        divisionWins: divisionWins, divisionLosses: divisionLosses,
        conferenceWins: conferenceWins, conferenceLosses: conferenceLosses,
        pointsFor: pointsFor, pointsAgainst: pointsAgainst, pointDifferential: pointDifferential
    )
}

private func team(id: String = "bills") -> Team {
    Team(
        id: id, city: "Buffalo", name: "Bills", abbrev: "BUF", conference: "AFC", division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a", uiAccent: "#d50a0a", onAccent: "#fff"),
        logo: nil, logoDark: nil
    )
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

@Test func nilColumnsMapToAZeroZeroRecordNotACrash() {
    // A stub/upcoming team_stats row (ingest can land one before kickoff) has every
    // stat column null — web renders "0-0" / "0 GAMES PLAYED", never a failure. The
    // `?? 0` fallbacks must produce that same shape without throwing.
    let stats = TeamStatsMapper.mapSeason(
        TeamStatsRowDTO(
            season: 2026, overallWins: nil, overallLosses: nil, overallTies: nil,
            homeWins: nil, homeLosses: nil, roadWins: nil, roadLosses: nil,
            divisionWins: nil, divisionLosses: nil, conferenceWins: nil, conferenceLosses: nil,
            pointsFor: nil, pointsAgainst: nil, pointDifferential: nil
        )
    )
    #expect(stats.season == 2026)
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