#if UITEST_FIXTURES
import Foundation
import Testing
@testable import Depth

/// Verifies the fixture bundle the hermetic UI suite depends on: it decodes, it serves the
/// teams the journeys open, and a missing entry fails loudly rather than rendering empty
/// (spec: 2026-09-10-ios-test-data-and-snapshot-testing-design, locked decision 1).
///
/// `FixtureDepthRepository.load()` reads `Bundle.main` — under a hosted unit test that is
/// the Depth app, so this also proves the JSON is actually bundled, not just present on disk.
struct FixtureDepthRepositoryTests {
    @Test func bundleDecodesAndServesTheJourneyTeams() async throws {
        let repo = FixtureDepthRepository.load()

        let teams = try await repo.teams()
        #expect(teams.count == 32)

        // The two teams the hermetic journeys open and the fields they assert on.
        let bills = try await repo.teamSnapshot(teamId: "bills")
        #expect(bills.team.id == "bills")
        #expect(!bills.players.isEmpty)
        #expect(try await repo.teamSnapshot(teamId: "seahawks").team.id == "seahawks")

        #expect(!(try await repo.listUniforms()).isEmpty)

        let schedule = try await repo.teamSchedule(teamId: "bills", season: nil)
        #expect(!schedule.games.isEmpty)
    }

    @Test func missingTeamFailsLoudlyRatherThanRenderingEmpty() async {
        let repo = FixtureDepthRepository.load()
        await #expect(throws: DepthError.notFound) {
            _ = try await repo.teamSnapshot(teamId: "no-such-team")
        }
    }
}
#endif
