import Testing
@testable import Depth

// Player-profile contract coverage starts at the DTO boundary, before presentation.

@Test func playerMapperPreservesCompleteProfileFields() throws {
    let dto = PlayerDTO(
        id: "p17", teamId: "bills", name: "Jordan Example", number: 17, position: "QB",
        status: "injured", age: 27, college: "Example State", experience: 5,
        height: "6' 3\"", weight: 220, bio: "Accurate passer.",
        photoUrl: "https://example.com/player.png"
    )

    let mapped = try TeamSnapshotMapper.mapPlayer(dto, depthRank: 1)

    #expect(mapped.status == .injured)
    #expect(mapped.age == 27)
    #expect(mapped.college == "Example State")
    #expect(mapped.experience == 5)
    #expect(mapped.height == "6' 3\"")
    #expect(mapped.weight == 220)
    #expect(mapped.bio == "Accurate passer.")
    #expect(mapped.photoUrl == "https://example.com/player.png")
}

@Test func playerStatsMapperPreservesRegularSeasonFieldsAndTeamAbbreviation() throws {
    let dto = PlayerSeasonStatsDTO(
        season: 2025, seasonType: "REG", games: 17, completions: 401, attempts: 580,
        passingYards: 4_321, passingTds: 32, passingInterceptions: 9, carries: nil,
        rushingYards: nil, rushingTds: nil, receptions: nil, targets: nil,
        receivingYards: nil, receivingTds: nil, defTacklesSolo: nil, defSacks: nil,
        defInterceptions: nil, fgMade: nil, fgAtt: nil, teams: TeamAbbreviationDTO(abbrev: "BUF")
    )

    let mapped = TeamSnapshotMapper.mapPlayerSeasonStats(dto)

    #expect(mapped.season == 2025)
    #expect(mapped.seasonType == .regular)
    #expect(mapped.teamAbbrev == "BUF")
    #expect(mapped.passingYards == 4_321)
}

@Test func profileDisplayUsesHumanLabelsAndMissingValueFallbacks() {
    #expect(Position.qb.fullName == "Quarterback")
    #expect(PlayerProfileDisplay.experience(0) == "Rookie")
    #expect(PlayerProfileDisplay.experience(1) == "1 yr")
    #expect(PlayerProfileDisplay.experience(4) == "4 yrs")
    #expect(PlayerProfileDisplay.age(nil) == "—")
    #expect(PlayerProfileDisplay.age(0) == "—")
    #expect(PlayerProfileDisplay.height("   ") == "—")
    #expect(PlayerProfileDisplay.weight(0) == "—")
    #expect(PlayerProfileDisplay.weight(220) == "220 lb")
    #expect(PlayerProfileDisplay.meaningful(" \n ") == nil)
    #expect(PlayerProfileDisplay.meaningful("  — \n") == nil)
}

@Test func quarterbackStatColumnsMatchWebVocabularyAndFormatting() {
    let stats = PlayerSeasonStats(
        season: 2025, seasonType: .regular, teamAbbrev: "BUF", games: 17,
        completions: 401, attempts: 580, passingYards: 4_321, passingTds: 32,
        passingInterceptions: 9, carries: nil, rushingYards: nil, rushingTds: nil,
        receptions: nil, targets: nil, receivingYards: nil, receivingTds: nil,
        defTacklesSolo: nil, defSacks: nil, defInterceptions: nil, fgMade: nil, fgAtt: nil
    )

    let columns = playerStatColumns(for: .qb)

    #expect(columns.map(\.header) == ["CMP/ATT", "YDS", "TD", "INT", "YPA"])
    #expect(columns.map { $0.value(for: stats) } == ["401/580", "4,321", "32", "9", "7.5"])
}

@Test func statColumnsExposeSpokenNamesDistinctFromCompactHeaders() {
    #expect(PlayerStatColumn.passingYards.accessibleName == "Passing yards")
    #expect(PlayerStatColumn.passingYardsPerAttempt.accessibleName == "Yards per attempt")
    #expect(PlayerStatColumn.completionsAttempts.accessibleName == "Completions of attempts")
    #expect(PlayerStatColumn.fieldGoalPercentage.accessibleName == "Field goal percentage")
    // Every column must differ from its compact header, or the spoken name adds
    // nothing over the letter-string VoiceOver already reads badly.
    for column in PlayerStatColumn.allCases {
        #expect(column.accessibleName != column.header, "\(column.header) needs a spoken name")
    }
}

@Test func statsRowAccessibilityLabelPairsEverySpokenNameWithItsValue() {
    let stats = PlayerSeasonStats(
        season: 2025, seasonType: .regular, teamAbbrev: "BUF", games: 17,
        completions: 401, attempts: 580, passingYards: 4_321, passingTds: 32,
        passingInterceptions: 9, carries: nil, rushingYards: nil, rushingTds: nil,
        receptions: nil, targets: nil, receivingYards: nil, receivingTds: nil,
        defTacklesSolo: nil, defSacks: nil, defInterceptions: nil, fgMade: nil, fgAtt: nil
    )

    let label = PlayerStatsAccessibility.rowLabel(for: stats, columns: playerStatColumns(for: .qb))

    #expect(
        label == "2025 season, BUF, Completions of attempts 401/580, Passing yards 4,321, "
            + "Passing touchdowns 32, Interceptions thrown 9, Yards per attempt 7.5"
    )
}

@Test func statsRowAccessibilityLabelOmitsAnAbsentTeamAndSurvivesNoColumns() {
    let stats = PlayerSeasonStats.empty(season: 2024, games: 3)

    #expect(PlayerStatsAccessibility.rowLabel(for: stats, columns: []) == "2024 season")
    #expect(
        PlayerStatsAccessibility.rowLabel(for: stats, columns: [.games]) == "2024 season, Games played 3"
    )
}

@Test func profileViewModelDropsNoGameRowsAfterSuccessfulLoad() async {
    let repository = PlayerStatsRepositoryFake(results: [
        .success([
            PlayerSeasonStats.empty(season: 2025),
            PlayerSeasonStats.empty(season: 2024, games: 14),
        ]),
    ])
    let viewModel = await PlayerProfileViewModel(playerID: "p1", teamID: nil, repository: repository)

    await viewModel.load()

    #expect(await viewModel.statsState == .loaded)
    #expect(await viewModel.stats.map(\.season) == [2024])
}

@Test func profileViewModelShowsEmptyAfterAResolvedNoStatsRead() async {
    let repository = PlayerStatsRepositoryFake(results: [.success([PlayerSeasonStats.empty(season: 2025)])])
    let viewModel = await PlayerProfileViewModel(playerID: "p1", teamID: nil, repository: repository)

    await viewModel.load()

    #expect(await viewModel.statsState == .empty)
}

@Test func profileViewModelForwardsDisplayedTeamForHistoricalStats() async {
    let repository = PlayerStatsRepositoryFake(results: [.success([])])
    let viewModel = await PlayerProfileViewModel(
        playerID: "gsis:00-0031234@2013", teamID: "seahawks", repository: repository
    )

    await viewModel.load()

    #expect(await repository.requests == [
        PlayerStatsRequest(playerID: "gsis:00-0031234@2013", teamID: "seahawks"),
    ])
}

@Test func profileViewModelRetainsProfileAndRecoversWithRetryAfterStatsFailure() async {
    let repository = PlayerStatsRepositoryFake(results: [
        .failure(.offline),
        .success([PlayerSeasonStats.empty(season: 2025, games: 17)]),
    ])
    let viewModel = await PlayerProfileViewModel(playerID: "p1", teamID: nil, repository: repository)

    await viewModel.load()
    #expect(await viewModel.statsState == .failed(.offline))

    await viewModel.retry()
    #expect(await viewModel.statsState == .loaded)
    #expect(await viewModel.stats.map(\.season) == [2025])
}

@Test func staleProfileStatsResponseCannotOverwriteANewerLoad() async {
    let repository = DelayedPlayerStatsRepository()
    let viewModel = await PlayerProfileViewModel(playerID: "p1", teamID: nil, repository: repository)

    let firstLoad = Task { @MainActor in await viewModel.load() }
    await repository.waitForRequest(1)
    let secondLoad = Task { @MainActor in await viewModel.load() }
    await repository.waitForRequest(2)

    await repository.complete(2, with: .success([PlayerSeasonStats.empty(season: 2025, games: 17)]))
    await secondLoad.value
    await repository.complete(1, with: .success([PlayerSeasonStats.empty(season: 2024, games: 17)]))
    await firstLoad.value

    #expect(await viewModel.stats.map(\.season) == [2025])
}

private struct PlayerStatsRequest: Equatable {
    let playerID: String
    let teamID: String?
}

private actor PlayerStatsRepositoryFake: DepthRepository {
    private var results: [Result<[PlayerSeasonStats], DepthError>]
    private(set) var requests: [PlayerStatsRequest] = []

    init(results: [Result<[PlayerSeasonStats], DepthError>]) {
        self.results = results
    }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] {
        requests.append(PlayerStatsRequest(playerID: playerId, teamID: teamId))
        guard !results.isEmpty else { throw DepthError.notFound }
        return try results.removeFirst().get()
    }
}

private actor DelayedPlayerStatsRepository: DepthRepository {
    private var requestCount = 0
    private var requestWaiters: [Int: CheckedContinuation<Void, Never>] = [:]
    private var responseWaiters: [Int: CheckedContinuation<[PlayerSeasonStats], Error>] = [:]

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] {
        requestCount += 1
        let request = requestCount
        requestWaiters.removeValue(forKey: request)?.resume()
        return try await withCheckedThrowingContinuation { continuation in
            responseWaiters[request] = continuation
        }
    }

    func waitForRequest(_ request: Int) async {
        if requestCount >= request { return }
        await withCheckedContinuation { continuation in
            requestWaiters[request] = continuation
        }
    }

    func complete(_ request: Int, with result: Result<[PlayerSeasonStats], DepthError>) {
        switch result {
        case .success(let stats): responseWaiters.removeValue(forKey: request)?.resume(returning: stats)
        case .failure(let error): responseWaiters.removeValue(forKey: request)?.resume(throwing: error)
        }
    }
}
