import Foundation
import Testing
@testable import Depth

// Schedule behavior translated from the web oracle: regular-season games only, one
// resolved card per week (including byes), and scores always from the selected team's
// perspective. Each expectation here is hand-derived from the fixtures below.

private func scheduleTeam(id: String, abbrev: String) -> Team {
    Team(
        id: id, city: id.capitalized, name: "Team", abbrev: abbrev,
        conference: "AFC", division: "East",
        colors: TeamColors(
            primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a",
            uiAccent: "#d50a0a", onAccent: "#ffffff"
        ),
        logo: nil, logoDark: nil
    )
}

private func scheduleGame(
    id: String,
    week: Int?,
    gameType: String = "REG",
    homeTeamId: String,
    awayTeamId: String,
    homeScore: Int? = nil,
    awayScore: Int? = nil,
    gameday: String? = "2025-09-07"
) -> GameDTO {
    GameDTO(
        gameId: id, season: 2025, gameType: gameType, week: week, gameday: gameday,
        homeTeamId: homeTeamId, awayTeamId: awayTeamId, homeScore: homeScore,
        awayScore: awayScore
    )
}

@Test func mapsPlayedAwayGameFromSelectedTeamsPerspective() throws {
    let schedule = ScheduleDTO(teamId: "bills", season: 2025)
    let game = scheduleGame(
        id: "2025_01_BUF_NYJ", week: 1, homeTeamId: "jets", awayTeamId: "bills",
        homeScore: 17, awayScore: 24
    )

    let result = try ScheduleMapper.map(
        schedule: schedule,
        games: [game],
        teamsById: ["jets": scheduleTeam(id: "jets", abbrev: "NYJ")]
    )

    #expect(result.games.count == 1)
    #expect(result.games[0].opponent?.abbrev == "NYJ")
    #expect(result.games[0].isHome == false)
    #expect(result.games[0].teamScore == 24)
    #expect(result.games[0].opponentScore == 17)
    #expect(result.games[0].result == .win)
}

@Test func resolutionFillsMissingRegularSeasonWeekAsByeAndExcludesPostseason() throws {
    let schedule = ScheduleDTO(teamId: "bills", season: 2025)
    let games = [
        scheduleGame(id: "week-1", week: 1, homeTeamId: "bills", awayTeamId: "jets"),
        scheduleGame(id: "week-3", week: 3, homeTeamId: "bills", awayTeamId: "dolphins"),
        scheduleGame(
            id: "wild-card", week: 2, gameType: "WC", homeTeamId: "bills", awayTeamId: "jets"
        ),
    ]

    let result = try ScheduleMapper.map(
        schedule: schedule,
        games: games,
        teamsById: [
            "jets": scheduleTeam(id: "jets", abbrev: "NYJ"),
            "dolphins": scheduleTeam(id: "dolphins", abbrev: "MIA"),
        ]
    )

    #expect(result.games.map(\.week) == [1, 2, 3])
    #expect(result.games[1].isBye == true)
    #expect(result.games[1].opponent == nil)
}

@Test func viewModelMarksASelectedEarlierSeasonAsPastForNullResults() async {
    let current = TeamSchedule(
        season: 2025,
        games: [
            ScheduleGame(
                week: 1, isBye: false, date: "2025-09-07", isHome: true,
                opponent: scheduleTeam(id: "jets", abbrev: "NYJ"), teamScore: nil,
                opponentScore: nil, result: nil
            ),
        ]
    )
    let past = TeamSchedule(
        season: 2024,
        games: [
            ScheduleGame(
                week: 1, isBye: false, date: "2024-09-08", isHome: false,
                opponent: scheduleTeam(id: "jets", abbrev: "NYJ"), teamScore: nil,
                opponentScore: nil, result: nil
            ),
        ]
    )
    let repository = ScheduleRepositoryFake(
        schedules: [nil: .success(current), 2024: .success(past)]
    )
    let viewModel = await ScheduleViewModel(teamId: "bills", repository: repository)

    await viewModel.load()
    #expect(await viewModel.isPastSeason == false)

    await viewModel.selectSeason(2024)
    #expect(await viewModel.loadState == .loaded)
    #expect(await viewModel.isPastSeason == true)
    #expect(await viewModel.schedule?.games[0].result == nil)
}

private actor ScheduleRepositoryFake: DepthRepository {
    let schedules: [Int?: Result<TeamSchedule, DepthError>]

    init(schedules: [Int?: Result<TeamSchedule, DepthError>]) {
        self.schedules = schedules
    }

    func teams() async throws -> [Team] { [] }

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        guard let result = schedules[season] else { throw DepthError.notFound }
        return try result.get()
    }

    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }
}
