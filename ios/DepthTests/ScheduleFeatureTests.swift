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
            primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a"
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
    gameday: String? = "2025-09-07",
    location: String? = "Home",
    awayMoneyline: Double? = nil,
    homeMoneyline: Double? = nil,
    spreadLine: Double? = nil,
    awaySpreadOdds: Double? = nil,
    homeSpreadOdds: Double? = nil,
    totalLine: Double? = nil,
    underOdds: Double? = nil,
    overOdds: Double? = nil,
    marketUpdatedAt: String? = nil
) -> GameDTO {
    GameDTO(
        gameId: id, season: 2025, gameType: gameType, week: week, gameday: gameday,
        homeTeamId: homeTeamId, awayTeamId: awayTeamId, homeScore: homeScore,
        awayScore: awayScore, location: location, awayMoneyline: awayMoneyline,
        homeMoneyline: homeMoneyline, spreadLine: spreadLine,
        awaySpreadOdds: awaySpreadOdds, homeSpreadOdds: homeSpreadOdds,
        totalLine: totalLine, underOdds: underOdds, overOdds: overOdds,
        marketUpdatedAt: marketUpdatedAt
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
    #expect(result.games[0].market == nil)
}

@Test func decodesScheduleAndGameDTOsFromSnakeCasePayloads() throws {
    let scheduleData = Data("""
    { "team_id": "bills", "season": 2025 }
    """.utf8)
    let gameData = Data("""
    {
      "game_id": "2025_01_BUF_NYJ", "season": 2025, "game_type": "REG", "week": 1,
      "gameday": "2025-09-07", "home_team_id": "bills", "away_team_id": "jets",
      "home_score": 20, "away_score": 20, "location": "Neutral",
      "away_moneyline": 110, "home_moneyline": -130, "spread_line": 2.5,
      "away_spread_odds": -108, "home_spread_odds": -112, "total_line": 44.5,
      "under_odds": -105, "over_odds": -115,
      "market_updated_at": "2026-08-24T20:00:00.000Z"
    }
    """.utf8)

    let schedule = try JSONDecoder().decode(ScheduleDTO.self, from: scheduleData)
    let game = try JSONDecoder().decode(GameDTO.self, from: gameData)

    #expect(schedule.teamId == "bills")
    #expect(schedule.season == 2025)
    #expect(game.gameId == "2025_01_BUF_NYJ")
    #expect(game.gameType == "REG")
    #expect(game.homeTeamId == "bills")
    #expect(game.awayTeamId == "jets")
    #expect(game.homeScore == 20)
    #expect(game.awayScore == 20)
    #expect(game.location == "Neutral")
    #expect(game.awayMoneyline == 110)
    #expect(game.homeMoneyline == -130)
    #expect(game.spreadLine == 2.5)
    #expect(game.marketUpdatedAt == "2026-08-24T20:00:00.000Z")
}

@Test func mapsMarketFromSelectedAwayTeamsPerspectiveAndRemovesVig() throws {
    let result = try ScheduleMapper.map(
        schedule: ScheduleDTO(teamId: "bills", season: 2025),
        games: [
            scheduleGame(
                id: "market", week: 1, homeTeamId: "jets", awayTeamId: "bills",
                location: "Neutral", awayMoneyline: 110, homeMoneyline: -130,
                spreadLine: 2.5, awaySpreadOdds: -108, homeSpreadOdds: -112,
                totalLine: 44.5, underOdds: -105, overOdds: -115,
                marketUpdatedAt: "2026-08-24T20:00:00.000Z"
            ),
        ],
        teamsById: ["jets": scheduleTeam(id: "jets", abbrev: "NYJ")]
    )

    let market = try #require(result.games[0].market)
    #expect(market.teamMoneyline == 110)
    #expect(market.opponentMoneyline == -130)
    #expect(market.teamSpread == 2.5)
    #expect(market.teamSpreadOdds == -108)
    #expect(market.opponentSpreadOdds == -112)
    #expect(market.totalLine == 44.5)
    #expect(market.underOdds == -105)
    #expect(market.overOdds == -115)
    #expect(abs(try #require(market.impliedWinProbability) - 0.457256) < 0.000001)
    #expect(market.favoriteTeamId == "jets")
    #expect(market.isPickEm == false)
    #expect(market.isNeutralSite == true)
    #expect(market.source == .nflverse)
    #expect(market.updatedAt == "2026-08-24T20:00:00.000Z")
}

@Test func mapsPickEmWithoutFavoriteAndMissingSideWithoutProbability() throws {
    let result = try ScheduleMapper.map(
        schedule: ScheduleDTO(teamId: "bills", season: 2025),
        games: [
            scheduleGame(
                id: "pick-em", week: 1, homeTeamId: "bills", awayTeamId: "jets",
                homeMoneyline: -110, spreadLine: 0, awaySpreadOdds: -110,
                homeSpreadOdds: -110, totalLine: 42.5,
                marketUpdatedAt: "2026-08-24T20:00:00.000Z"
            ),
        ],
        teamsById: ["jets": scheduleTeam(id: "jets", abbrev: "NYJ")]
    )

    let market = try #require(result.games[0].market)
    #expect(market.teamSpread == 0)
    #expect(market.favoriteTeamId == nil)
    #expect(market.isPickEm == true)
    #expect(market.impliedWinProbability == nil)
}

@Test func mapsHomeTieFromSelectedTeamsPerspective() throws {
    let result = try ScheduleMapper.map(
        schedule: ScheduleDTO(teamId: "bills", season: 2025),
        games: [
            scheduleGame(
                id: "home-tie", week: 1, homeTeamId: "bills", awayTeamId: "jets",
                homeScore: 20, awayScore: 20
            ),
        ],
        teamsById: ["jets": scheduleTeam(id: "jets", abbrev: "NYJ")]
    )

    #expect(result.games[0].isHome == true)
    #expect(result.games[0].teamScore == 20)
    #expect(result.games[0].opponentScore == 20)
    #expect(result.games[0].result == .tie)
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

@Test func invalidWeekProducesTypedDecodingError() {
    #expect(throws: DepthError.decoding("game bad-week: invalid week 0")) {
        try ScheduleMapper.map(
            schedule: ScheduleDTO(teamId: "bills", season: 2025),
            games: [scheduleGame(id: "bad-week", week: 0, homeTeamId: "bills", awayTeamId: "jets")],
            teamsById: ["jets": scheduleTeam(id: "jets", abbrev: "NYJ")]
        )
    }
}

@Test func missingOpponentProducesTypedDecodingError() {
    #expect(throws: DepthError.decoding("game missing-opponent: missing opponent jets")) {
        try ScheduleMapper.map(
            schedule: ScheduleDTO(teamId: "bills", season: 2025),
            games: [scheduleGame(id: "missing-opponent", week: 1, homeTeamId: "bills", awayTeamId: "jets")],
            teamsById: [:]
        )
    }
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

@Test func failedHistoricalLoadKeepsSeasonPickerVisibleAndCanRecover() async {
    let current = testSchedule(season: 2025)
    let repository = ScheduleRepositoryFake(
        schedules: [
            nil: .success(current),
            2024: .failure(.offline),
            2025: .success(current),
        ]
    )
    let viewModel = await ScheduleViewModel(teamId: "bills", repository: repository)

    await viewModel.load()
    await viewModel.selectSeason(2024)

    #expect(await viewModel.loadState == .failed(.offline))
    #expect(await viewModel.selectedSeason == 2024)
    #expect(await viewModel.showsSeasonPicker == true)

    await viewModel.selectSeason(2025)

    #expect(await viewModel.loadState == .loaded)
    #expect(await viewModel.selectedSeason == 2025)
    #expect(await viewModel.schedule?.season == 2025)
}

@Test func delayedOlderSeasonCannotOverwriteNewerSelection() async {
    let current = testSchedule(season: 2025)
    let older = testSchedule(season: 2024)
    let newer = testSchedule(season: 2023)
    let repository = DelayedScheduleRepository(defaultSchedule: current)
    let viewModel = await ScheduleViewModel(teamId: "bills", repository: repository)

    await viewModel.load()
    let firstSelection = Task { @MainActor in await viewModel.selectSeason(2024) }
    await repository.waitForRequest(season: 2024)

    let secondSelection = Task { @MainActor in await viewModel.selectSeason(2023) }
    await repository.waitForRequest(season: 2023)
    await repository.complete(season: 2023, with: newer)
    await secondSelection.value

    await repository.complete(season: 2024, with: older)
    await firstSelection.value

    #expect(await viewModel.selectedSeason == 2023)
    #expect(await viewModel.schedule?.season == 2023)
}

// DEP-254: the view already tracks whether a past season is selected and exposes
// selectSeason(_:) — the "Back to current" button's contract is that isPastSeason flips
// true once a past season is chosen and that selecting defaultSeason is the one-tap
// return, the same path the picker itself uses.
@Test func backToCurrentReturnsToTheDefaultSeason() async {
    let current = testSchedule(season: 2025)
    let past = testSchedule(season: 2024)
    let repository = ScheduleRepositoryFake(
        schedules: [nil: .success(current), 2024: .success(past), 2025: .success(current)]
    )
    let viewModel = await ScheduleViewModel(teamId: "bills", repository: repository)

    await viewModel.load()
    #expect(await viewModel.selectedSeason == 2025)
    #expect(await viewModel.isPastSeason == false)

    guard let defaultSeason = await viewModel.defaultSeason else {
        Issue.record("defaultSeason should resolve from the first load")
        return
    }

    await viewModel.selectSeason(2024)
    #expect(await viewModel.isPastSeason == true)
    #expect(await viewModel.schedule?.season == 2024)

    // The button calls exactly this: selectSeason(defaultSeason) — same path the picker
    // uses, so it refetches that year's schedule.
    await viewModel.selectSeason(defaultSeason)

    #expect(await viewModel.selectedSeason == defaultSeason)
    #expect(await viewModel.isPastSeason == false)
    #expect(await viewModel.schedule?.season == 2025)
}

private func testSchedule(season: Int) -> TeamSchedule {
    TeamSchedule(
        season: season,
        games: [
            ScheduleGame(
                week: 1, isBye: false, date: "\(season)-09-07", isHome: true,
                opponent: scheduleTeam(id: "jets", abbrev: "NYJ"), teamScore: nil,
                opponentScore: nil, result: nil
            ),
        ]
    )
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

    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        guard let result = schedules[season] else { throw DepthError.notFound }
        return try result.get()
    }

    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }

    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }
}

private actor DelayedScheduleRepository: DepthRepository {
    private let defaultSchedule: TeamSchedule
    private var requests = Set<Int>()
    private var requestWaiters: [Int: CheckedContinuation<Void, Never>] = [:]
    private var responseWaiters: [Int: CheckedContinuation<TeamSchedule, Error>] = [:]

    init(defaultSchedule: TeamSchedule) {
        self.defaultSchedule = defaultSchedule
    }

    func teams() async throws -> [Team] { [] }

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }

    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        guard let season else { return defaultSchedule }
        requests.insert(season)
        requestWaiters.removeValue(forKey: season)?.resume()
        return try await withCheckedThrowingContinuation { continuation in
            responseWaiters[season] = continuation
        }
    }

    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }

    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }

    func waitForRequest(season: Int) async {
        if requests.contains(season) { return }
        await withCheckedContinuation { continuation in
            requestWaiters[season] = continuation
        }
    }

    func complete(season: Int, with schedule: TeamSchedule) {
        responseWaiters.removeValue(forKey: season)?.resume(returning: schedule)
    }
}
