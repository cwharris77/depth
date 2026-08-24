import Foundation
import Testing
@testable import Depth

// DEP-245: the Stats page's "Back to current" affordance. The view model must tell the
// view when a completed past season is selected (vs. the current/upcoming tab) and
// return to the current season on demand — the same one-tap contract the roster's
// existing "Back to today" (`HistoryViewModel.selectImmediately(.current(...))`) has.

private func statsTeam() -> Team {
    Team(
        id: "bills", city: "Buffalo", name: "Bills", abbrev: "BUF",
        conference: "AFC", division: "East",
        colors: TeamColors(
            primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a",
            uiAccent: "#d50a0a", onAccent: "#ffffff"
        ),
        logo: nil, logoDark: nil
    )
}

private func statsSeason(_ season: Int) -> TeamSeasonStats {
    TeamSeasonStats(
        season: season,
        overallWins: 12, overallLosses: 4, overallTies: 0,
        homeWins: 7, homeLosses: 2,
        roadWins: 5, roadLosses: 2,
        divisionWins: 3, divisionLosses: 1,
        conferenceWins: 8, conferenceLosses: 4,
        pointsFor: 402, pointsAgainst: 291, pointDifferential: 111,
        matchupMetrics: nil
    )
}

private func statsPage(
    seasons: [Int] = [2025, 2024, 2023],
    upcomingSeason: Int? = nil
) -> TeamStatsPage {
    TeamStatsPage(
        team: statsTeam(),
        seasons: seasons.map(statsSeason),
        upcomingSeason: upcomingSeason,
        currentSeason: 2025
    )
}

private actor StatsRepositoryFake: DepthRepository {
    let page: TeamStatsPage

    init(page: TeamStatsPage) { self.page = page }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func teamStats(teamId: String) async throws -> TeamStatsPage { page }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }
}

@Test func pastSeasonSelectionFlagsBackToCurrentAndReturnsOnDemand() async {
    let viewModel = await TeamStatsViewModel(teamId: "bills", repository: StatsRepositoryFake(page: statsPage()))
    await viewModel.load()

    // Defaults to the newest real season (web parity) — the current tab, no escape needed.
    #expect(await viewModel.selectedSeason == 2025)
    #expect(await viewModel.isViewingPastSeason == false)

    await viewModel.selectSeason(2024)
    #expect(await viewModel.isViewingPastSeason == true)

    await viewModel.backToCurrentSeason()
    #expect(await viewModel.selectedSeason == 2025)
    #expect(await viewModel.isViewingPastSeason == false)
}

@Test func upcomingSeasonIsTheBackToCurrentTargetDuringOffSeason() async {
    let viewModel = await TeamStatsViewModel(
        teamId: "bills", repository: StatsRepositoryFake(page: statsPage(upcomingSeason: 2026))
    )
    await viewModel.load()

    // Web parity: the newest real season is the initial tab even during the off-season,
    // so it is already a "past" selection with a back-to-current escape to the 2026 chip.
    #expect(await viewModel.selectedSeason == 2025)
    #expect(await viewModel.currentSeason == 2026)
    #expect(await viewModel.isViewingPastSeason == true)

    await viewModel.backToCurrentSeason()
    #expect(await viewModel.selectedSeason == 2026)
    #expect(await viewModel.isViewingPastSeason == false)
}

@Test func backToCurrentIsAStrictlyLocalSelectionWithNoRefetch() async {
    let repository = StatsRepositoryFake(page: statsPage())
    let viewModel = await TeamStatsViewModel(teamId: "bills", repository: repository)
    await viewModel.load()

    await viewModel.selectSeason(2023)
    await viewModel.backToCurrentSeason()

    // Selecting "current" is pure state — it never re-reads team_stats (cheaper than
    // web, which refetches on every tab switch).
    #expect(await viewModel.selectedSeason == 2025)
    #expect(await viewModel.loadState == .loaded)
}
