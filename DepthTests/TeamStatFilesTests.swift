import Foundation
import Testing

@testable import Depth

// The per-team stat files: lenient wire decoding, the mapping onto `TeamStatHistory`, and the
// client's status handling. A missing value is nil throughout, never zero.

private let teamFileJSON = """
    {
      "recent_window": 3,
      "schema_version": 1,
      "team_id": "bills",
      "future_top_level": { "x": 1 },
      "seasons": [
        {
          "season": 2024,
          "games": [
            { "week": 1, "season_type": "REG", "game_id": "2024_01_BUF_ARI", "opponent": "cardinals" }
          ]
        },
        {
          "season": 2025,
          "derived": {
            "games": 17,
            "ranked_teams": 32,
            "allowed_per_game": {
              "passing_yards": 170.2353, "rushing_yards": 136.1765, "total_yards": 306.4118,
              "passing_epa": -3.0609, "rushing_epa": 2.4416,
              "passing_epa_per_dropback": -0.1041, "rushing_epa_per_carry": 0.0922,
              "future_metric": 9
            },
            "ranks": { "passing_yards": 1, "rushing_yards": 28, "total_yards": 7 },
            "recent": {
              "games": 3, "through_week": 18, "ranked_teams": 32,
              "allowed_per_game": { "passing_yards": 109, "rushing_yards": 103.6667 },
              "ranks": { "passing_yards": 2, "rushing_yards": 11 }
            }
          },
          "games": [
            {
              "week": 1, "season_type": "REG", "game_id": "2025_01_BAL_BUF", "opponent": "ravens",
              "offense": { "passing_yards": 394, "rushing_yards": 108, "passing_epa": 14.2 },
              "allowed": { "passing_yards": 209, "rushing_yards": 238 }
            },
            { "week": 19, "season_type": "POST", "opponent": "jets" },
            { "week": 2, "season_type": "REG", "game_id": "no-opponent" }
          ]
        }
      ]
    }
    """

private func decodeTeamFile(_ json: String = teamFileJSON) throws -> TeamSeasonsFileDTO {
    try JSONDecoder().decode(TeamSeasonsFileDTO.self, from: Data(json.utf8))
}

@Test func teamFileMapsSeasonsNewestFirstWithRatesAndRanks() throws {
    let history = TeamStatFilesMapper.map(try decodeTeamFile())
    #expect(history.seasons.map(\.season) == [2025, 2024])

    let season = try #require(history.season(2025))
    let allowed = try #require(season.allowed)
    #expect(allowed.games == 17)
    #expect(allowed.rankedTeams == 32)
    #expect(allowed.rates.passingYards == 170.2353)
    #expect(allowed.rates.rushingEpaPerCarry == 0.0922)
    #expect(allowed.ranks?.rushingYards == 28)
    #expect(allowed.ranks?.passingEpa == nil)
}

@Test func teamFileMapsTheRecentWindow() throws {
    let season = try #require(TeamStatFilesMapper.map(try decodeTeamFile()).season(2025))
    let recent = try #require(season.recent)
    #expect(recent.games == 3)
    #expect(recent.throughWeek == 18)
    #expect(recent.rates.rushingYards == 103.6667)
    #expect(recent.rates.totalYards == nil)
    #expect(recent.ranks?.passingYards == 2)
}

@Test func teamFileMapsGameLinesAndDropsOnesWithoutAnOpponent() throws {
    let season = try #require(TeamStatFilesMapper.map(try decodeTeamFile()).season(2025))
    #expect(season.games.map(\.week) == [1, 19])
    let first = try #require(season.games.first)
    #expect(first.id == "2025_01_BAL_BUF")
    #expect(first.opponentId == "ravens")
    #expect(first.isPostseason == false)
    #expect(first.offense?.passingYards == 394)
    #expect(first.offense?.rushingEpa == nil)
    #expect(first.allowed?.rushingYards == 238)
    #expect(season.games.last?.isPostseason == true)
    #expect(season.games.last?.allowed == nil)
}

@Test func aSeasonWithNoDerivedBlockHasNoAllowedWindowAndNeverAZeroOne() throws {
    let season = try #require(TeamStatFilesMapper.map(try decodeTeamFile()).season(2024))
    #expect(season.allowed == nil)
    #expect(season.recent == nil)
    #expect(season.games.count == 1)
}

@Test func ranksWithoutTheirDenominatorAreDropped() throws {
    let json = """
        { "seasons": [ { "season": 2025, "derived": {
            "games": 5, "allowed_per_game": { "passing_yards": 200 },
            "ranks": { "passing_yards": 3 }
        } } ] }
        """
    let allowed = try #require(
        TeamStatFilesMapper.map(try decodeTeamFile(json)).season(2025)?.allowed)
    #expect(allowed.rates.passingYards == 200)
    #expect(allowed.ranks == nil)
    #expect(allowed.rankedTeams == nil)
}

@Test func anUnknownSeasonIsAbsent() throws {
    #expect(TeamStatFilesMapper.map(try decodeTeamFile()).season(1999) == nil)
}

@Test func aSparseTeamFileStillDecodes() throws {
    let history = TeamStatFilesMapper.map(try decodeTeamFile(#"{ "seasons": [] }"#))
    #expect(history.seasons.isEmpty)
}

// MARK: client

private func teamClient(
    status: Int = 200, body: String = teamFileJSON, error: Error? = nil,
    seen: LockedBox<[URL]> = LockedBox([])
) -> StatFilesClient {
    StatFilesClient(baseURL: URL(string: "https://stats.example/v1")!) { request in
        let url = try #require(request.url)
        seen.mutate { $0.append(url) }
        if let error { throw error }
        let response = try #require(
            HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: nil))
        return (Data(body.utf8), response)
    }
}

@Test func clientFetchesTheTeamFileForATeamId() async throws {
    let seen = LockedBox<[URL]>([])
    let file = try await teamClient(seen: seen).teamSeasons(teamId: "49ers")
    #expect(file?.seasons.count == 2)
    #expect(
        seen.current.map(\.absoluteString) == ["https://stats.example/v1/teams/49ers/seasons.json"])
}

@Test func clientTreatsATeam404AsNoFile() async throws {
    #expect(try await teamClient(status: 404, body: "").teamSeasons(teamId: "bills") == nil)
}

@Test func clientMapsTeamServerErrorsOfflineAndBadBodies() async {
    await #expect(throws: DepthError.server("stat files returned HTTP 503")) {
        try await teamClient(status: 503, body: "").teamSeasons(teamId: "bills")
    }
    await #expect(throws: DepthError.offline) {
        try await teamClient(error: URLError(.notConnectedToInternet)).teamSeasons(teamId: "bills")
    }
    await #expect(throws: DepthError.self) {
        try await teamClient(body: "not json").teamSeasons(teamId: "bills")
    }
}

@Test func clientNeverBuildsAPathFromANonSlugTeamId() async throws {
    let seen = LockedBox<[URL]>([])
    for id in ["", "../manifest", "Bills", "bills/../x", "bills.json"] {
        #expect(try await teamClient(seen: seen).teamSeasons(teamId: id) == nil)
    }
    #expect(seen.current.isEmpty)
}
