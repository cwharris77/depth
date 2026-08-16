import Foundation
import Testing
@testable import Depth

// DEP-219: the local write must always succeed and never depend on the remote leg —
// mirrors web's pushTeamOverride, which writes localStorage unconditionally and treats
// the server mirror as fire-and-forget.
private actor FakeOverrideWriter: DepthOverrideWriting {
    private(set) var savedCalls: [(teamId: String, position: String, playerIds: [String])] = []
    private var error: DepthError?

    func setError(_ error: DepthError?) {
        self.error = error
    }

    func save(teamId: String, position: String, playerIds: [String]) async throws {
        savedCalls.append((teamId, position, playerIds))
        if let error { throw error }
    }
}

@MainActor
struct LocalFirstOverrideWriterTests {
    private func freshPreferences() -> UserPreferences {
        let suiteName = "LocalFirstOverrideWriterTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        return UserPreferences(defaults: defaults)
    }

    @Test func writesLocallyEvenWithNoRemote() async throws {
        let preferences = freshPreferences()
        let writer = LocalFirstOverrideWriter(preferences: preferences, remote: nil)

        try await writer.save(teamId: "giants", position: "QB", playerIds: ["p1", "p2"])

        #expect(preferences.teamOverride(for: "giants") == [.qb: ["p1", "p2"]])
    }

    @Test func mirrorsToRemoteWhenSignedIn() async throws {
        let preferences = freshPreferences()
        let remote = FakeOverrideWriter()
        let writer = LocalFirstOverrideWriter(preferences: preferences, remote: remote)

        try await writer.save(teamId: "giants", position: "QB", playerIds: ["p1"])

        #expect(preferences.teamOverride(for: "giants") == [.qb: ["p1"]])
        let calls = await remote.savedCalls
        #expect(calls.count == 1)
        #expect(calls.first?.teamId == "giants")
    }

    @Test func remoteFailureNeverSurfacesAndLocalWriteStands() async throws {
        let preferences = freshPreferences()
        let remote = FakeOverrideWriter()
        await remote.setError(.offline)
        let writer = LocalFirstOverrideWriter(preferences: preferences, remote: remote)

        // Must not throw — a dropped remote request is fire-and-forget, exactly like
        // web's pushTeamOverride catch{} that ignores failures.
        try await writer.save(teamId: "giants", position: "QB", playerIds: ["p1"])

        #expect(preferences.teamOverride(for: "giants") == [.qb: ["p1"]])
    }
}
