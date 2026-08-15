import Foundation
import SwiftData
import Testing

@testable import Depth

// Task 8D coverage: About-section version/build formatting, the "Saved on this device"
// timestamp copy (Settings' Data section and the team-detail banner), and the two view
// models that capture the underlying cache timestamps. See
// `.superpowers/sdd/2026-08-14-native-ios-app/task-8d-settings-about-timestamps-brief.md`.

@Test func versionAndBuildFormatsBothPresentValues() {
    #expect(formattedVersionAndBuild(version: "1.2.3", build: "42") == "1.2.3 (42)")
}

@Test func versionAndBuildFallsBackGracefullyWhenMissing() {
    #expect(formattedVersionAndBuild(version: nil, build: nil) == "\u{2014} (\u{2014})")
    #expect(formattedVersionAndBuild(version: "", build: "7") == "\u{2014} (7)")
}

@Test func savedOnDeviceLabelReportsNotSavedYetWithNoCache() {
    #expect(DataTimestamp.savedOnDeviceLabel(nil) == DataTimestamp.notSavedYet)
}

@Test func savedOnDeviceLabelFormatsRelativeToProvidedNowAndLocale() {
    let now = Date(timeIntervalSince1970: 10_000)
    let cachedAt = now.addingTimeInterval(-3600)

    let label = DataTimestamp.savedOnDeviceLabel(
        cachedAt, now: now, locale: Locale(identifier: "en_US"), timeZone: TimeZone(identifier: "UTC")!
    )

    #expect(label == "Saved on this device 1 hour ago")
}

private actor FakeDepthRepository: DepthRepository {
    var teamsResult: Result<[Team], Error>
    var snapshotResults: [String: Result<TeamSnapshot, Error>] = [:]

    init(teamsResult: Result<[Team], Error>) {
        self.teamsResult = teamsResult
    }

    func teams() async throws -> [Team] { try teamsResult.get() }

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        guard let result = snapshotResults[teamId] else { throw DepthError.notFound }
        return try result.get()
    }

    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }

    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.notFound
    }

    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }

    func appConfig() async throws -> AppConfig {
        AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil)
    }

    func setSnapshotResult(_ result: Result<TeamSnapshot, Error>, forTeam teamId: String) {
        snapshotResults[teamId] = result
    }
}

private func inMemoryStore() -> CachedSnapshotStore {
    let schema = Schema(DepthCacheSchema.models)
    let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: schema, configurations: [configuration])
    return CachedSnapshotStore(modelContainer: container)
}

private func team(id: String = "bills") -> Team {
    Team(
        id: id, city: "Buffalo", name: "Bills", abbrev: "BUF", conference: "AFC", division: "East",
        colors: TeamColors(primary: "#00338d", secondary: "#d50a0a", accent: "#d50a0a", uiAccent: "#d50a0a", onAccent: "#fff"),
        logo: nil, logoDark: nil
    )
}

private func snapshot(teamId: String = "bills") -> TeamSnapshot {
    TeamSnapshot(team: team(id: teamId), players: [], specialTeams: [], uniforms: [])
}

@Test @MainActor func teamListViewModelCapturesCachedAtOnlyAfterAValidLoad() async {
    let underlying = FakeDepthRepository(teamsResult: .success([team()]))
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamListViewModel(repository: repository)

    #expect(model.cachedAt == nil)
    await model.load()
    #expect(model.cachedAt != nil)
}

@Test @MainActor func teamListViewModelLeavesCachedAtUnsetAfterAFailedLoad() async {
    let underlying = FakeDepthRepository(teamsResult: .failure(DepthError.offline))
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamListViewModel(repository: repository)

    await model.load()

    #expect(model.cachedAt == nil)
    if case .failed = model.loadState {
        // expected
    } else {
        Issue.record("expected a failed load state")
    }
}

@Test @MainActor func teamDetailViewModelCapturesCachedAtAndTracksStaleness() async {
    let underlying = FakeDepthRepository(teamsResult: .success([]))
    await underlying.setSnapshotResult(.success(snapshot()), forTeam: "bills")
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamDetailViewModel(teamId: "bills", repository: repository)

    await model.load()

    #expect(model.cachedAt != nil)
    #expect(model.isStale == false, "a snapshot just cached must not read as stale")
}
