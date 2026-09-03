import Foundation
import Testing
@testable import Depth

// Native historical-roster contract: season semantics, strict history DTO decoding,
// special-teams derivation, and the independently cancellable history state machine.

private func historyTeam() -> Team {
    Team(
        id: "seahawks", city: "Seattle", name: "Seahawks", abbrev: "SEA",
        conference: "NFC", division: "West",
        colors: TeamColors(
            primary: "#002244", secondary: "#69be28", accent: "#69be28"
        ),
        logo: "https://example.com/logo.png", logoDark: "https://example.com/logo-dark.png"
    )
}

private func historyRow(
    gsisId: String = "00-0031234",
    season: Int = 2013,
    name: String = "Russell Wilson",
    number: Int? = 3,
    position: String = "QB",
    college: String? = "Wisconsin",
    height: String? = "5' 11\"",
    weight: Int? = 215,
    depthRank: Int = 1,
    playerOrder: Int = 7
) -> HistoricalRosterRowDTO {
    HistoricalRosterRowDTO(
        season: season, teamId: "seahawks", gsisId: gsisId, name: name, number: number,
        position: position, college: college, height: height, weight: weight,
        depthRank: depthRank, playerOrder: playerOrder
    )
}

@Test(arguments: [
    ("2026-01-01T12:00:00Z", 2025),
    ("2026-02-01T12:00:00Z", 2026),
    ("2026-09-01T12:00:00Z", 2026),
])
func currentRosterSeasonUsesThePreviousCalendarYearOnlyInJanuary(
    instant: String,
    expectedSeason: Int
) throws {
    let date = try #require(ISO8601DateFormatter().date(from: instant))
    #expect(currentRosterSeason(at: date, calendar: Calendar(identifier: .gregorian)) == expectedSeason)
}

@Test func historySeasonOptionsStartWithLiveRosterThenDescendTo1999() {
    #expect(historySeasonOptions(currentSeason: 2026) == [
        .current(2026), .past(2025), .past(2024), .past(2023), .past(2022), .past(2021),
        .past(2020), .past(2019), .past(2018), .past(2017), .past(2016), .past(2015),
        .past(2014), .past(2013), .past(2012), .past(2011), .past(2010), .past(2009),
        .past(2008), .past(2007), .past(2006), .past(2005), .past(2004), .past(2003),
        .past(2002), .past(2001), .past(2000), .past(1999),
    ])
}

@Test func historicalMapperUsesTypedIdentityStoredProfileFieldsAndNoRemoteImage() throws {
    let roster = try HistoricalRosterMapper.map(team: historyTeam(), rows: [historyRow()])
    let player = try #require(roster.players.first)

    #expect(player.id == "gsis:00-0031234@2013")
    #expect(player.order == 7)
    #expect(player.depthRank == 1)
    #expect(player.status == .starter)
    #expect(player.number == 3)
    #expect(player.college == "Wisconsin")
    #expect(player.height == "5' 11\"")
    #expect(player.weight == 215)
    #expect(player.age == 0)
    #expect(player.experience == 0)
    #expect(player.bio == "2013 · Seattle Seahawks")
    #expect(player.photoUrl == nil, "historical native players must keep the number fallback")
    #expect(roster.uniforms.isEmpty, "history keeps team colors but does not render uniforms")
}

@Test func historicalMapperMapsBackupAndStoredMissingValuesWithoutCoercingOrder() throws {
    let roster = try HistoricalRosterMapper.map(
        team: historyTeam(),
        rows: [historyRow(number: nil, college: nil, height: nil, weight: nil, depthRank: 3, playerOrder: 12)]
    )
    let player = try #require(roster.players.first)

    #expect(player.number == 0)
    #expect(player.college == "")
    #expect(player.height == "")
    #expect(player.weight == 0)
    #expect(player.order == 12)
    #expect(player.depthRank == 3)
    #expect(player.status == .backup)
}

@Test func historicalMapperRejectsMalformedPositionAndRank() {
    #expect(throws: DepthError.decoding("historical player 00-0031234: unknown position \"XX\"")) {
        try HistoricalRosterMapper.map(team: historyTeam(), rows: [historyRow(position: "XX")])
    }
    #expect(throws: DepthError.decoding("historical player 00-0031234: depthRank 4 out of range 1...3")) {
        try HistoricalRosterMapper.map(team: historyTeam(), rows: [historyRow(depthRank: 4)])
    }
}

@Test func historicalSpecialTeamsUseOnlyRankOneKickerPunterAndLongSnapper() throws {
    let roster = try HistoricalRosterMapper.map(team: historyTeam(), rows: [
        historyRow(gsisId: "k1", name: "Kicker", position: "K", depthRank: 1),
        historyRow(gsisId: "k2", name: "Backup Kicker", position: "K", depthRank: 2),
        historyRow(gsisId: "p1", name: "Punter", position: "P", depthRank: 1),
        historyRow(gsisId: "ls1", name: "Snapper", position: "LS", depthRank: 1),
        historyRow(gsisId: "kr1", name: "Returner", position: "KR", depthRank: 1),
    ])
    let slots = Dictionary(uniqueKeysWithValues: roster.specialTeams.map { ($0.label, $0.playerId) })

    #expect(slots["K"] == "gsis:k1@2013")
    #expect(slots["P"] == "gsis:p1@2013")
    #expect(slots["LS"] == "gsis:ls1@2013")
    // No returner slots at all: nflverse never says who returned kicks, and an
    // unseatable dot renders as a "?" that reads like a broken player circle
    // (Cooper, 2026-09-02 — reverses the earlier "unfilled by policy" call).
    #expect(!slots.keys.contains("KR"))
    #expect(!slots.keys.contains("PR"))
}

@Test func historicalSpecialTeamsOmitASlotThePastSeasonCannotSeat() throws {
    let roster = try HistoricalRosterMapper.map(team: historyTeam(), rows: [
        historyRow(gsisId: "p1", name: "Punter", position: "P", depthRank: 1),
    ])
    #expect(roster.specialTeams.map(\.label) == ["P"])
}

@Test func historicalDefenseFillsEveryFieldSlotFromGenericPositionTags() throws {
    // Historical-defense repro at the seam that actually shipped the bug: nflverse's roster
    // vocabulary has no side/role tags (every end is "DE", backer "LB", safety "S"), and
    // a past season has no formation rows, so the field falls back to baseDefense. With
    // position-exact slots that combination resolved all 11 dots to nil and the defense
    // rendered completely empty.
    let generic: [(String, String)] = [
        ("de1", "DE"), ("dt1", "DT"), ("de2", "DE"),
        ("lb1", "LB"), ("lb2", "LB"), ("lb3", "LB"), ("lb4", "LB"),
        ("cb1", "CB"), ("cb2", "CB"), ("s1", "S"), ("s2", "S"),
    ]
    let snapshot = try HistoricalRosterMapper.map(
        team: historyTeam(),
        rows: generic.enumerated().map { i, entry in
            historyRow(gsisId: entry.0, name: entry.0, position: entry.1, playerOrder: i)
        }
    )
    let resolved = resolveUnit(
        roster: Roster(players: snapshot.players, specialTeams: snapshot.specialTeams),
        unit: .defense
    )

    #expect(resolved.count == baseDefense.count)
    #expect(resolved.filter { $0.player == nil }.map(\.key) == [])
    #expect(Set(resolved.compactMap { $0.player?.id }).count == resolved.count)
}

@Test func historicalPlayerReferenceParserRejectsMalformedReferences() {
    #expect(parseHistoricalPlayerReference("gsis:00-0031234@2013") == HistoricalPlayerReference(gsisId: "00-0031234", season: 2013))
    #expect(parseHistoricalPlayerReference("gsis:@2013") == nil)
    #expect(parseHistoricalPlayerReference("gsis:00-0031234@") == nil)
    #expect(parseHistoricalPlayerReference("gsis:00-0031234@2013@2014") == nil)
    #expect(parseHistoricalPlayerReference("espn:123") == nil)
}

@Test func statsLookupRequiresHistoricalTeamContextAndKeepsCurrentIDs() {
    #expect(playerStatsLookup(for: "12345", teamId: nil) == .current(playerId: "12345"))
    #expect(playerStatsLookup(for: "gsis:00-0031234@2013", teamId: "seahawks") == .historical(
        HistoricalPlayerReference(gsisId: "00-0031234", season: 2013), teamId: "seahawks"
    ))
    #expect(playerStatsLookup(for: "gsis:00-0031234@2013", teamId: nil) == .invalidHistorical)
    #expect(playerStatsLookup(for: "gsis:00-0031234@2013@2014", teamId: "seahawks") == .invalidHistorical)
}

@Test func historyViewModelShowsHistoricalSuccessWithoutLiveSnapshot() async {
    let repository = HistoryRepositoryFake(history: [2013: .success(try! HistoricalRosterMapper.map(
        team: historyTeam(), rows: [historyRow()]
    ))])
    let viewModel = await HistoryViewModel(teamId: "seahawks", repository: repository, currentSeason: 2026)

    await viewModel.select(.past(2013))

    #expect(await viewModel.selectedSeason == .past(2013))
    #expect(await viewModel.state == .loaded)
    #expect(await viewModel.snapshot?.players.first?.name == "Russell Wilson")
}

@Test func immediateHistoricalSelectionClearsLiveContentBeforeTheReadCompletes() async {
    let repository = DelayedHistoryRepository()
    let viewModel = await HistoryViewModel(teamId: "seahawks", repository: repository, currentSeason: 2026)

    await viewModel.selectImmediately(.past(2013))

    #expect(await viewModel.selectedSeason == .past(2013))
    #expect(await viewModel.state == .loading)
    #expect(await viewModel.snapshot == nil)
    await repository.waitForRequest(season: 2013, count: 1)
    await repository.complete(season: 2013, count: 1, with: .failure(.notFound))
}

@Test func historyViewModelTreatsMissingSeasonAsDistinctNoDataState() async {
    let repository = HistoryRepositoryFake(history: [2013: .failure(.notFound)])
    let viewModel = await HistoryViewModel(teamId: "seahawks", repository: repository, currentSeason: 2026)

    await viewModel.select(.past(2013))

    #expect(await viewModel.selectedSeason == .past(2013))
    #expect(await viewModel.state == .empty)
}

@Test func historyViewModelRetainsSelectedSeasonForFailureRetryAndBackToToday() async throws {
    let expected = try HistoricalRosterMapper.map(team: historyTeam(), rows: [historyRow()])
    let repository = HistoryRepositoryFake(historyResults: [
        2013: [.failure(.offline), .success(expected)],
    ])
    let viewModel = await HistoryViewModel(teamId: "seahawks", repository: repository, currentSeason: 2026)

    await viewModel.select(.past(2013))
    #expect(await viewModel.selectedSeason == .past(2013))
    #expect(await viewModel.state == .failed(.offline))

    await viewModel.retry()
    #expect(await viewModel.selectedSeason == .past(2013))
    #expect(await viewModel.state == .loaded)

    await viewModel.select(.current(2026))
    #expect(await viewModel.selectedSeason == .current(2026))
    #expect(await viewModel.state == .current)
    #expect(await viewModel.snapshot == nil)
}

@Test func staleHistoricalResponseCannotOverwriteANewerSeasonOrToday() async throws {
    let first = try HistoricalRosterMapper.map(team: historyTeam(), rows: [historyRow(season: 2013)])
    let second = try HistoricalRosterMapper.map(team: historyTeam(), rows: [historyRow(season: 2012, name: "Second")])
    let repository = DelayedHistoryRepository()
    let viewModel = await HistoryViewModel(teamId: "seahawks", repository: repository, currentSeason: 2026)

    let firstSelection = Task { @MainActor in await viewModel.select(.past(2013)) }
    await repository.waitForRequest(season: 2013, count: 1)
    let secondSelection = Task { @MainActor in await viewModel.select(.past(2012)) }
    await repository.waitForRequest(season: 2012, count: 1)
    await repository.complete(season: 2012, count: 1, with: .success(second))
    await secondSelection.value
    await repository.complete(season: 2013, count: 1, with: .success(first))
    await firstSelection.value

    #expect(await viewModel.selectedSeason == .past(2012))
    #expect(await viewModel.snapshot?.players.first?.name == "Second")

    let todaySelection = Task { @MainActor in await viewModel.select(.past(2013)) }
    await repository.waitForRequest(season: 2013, count: 2)
    await viewModel.select(.current(2026))
    await repository.complete(season: 2013, count: 2, with: .success(first))
    await todaySelection.value
    #expect(await viewModel.selectedSeason == .current(2026))
    #expect(await viewModel.snapshot == nil)
}

private actor HistoryRepositoryFake: DepthRepository {
    private var historyResults: [Int: [Result<TeamSnapshot, DepthError>]]

    init(history: [Int: Result<TeamSnapshot, DepthError>] = [:]) {
        historyResults = history.mapValues { [$0] }
    }

    init(historyResults: [Int: [Result<TeamSnapshot, DepthError>]]) {
        self.historyResults = historyResults
    }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        guard var results = historyResults[season], !results.isEmpty else { throw DepthError.notFound }
        let next = results.removeFirst()
        historyResults[season] = results
        return try next.get()
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }
}

private actor DelayedHistoryRepository: DepthRepository {
    private var requestCounts: [Int: Int] = [:]
    private var requestWaiters: [String: CheckedContinuation<Void, Never>] = [:]
    private var responseWaiters: [String: CheckedContinuation<TeamSnapshot, Error>] = [:]

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        let count = requestCounts[season, default: 0] + 1
        requestCounts[season] = count
        let key = requestKey(season: season, count: count)
        requestWaiters.removeValue(forKey: key)?.resume()
        return try await withCheckedThrowingContinuation { continuation in
            responseWaiters[key] = continuation
        }
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }

    func waitForRequest(season: Int, count: Int) async {
        guard requestCounts[season, default: 0] < count else { return }
        let key = requestKey(season: season, count: count)
        await withCheckedContinuation { continuation in requestWaiters[key] = continuation }
    }

    func complete(season: Int, count: Int, with result: Result<TeamSnapshot, DepthError>) {
        let continuation = responseWaiters.removeValue(forKey: requestKey(season: season, count: count))
        switch result {
        case .success(let snapshot): continuation?.resume(returning: snapshot)
        case .failure(let error): continuation?.resume(throwing: error)
        }
    }

    private func requestKey(season: Int, count: Int) -> String { "\(season)-\(count)" }
}
