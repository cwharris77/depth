import Foundation
import Testing

@testable import Depth

// The profile's lead claim: the career high the fewest players have reached, at most ten,
// worded from the file's own rank and count.

private func mark(
    _ value: Double, rank: Int, atOrAbove: Int, season: Int = 2011, week: Int? = nil,
    team: String? = "lions", opponent: String? = nil
) -> PlayerHighlight {
    PlayerHighlight(
        value: value, season: season, week: week, teamId: team, gameId: nil,
        opponentId: opponent, allTimeRank: rank, playersAtOrAbove: atOrAbove, teamRank: nil,
        teamPlayersAtOrAbove: nil)
}

private func highlights(
    _ entries: [RecordStat: [RecordKind: PlayerHighlight]],
    coverage: RecordCoverage? = RecordCoverage(fromSeason: 1999, toSeason: 2026)
) -> PlayerHighlights {
    PlayerHighlights(coverage: coverage, entries: entries)
}

@Test func theRarestMarkLeadsWithItsCountAndContext() throws {
    let claim = try #require(
        PlayerKnownForBuilder.claim(
            highlights([
                .passingYards: [
                    .singleGame: mark(
                        520, rank: 4, atOrAbove: 4, week: 17, opponent: "packers"),
                    .singleSeason: mark(5100, rank: 7, atOrAbove: 7),
                ],
                .passingTds: [.singleSeason: mark(46, rank: 5, atOrAbove: 6, season: 2025)],
            ])))
    #expect(claim.stat == .passingYards)
    #expect(claim.kind == .singleGame)
    #expect(claim.headline == "The 4th-most passing yards in a game since 1999.")
    #expect(claim.valueText == "520")
    #expect(claim.when == "Week 17, 2011")
    #expect(claim.matchup == "Lions vs. Packers")
    #expect(
        claim.comparator == "3 other players have reached 520 passing yards in a game since 1999.")
    #expect(claim.scope == "Regular season, 1999–2026 · each player’s best")
}

@Test func aSharedMarkReadsAsATie() throws {
    let claim = try #require(
        PlayerKnownForBuilder.claim(
            highlights([.passingTds: [.singleSeason: mark(46, rank: 5, atOrAbove: 6, team: "rams")]]
            )))
    #expect(claim.headline == "Tied for the 5th-most passing touchdowns in a season since 1999.")
    #expect(claim.when == "2011 season")
    #expect(claim.matchup == "Rams")
    #expect(
        claim.comparator
            == "5 other players have reached 46 passing touchdowns in a season since 1999.")
}

@Test func aRecordSaysNoOneElseHasReachedIt() throws {
    let claim = try #require(
        PlayerKnownForBuilder.claim(
            highlights([
                .receivingYards: [.singleSeason: mark(1964, rank: 1, atOrAbove: 1, team: "49ers")]
            ])))
    #expect(claim.headline == "The most receiving yards in a season since 1999.")
    #expect(claim.valueText == "1,964")
    #expect(claim.when == "2011 season")
    #expect(claim.matchup == "49ers")
    #expect(
        claim.comparator
            == "No other player has reached 1,964 receiving yards in a season since 1999.")
}

@Test func anEqualCountPrefersTheSeasonTotal() throws {
    let claim = try #require(
        PlayerKnownForBuilder.claim(
            highlights([
                .rushingYards: [
                    .singleGame: mark(296, rank: 1, atOrAbove: 2),
                    .singleSeason: mark(2097, rank: 2, atOrAbove: 2),
                ]
            ])))
    #expect(claim.kind == .singleSeason)
}

@Test func noClaimWithoutARareMarkOrACoverageWindow() {
    #expect(
        PlayerKnownForBuilder.claim(
            highlights([.rushingYards: [.singleSeason: mark(207, rank: 604, atOrAbove: 604)]]))
            == nil)
    #expect(
        PlayerKnownForBuilder.claim(
            highlights(
                [.passingYards: [.singleGame: mark(520, rank: 4, atOrAbove: 4)]], coverage: nil))
            == nil)
    #expect(PlayerKnownForBuilder.claim(nil) == nil)
}
