import Testing
@testable import Depth

// Cross-language parity coverage for DEP-313. The fixture's expected values come from
// TypeScript's live buildRecentParticipation implementation, while the direct cases
// pin Swift-only boundary behavior for no rows and internally mixed winning windows.
private struct RecentParticipationFixtureCase: Decodable {
    let description: String
    let input: [RecentParticipationDTO]
    let expected: RecentParticipation
}

private func participationRow(
    playerId: String,
    windowEndWeek: Int = 17
) -> RecentParticipationDTO {
    RecentParticipationDTO(
        teamId: "chiefs",
        season: 2025,
        playerId: playerId,
        windowStartWeek: 15,
        windowEndWeek: windowEndWeek,
        windowGameIds: ["g15", "g16", "g17"],
        games: 3,
        offenseSnaps: 180,
        offensePercentage: 1,
        defenseSnaps: 0,
        defensePercentage: 0,
        specialTeamsSnaps: 0,
        specialTeamsPercentage: nil,
        source: "nflverse-pfr",
        updatedAt: "2026-01-05T12:00:00.000Z"
    )
}

@Suite struct RecentParticipationMapperTests {
    @Test func matchesTypeScriptDomainFixture() throws {
        let cases = try loadFixture(
            "recent-participation",
            as: [RecentParticipationFixtureCase].self
        )

        for fixture in cases {
            #expect(
                try RecentParticipationMapper.map(fixture.input) == fixture.expected,
                "\(fixture.description)"
            )
        }
    }

    @Test func emptyRowsReturnNil() throws {
        #expect(try RecentParticipationMapper.map([]) == nil)
    }

    @Test func mixedWinningMetadataThrows() {
        let rows = [
            participationRow(playerId: "first"),
            participationRow(playerId: "second", windowEndWeek: 18),
        ]

        #expect(throws: DepthError.decoding("inconsistent recent participation metadata")) {
            try RecentParticipationMapper.map(rows)
        }
    }
}
