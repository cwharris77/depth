import Foundation
import Testing

@testable import Depth

// Pull-to-refresh wiring: a forced load must take the repository's fresh read, and a failed
// forced load must leave the content already on screen alone.

private func refreshTeam() -> Team {
    Team(
        id: "bills", city: "Buffalo", name: "Bills", abbrev: "BUF", conference: "AFC",
        division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a"),
        logo: nil, logoDark: nil)
}

private func refreshSchedule(games: Int) -> TeamSchedule {
    TeamSchedule(
        season: 2026,
        games: (1...games).map { week in
            ScheduleGame(
                week: week, isBye: false, date: "2026-09-\(10 + week)", isHome: true,
                opponent: refreshTeam(), teamScore: 24, opponentScore: 17, result: .win)
        })
}

private actor RefreshRepositoryFake: DepthRepository {
    var cachedSchedule: TeamSchedule
    var freshSchedule: Result<TeamSchedule, DepthError>
    var cachedStats: TeamStatsPage
    var freshStats: TeamStatsPage

    init(
        cachedSchedule: TeamSchedule = refreshSchedule(games: 1),
        freshSchedule: Result<TeamSchedule, DepthError> = .success(refreshSchedule(games: 2)),
        cachedSeason: Int = 2026, freshSeason: Int = 2027
    ) {
        self.cachedSchedule = cachedSchedule
        self.freshSchedule = freshSchedule
        cachedStats = TeamStatsPage(
            team: refreshTeam(), seasons: [], upcomingSeason: nil, currentSeason: cachedSeason)
        freshStats = TeamStatsPage(
            team: refreshTeam(), seasons: [], upcomingSeason: nil, currentSeason: freshSeason)
    }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { cachedSchedule }
    func teamStats(teamId: String) async throws -> TeamStatsPage { cachedStats }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }

    func freshTeamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        try freshSchedule.get()
    }
    func freshTeamStats(teamId: String) async throws -> TeamStatsPage { freshStats }
}

@Test func forcedScheduleLoadShowsTheFreshReadNotTheCachedOne() async {
    let viewModel = await ScheduleViewModel(teamId: "bills", repository: RefreshRepositoryFake())
    await viewModel.load()
    #expect(await viewModel.schedule?.games.count == 1)

    await viewModel.load(forceRefresh: true)

    #expect(await viewModel.schedule?.games.count == 2)
}

@Test func failedForcedScheduleLoadKeepsTheScheduleOnScreen() async {
    let repository = RefreshRepositoryFake(freshSchedule: .failure(.server("offline")))
    let viewModel = await ScheduleViewModel(teamId: "bills", repository: repository)
    await viewModel.load()

    await viewModel.load(forceRefresh: true)

    #expect(await viewModel.loadState == .loaded)
    #expect(await viewModel.schedule?.games.count == 1)
}

@Test func forcedStatsLoadShowsTheFreshReadNotTheCachedOne() async {
    let viewModel = await TeamStatsViewModel(teamId: "bills", repository: RefreshRepositoryFake())
    await viewModel.load()
    #expect(await viewModel.page?.currentSeason == 2026)

    await viewModel.load(forceRefresh: true)

    #expect(await viewModel.page?.currentSeason == 2027)
}
