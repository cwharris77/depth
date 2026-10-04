import Foundation
import Testing

@testable import Depth

// The record and highlight stat files: lenient wire decoding, the mapping onto the domain
// types, the regular-season scope gate, and the client's status handling. A missing value is
// nil throughout, never zero.

private let highlightsJSON = """
    {
      "schema_version": 1,
      "player_id": "3139477",
      "scope": "REG",
      "source": "stats_player_week",
      "future_top_level": { "x": 1 },
      "coverage": { "from_season": 1999, "to_season": 2026 },
      "highlights": {
        "rushing_yards": {
          "single_game": {
            "value": 221, "season": 2022, "week": 9, "team": "bills",
            "game_id": "2022_09_BUF_NYJ", "opponent": "jets",
            "all_time_rank": 41, "players_at_or_above": 47,
            "team_rank": 2, "team_players_at_or_above": 2, "future_field": 1
          },
          "single_season": {
            "value": 1503, "season": 2022, "team": "bills",
            "all_time_rank": 88, "players_at_or_above": 90
          },
          "future_kind": { "value": 1, "season": 2020, "all_time_rank": 1, "players_at_or_above": 1 }
        },
        "future_stat": {
          "single_game": { "value": 1, "season": 2020, "all_time_rank": 1, "players_at_or_above": 1 }
        },
        "passing_tds": {
          "single_game": { "value": 5, "season": 2020 }
        }
      }
    }
    """

private func decodeHighlights(_ json: String = highlightsJSON) throws -> PlayerHighlightsFileDTO {
    try JSONDecoder().decode(PlayerHighlightsFileDTO.self, from: Data(json.utf8))
}

@Test func highlightsMapWithTheirRankAndCoverage() throws {
    let highlights = try #require(RecordStatFilesMapper.map(try decodeHighlights()))
    #expect(highlights.coverage == RecordCoverage(fromSeason: 1999, toSeason: 2026))

    let game = try #require(highlights.highlight(.rushingYards, .singleGame))
    #expect(game.value == 221)
    #expect(game.week == 9)
    #expect(game.teamId == "bills")
    #expect(game.gameId == "2022_09_BUF_NYJ")
    #expect(game.opponentId == "jets")
    #expect(game.allTimeRank == 41)
    #expect(game.playersAtOrAbove == 47)
    #expect(game.teamRank == 2)
    #expect(game.teamPlayersAtOrAbove == 2)

    let season = try #require(highlights.highlight(.rushingYards, .singleSeason))
    #expect(season.value == 1503)
    #expect(season.week == nil)
    #expect(season.teamRank == nil)
}

@Test func highlightsSkipUnknownStatsKindsAndEntriesMissingARank() throws {
    let highlights = try #require(RecordStatFilesMapper.map(try decodeHighlights()))
    // passing_tds has a value but no rank or count, so it is dropped rather than shown bare.
    #expect(highlights.highlight(.passingTds, .singleGame) == nil)
    #expect(highlights.highlight(.receivingYards, .singleGame) == nil)
}

@Test func aTeamRankNeedsItsCountToo() throws {
    let json = """
        { "scope": "REG", "highlights": { "rushing_tds": { "single_game": {
            "value": 4, "season": 2021, "all_time_rank": 9, "players_at_or_above": 30,
            "team_rank": 1
        } } } }
        """
    let highlight = try #require(
        RecordStatFilesMapper.map(try decodeHighlights(json))?.highlight(.rushingTds, .singleGame))
    #expect(highlight.teamRank == nil)
    #expect(highlight.teamPlayersAtOrAbove == nil)
}

@Test func aFileThatIsNotRegularSeasonIsNeverMapped() throws {
    for scope in ["\"POST\"", "\"ALL\"", "null"] {
        let json = highlightsJSON.replacingOccurrences(of: "\"REG\"", with: scope)
        #expect(RecordStatFilesMapper.map(try decodeHighlights(json)) == nil)
    }
    #expect(
        RecordStatFilesMapper.map(try decodeHighlights(#"{ "highlights": {} }"#)) == nil)
}

@Test func aFileWithNoUsableHighlightsMapsToNil() throws {
    let json = #"{ "scope": "REG", "highlights": { "rushing_yards": {} } }"#
    #expect(RecordStatFilesMapper.map(try decodeHighlights(json)) == nil)
}

private let recordsJSON = """
    {
      "schema_version": 1,
      "scope": "REG",
      "source": "stats_player_week",
      "stat": "rushing_yards",
      "coverage": { "from_season": 1999, "to_season": 2026 },
      "single_game": {
        "top": [
          { "player_id": "1", "rank": 1, "value": 296, "season": 2000, "week": 4,
            "team": "bills", "game_id": "g1", "opponent": "jets" },
          { "player_id": "2", "rank": 2, "value": 295, "season": 2007 },
          { "rank": 3, "value": 290, "season": 2001 }
        ],
        "thresholds": [
          { "value": 200, "performances": 120, "players": 95 },
          { "value": 250, "performances": 9 }
        ]
      }
    }
    """

private func decodeRecords(_ json: String = recordsJSON) throws -> LeagueRecordsFileDTO {
    try JSONDecoder().decode(LeagueRecordsFileDTO.self, from: Data(json.utf8))
}

@Test func leagueRecordsMapTopEntriesAndMilestones() throws {
    let records = try #require(RecordStatFilesMapper.map(try decodeRecords()))
    #expect(records.stat == .rushingYards)
    #expect(records.coverage == RecordCoverage(fromSeason: 1999, toSeason: 2026))

    let top = records.section(.singleGame).top
    // The third entry has no player id, so it is dropped.
    #expect(top.map(\.playerId) == ["1", "2"])
    #expect(top[0].week == 4)
    #expect(top[0].opponentId == "jets")
    #expect(top[1].week == nil)

    // The 250 threshold has no player count, so it is dropped rather than shown as zero.
    #expect(
        records.section(.singleGame).milestones
            == [LeagueRecordMilestone(value: 200, performances: 120, players: 95)])
    #expect(records.section(.singleSeason).top.isEmpty)
}

@Test func leagueRecordsRequireRegularSeasonScopeAndAKnownStat() throws {
    let post = recordsJSON.replacingOccurrences(of: "\"REG\"", with: "\"POST\"")
    #expect(RecordStatFilesMapper.map(try decodeRecords(post)) == nil)
    let unknown = recordsJSON.replacingOccurrences(of: "rushing_yards", with: "kick_returns")
    #expect(RecordStatFilesMapper.map(try decodeRecords(unknown)) == nil)
}

// MARK: client

private func recordClient(
    status: Int = 200, body: String = highlightsJSON, error: Error? = nil,
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

@Test func clientFetchesTheHighlightsAndRecordFiles() async throws {
    let seen = LockedBox<[URL]>([])
    let client = recordClient(seen: seen)
    #expect(try await client.playerHighlights(espnId: "3139477")?.scope == "REG")
    #expect(try await client.leagueRecords(stat: .passingYards)?.scope == "REG")
    #expect(
        seen.current.map(\.absoluteString) == [
            "https://stats.example/v1/players/3139477/highlights.json",
            "https://stats.example/v1/records/passing_yards.json",
        ])
}

@Test func clientTreatsARecordFile404AsNoFile() async throws {
    let client = recordClient(status: 404, body: "")
    let highlights = try await client.playerHighlights(espnId: "3139477")
    let records = try await client.leagueRecords(stat: .rushingTds)
    #expect(highlights == nil)
    #expect(records == nil)
}

@Test func clientMapsRecordServerErrorsOfflineAndBadBodies() async {
    await #expect(throws: DepthError.server("stat files returned HTTP 503")) {
        try await recordClient(status: 503, body: "").playerHighlights(espnId: "1")
    }
    await #expect(throws: DepthError.offline) {
        try await recordClient(error: URLError(.notConnectedToInternet))
            .leagueRecords(stat: .rushingYards)
    }
    await #expect(throws: DepthError.self) {
        try await recordClient(body: "not json").playerHighlights(espnId: "1")
    }
}

@Test func clientNeverBuildsAHighlightsPathFromANonNumericId() async throws {
    let seen = LockedBox<[URL]>([])
    for id in ["", "../manifest", "abc", "12/../3", "12.json"] {
        #expect(try await recordClient(seen: seen).playerHighlights(espnId: id) == nil)
    }
    #expect(seen.current.isEmpty)
}
