#if UITEST_FIXTURES
import Foundation
import Testing
@testable import Depth

/// Records the UI-test fixture bundle from the local seeded Supabase stack.
///
/// This is a **dev tool, not a correctness test**: it writes
/// `Depth/Fixtures/UITestFixtures.json` and is skipped unless `RECORD_UI_FIXTURES=1`.
/// Run it locally with `supabase start` after any change to the seed data or to a Domain
/// `Codable` shape, then commit the regenerated JSON. CI never records — it only replays.
///
///   RECORD_UI_FIXTURES=1 xcodebuild -project Depth.xcodeproj -scheme Depth \
///     -configuration Debug -destination 'platform=iOS Simulator,id=<sim-udid>' \
///     -only-testing:DepthTests/FixtureRecordingTests test
///
/// The encoding is the point: it uses the same Domain `Codable` conformances the SwiftData
/// cache persists, so the fixture shape cannot drift from the app. Add a team or season to
/// `teamsToRecord`/`seasonsToRecord` when a hermetic journey needs one.
struct FixtureRecordingTests {
    private static let shouldRecord = ProcessInfo.processInfo.environment["RECORD_UI_FIXTURES"] == "1"

    /// The teams the hermetic UI journeys open. Add one when a new journey opens a new team.
    private let teamsToRecord = ["bills", "seahawks", "dolphins"]
    /// The historical-roster season the history journeys select. The local seed carries
    /// roster_history only for 2025 (schedules/team_stats go further).
    private let seasonsToRecord = [2025]

    @Test(.enabled(if: FixtureRecordingTests.shouldRecord))
    func recordFixtureBundle() async throws {
        let repo = SupabaseDepthRepository(client: DepthEnvironment.supabaseClient)
        var bundle = UITestFixtureBundle()

        // Whole-app reads: the team list backs the switcher, the uniform list the archive.
        bundle.teams = try await repo.teams()
        bundle.uniforms = try await repo.listUniforms()
        // The update gate is best-effort — a missing app_config row is not a fixture gap.
        bundle.appConfig = try? await repo.appConfig()

        for teamId in teamsToRecord {
            let snapshot = try await repo.teamSnapshot(teamId: teamId)
            bundle.snapshots[teamId] = snapshot
            bundle.teamStats[teamId] = try await repo.teamStats(teamId: teamId)
            if let participation = try? await repo.recentParticipation(teamId: teamId) {
                bundle.recentParticipation[teamId] = participation
            }
            // Player profiles open per-player stats; record them for every player on the
            // recorded rosters so the detail sheet renders real rows, not an empty state.
            for player in snapshot.players {
                if let stats = try? await repo.playerStats(playerId: player.id, teamId: teamId),
                    !stats.isEmpty
                {
                    bundle.playerStats[player.id] = stats
                }
            }
            if let schedule = try? await repo.teamSchedule(teamId: teamId, season: nil) {
                bundle.schedules["\(teamId):default"] = schedule
            }
            for season in seasonsToRecord {
                if let historical = try? await repo.teamSeason(teamId: teamId, season: season) {
                    bundle.seasons["\(teamId):\(season)"] = historical
                }
                if let schedule = try? await repo.teamSchedule(teamId: teamId, season: season) {
                    bundle.schedules["\(teamId):\(season)"] = schedule
                }
                if let leaders = try? await repo.rosterLeaders(teamId: teamId, season: season) {
                    bundle.rosterLeaders["\(teamId):\(season)"] = leaders
                }
            }
        }

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(bundle)

        let outURL = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // FixtureRecordingTests.swift -> DepthTests/
            .deletingLastPathComponent() // DepthTests/ -> repo root
            .appendingPathComponent("Depth/Fixtures/UITestFixtures.json")
        try FileManager.default.createDirectory(
            at: outURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: outURL)
        print("Recorded \(data.count) bytes of UI-test fixtures to \(outURL.path)")
        #expect(FileManager.default.fileExists(atPath: outURL.path))
    }
}
#endif
