import Foundation
import Testing

@testable import Depth

// The per-player stat files: wire decoding, the REG/newest-first mapping, the client's
// status handling, and the ledger vocabulary the promoted fields feed.

private let fileJSON = """
    {
      "schema_version": 1,
      "player_id": "3139477",
      "seasons": [
        {
          "season": 2025, "season_type": "POST", "team": "chiefs",
          "box": { "games": 1, "passing_yards": 200 }
        },
        {
          "season": 2024, "season_type": "REG", "team": "chiefs",
          "box": {
            "games": 16, "completions": 392, "attempts": 589, "passing_yards": 3928,
            "passing_tds": 26, "passing_interceptions": 11, "passing_cpoe": 0.8,
            "fg_made_distance": "0,0,0", "future_column": 7
          },
          "snaps": { "offense_snaps": 1000, "offense_pct": 0.97 },
          "pfr": { "rushing_yards_before_contact_avg": 5.7, "rushing_yards_after_contact_avg": 0.9 },
          "ngs": { "avg_time_to_throw": 2.74 },
          "qbr": { "qbr_total": 60.1 },
          "future_section": { "x": 1 }
        },
        {
          "season": 2025, "season_type": "REG", "team": "bills",
          "box": { "games": 6, "carries": 40 }
        },
        {
          "season": 2025, "season_type": "REG", "team": "chiefs",
          "box": { "games": 10, "carries": 90 }
        }
      ]
    }
    """

private let abbrevs = ["chiefs": "KC", "bills": "BUF"]

private func decodeFile(_ json: String = fileJSON) throws -> PlayerSeasonsFileDTO {
    try JSONDecoder().decode(PlayerSeasonsFileDTO.self, from: Data(json.utf8))
}

@Test func statFileDecodesNumbersAndSkipsTextCellsAndUnknownSections() throws {
    let file = try decodeFile()
    let row = try #require(file.seasons.first { $0.season == 2024 })
    #expect(row.box?.int("passing_yards") == 3928)
    #expect(row.box?.double("passing_cpoe") == 0.8)
    #expect(row.box?.double("fg_made_distance") == nil)
    #expect(row.snaps?.double("offense_pct") == 0.97)
}

@Test func statFileMapsRegularSeasonRowsNewestFirstOneRowPerTeamStint() throws {
    let mapped = StatFilesMapper.map(try decodeFile(), teamAbbrevs: abbrevs)

    #expect(mapped.map(\.season) == [2025, 2025, 2024])
    #expect(mapped.map(\.teamAbbrev) == ["BUF", "KC", "KC"])
    #expect(Set(mapped.map(\.id)).count == 3)
    #expect(mapped.allSatisfy { $0.seasonType == .regular })
}

@Test func statFileMapsEveryLedgerFieldAndThePromotedOnes() throws {
    let mapped = StatFilesMapper.map(try decodeFile(), teamAbbrevs: abbrevs)
    let row = try #require(mapped.first { $0.season == 2024 })

    #expect(row.games == 16)
    #expect(row.completions == 392)
    #expect(row.passingYards == 3928)
    #expect(row.offenseSnaps == 1000)
    #expect(row.offensePct == 0.97)
    #expect(row.rushingYardsBeforeContactPerCarry == 5.7)
    #expect(row.rushingYardsAfterContactPerCarry == 0.9)
    #expect(row.timeToThrow == 2.74)
    #expect(row.passingCpoe == 0.8)
}

@Test func anOlderOrSparseFileStillDecodesWithMissingFieldsNil() throws {
    let sparse = """
        { "seasons": [ { "season": 1999, "season_type": "REG", "team": "unknown-team" } ] }
        """
    let mapped = StatFilesMapper.map(try decodeFile(sparse), teamAbbrevs: abbrevs)
    let row = try #require(mapped.first)
    #expect(row.teamAbbrev == nil)
    #expect(row.games == nil)
    #expect(row.punts == nil)
    #expect(row.missedTackles == nil)
}

@Test func aCachedSeasonRowWrittenBeforeTheNewFieldsExistedStillDecodes() throws {
    let encoded = try JSONEncoder().encode(PlayerSeasonStats.empty(season: 2024, games: 12))
    var object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
    for key in [
        "punts", "puntYards", "puntNetYards", "puntLong", "puntsInside20", "puntTouchbacks",
        "missedTackles", "rushingYardsBeforeContactPerCarry", "rushingYardsAfterContactPerCarry",
        "timeToThrow", "passingCpoe",
    ] {
        object[key] = nil
    }
    let old = try JSONSerialization.data(withJSONObject: object)

    let decoded = try JSONDecoder().decode(PlayerSeasonStats.self, from: old)
    #expect(decoded.games == 12)
    #expect(decoded.punts == nil)
}

// MARK: client

private func client(
    status: Int = 200, body: String = fileJSON, error: Error? = nil,
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

final class LockedBox<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Value
    init(_ value: Value) { self.value = value }
    func mutate(_ change: (inout Value) -> Void) { lock.withLock { change(&value) } }
    var current: Value { lock.withLock { value } }
}

@Test func clientFetchesTheCareerFileForAnEspnId() async throws {
    let seen = LockedBox<[URL]>([])
    let file = try await client(seen: seen).playerSeasons(espnId: "3139477")
    #expect(file?.seasons.count == 4)
    #expect(
        seen.current.map(\.absoluteString) == [
            "https://stats.example/v1/players/3139477/seasons.json"
        ])
}

@Test func clientTreatsA404AsNoFile() async throws {
    #expect(try await client(status: 404, body: "").playerSeasons(espnId: "1") == nil)
}

@Test func clientMapsServerErrorsOfflineAndBadBodies() async {
    await #expect(throws: DepthError.server("stat files returned HTTP 503")) {
        try await client(status: 503, body: "").playerSeasons(espnId: "1")
    }
    await #expect(throws: DepthError.offline) {
        try await client(error: URLError(.notConnectedToInternet)).playerSeasons(espnId: "1")
    }
    await #expect(throws: DepthError.self) {
        try await client(body: "not json").playerSeasons(espnId: "1")
    }
}

@Test func clientNeverBuildsAPathFromANonNumericId() async throws {
    let seen = LockedBox<[URL]>([])
    let file = try await client(seen: seen).playerSeasons(espnId: "../manifest")
    #expect(file == nil)
    #expect(seen.current.isEmpty)
}

// MARK: ledger vocabulary

/// A mapped regular-season row built from section lines, so the ledger tests exercise the
/// same path a real file takes.
private func mapped(
    _ year: Int = 2025, games: Double = 17, box: [String: Double] = [:],
    snaps: [String: Double] = [:], pfr: [String: Double] = [:], ngs: [String: Double] = [:]
) -> PlayerSeasonStats {
    let row = PlayerSeasonRowDTO(
        season: year, seasonType: "REG", team: "chiefs",
        box: StatLineDTO(values: box.merging(["games": games]) { first, _ in first }),
        snaps: StatLineDTO(values: snaps), pfr: StatLineDTO(values: pfr),
        ngs: StatLineDTO(values: ngs))
    return StatFilesMapper.map(PlayerSeasonsFileDTO(seasons: [row]), teamAbbrevs: abbrevs)[0]
}

private func punterSeason() -> PlayerSeasonStats {
    mapped(
        box: [
            "pt_att": 70, "pt_yards": 3_290, "pt_net_yards": 2_800, "pt_long": 68,
            "pt_inside_20": 31, "pt_touchback": 5,
        ],
        snaps: ["special_teams_snaps": 400, "special_teams_pct": 0.4])
}

@Test func aPunterLeadsWithAPuntingLine() {
    let row = punterSeason()
    #expect(PlayerStatCategory.categories(for: [row], position: .p).first == .punting)
    #expect(PlayerStatCategory.punting.hasData(row))
    #expect(PlayerStatCategory.punting.headline(row).value == "3,290")
    #expect(
        PlayerStatCategory.punting.summary(row).map { "\($0.value) \($0.short)" } == [
            "70 PNT", "47.0 AVG",
        ])
    #expect(
        PlayerStatCategory.punting.details(row).map { "\($0.value) \($0.short)" } == [
            "68 LONG", "31 IN20", "5 TB", "40.0 NET", "17 GP",
        ])
}

@Test func aLongSnapperHasNoPuntingTab() {
    let snapper = mapped(snaps: ["special_teams_snaps": 140, "special_teams_pct": 0.3])
    #expect(PlayerStatCategory.categories(for: [snapper], position: .ls) == [.snaps])
}

@Test func missedTacklesShowOnlyForSeasonsThatHaveThem() {
    let withMissed = mapped(
        2024, games: 16, box: ["def_tackles_solo": 60], pfr: ["def_missed_tackles": 7])
    let without = mapped(2016, games: 16, box: ["def_tackles_solo": 60])

    #expect(PlayerStatCategory.tackles.details(withMissed).map(\.short) == ["PER GAME", "MTKL"])
    #expect(PlayerStatCategory.tackles.details(withMissed).map(\.value) == ["3.8", "7"])
    #expect(PlayerStatCategory.tackles.details(without).map(\.short) == ["PER GAME"])
}

@Test func advancedPassingAndRushingFiguresAppendOnlyWhenPublished() {
    let qb = mapped(
        2024, games: 16,
        box: ["attempts": 500, "completions": 330, "passing_yards": 4_000, "passing_cpoe": 0.8],
        ngs: ["avg_time_to_throw": 2.74])
    #expect(
        PlayerStatCategory.passing.details(qb).suffix(2).map { "\($0.value) \($0.short)" } == [
            "2.74 TTT", "+0.8 CPOE",
        ])

    let rb = mapped(
        2024, games: 16, box: ["carries": 200, "rushing_yards": 900],
        pfr: [
            "rushing_yards_before_contact_avg": 3.4, "rushing_yards_after_contact_avg": 1.1,
        ])
    #expect(
        PlayerStatCategory.rushing.details(rb).suffix(2).map { "\($0.value) \($0.short)" } == [
            "3.4 YBC/A", "1.1 YAC/A",
        ])

    let oldRb = mapped(2016, games: 16, box: ["carries": 200, "rushing_yards": 900])
    #expect(PlayerStatCategory.rushing.details(oldRb).count == 2)
}
