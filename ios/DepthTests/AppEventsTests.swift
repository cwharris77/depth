import Foundation
import SwiftData
import Testing

@testable import Depth

// Task 8F coverage: privacy-minimal telemetry (design spec Milestone 2B item 26; full
// App Privacy documentation at docs/ios-privacy-telemetry.md). Every case here proves
// either that the right event fires exactly once, or that a repeated/background action
// does NOT re-fire it — both matter for a usage-counter product metric.

@Test func appEventNamesMatchTheAppEventsCheckConstraint() {
    #expect(AppEvent.appLaunch.name == "app_launch")
    #expect(AppEvent.depthChartReached.name == "depth_chart_reached")
    #expect(AppEvent.authStarted.name == "auth_started")
    #expect(AppEvent.authCompleted.name == "auth_completed")
    #expect(AppEvent.overrideSaved.name == "override_saved")
    #expect(AppEvent.error(category: "offline").name == "error")
}

@Test func onlyTheErrorCaseCarriesAnErrorCategory() {
    #expect(AppEvent.appLaunch.errorCategory == nil)
    #expect(AppEvent.error(category: "offline").errorCategory == "offline")
}

@Test func depthErrorTelemetryCategoriesMatchTheDBCheckConstraintVocabulary() {
    let expected: [(DepthError, String)] = [
        (.notFound, "notFound"),
        (.offline, "offline"),
        (.unauthenticated, "unauthenticated"),
        (.permissionDenied, "permissionDenied"),
        (.validation("x"), "validation"),
        (.incompatibleBuild, "incompatibleBuild"),
        (.server("x"), "server"),
        (.decoding("x"), "decoding"),
    ]
    for (error, category) in expected {
        #expect(error.telemetryCategory == category)
    }
}

@Test func authErrorTelemetryCategoriesReuseTheDepthErrorVocabulary() {
    let expected: [(DepthAuthError, String)] = [
        (.invalidEmail, "validation"),
        (.invalidCode, "validation"),
        (.expiredCode, "validation"),
        (.rateLimited, "validation"),
        (.freshOtpRequired, "validation"),
        (.offline, "offline"),
        (.unauthenticated, "unauthenticated"),
        (.server, "server"),
        (.deletionFailed(correlationId: nil), "server"),
    ]
    for (error, category) in expected {
        #expect(error.telemetryCategory == category)
    }
}

// MARK: - TeamListViewModel

private actor FakeTeamsRepository: DepthRepository {
    var teamsResult: Result<[Team], Error>

    init(teamsResult: Result<[Team], Error>) { self.teamsResult = teamsResult }

    func teams() async throws -> [Team] { try teamsResult.get() }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }
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

@Test @MainActor func teamListLoadFailureRecordsOneErrorEventWithItsCategory() async {
    let recorder = RecordingAppEventsRecorder()
    let underlying = FakeTeamsRepository(teamsResult: .failure(DepthError.offline))
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamListViewModel(repository: repository, events: recorder)

    await model.load()

    #expect(recorder.events() == [.error(category: "offline")])
}

@Test @MainActor func teamListLoadSuccessRecordsNoEvent() async {
    let recorder = RecordingAppEventsRecorder()
    let underlying = FakeTeamsRepository(teamsResult: .success([team()]))
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamListViewModel(repository: repository, events: recorder)

    await model.load()

    #expect(recorder.events().isEmpty)
}

// MARK: - TeamDetailViewModel

private actor FakeSnapshotRepository: DepthRepository {
    var snapshotResults: [String: Result<TeamSnapshot, Error>]

    init(snapshotResults: [String: Result<TeamSnapshot, Error>]) { self.snapshotResults = snapshotResults }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        guard let result = snapshotResults[teamId] else { throw DepthError.notFound }
        return try result.get()
    }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule { throw DepthError.notFound }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func appConfig() async throws -> AppConfig { AppConfig(minimumSupportedBuild: 1, maintenanceMessage: nil) }

    func setSnapshotResult(_ result: Result<TeamSnapshot, Error>, forTeam teamId: String) {
        snapshotResults[teamId] = result
    }
}

private func snapshot(teamId: String = "bills") -> TeamSnapshot {
    TeamSnapshot(team: team(id: teamId), players: [], specialTeams: [], uniforms: [])
}

@Test @MainActor func teamDetailFirstSuccessfulLoadRecordsDepthChartReachedExactlyOnce() async {
    let recorder = RecordingAppEventsRecorder()
    let underlying = FakeSnapshotRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamDetailViewModel(teamId: "bills", repository: repository, events: recorder)

    await model.load()
    await model.load()  // a foreground/pull-to-refresh reload must not re-fire the funnel step

    #expect(recorder.events() == [.depthChartReached])
}

@Test @MainActor func teamDetailLoadFailureWithNoPriorSnapshotRecordsOneErrorEvent() async {
    let recorder = RecordingAppEventsRecorder()
    let underlying = FakeSnapshotRepository(snapshotResults: [:])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamDetailViewModel(teamId: "bills", repository: repository, events: recorder)

    await model.load()

    #expect(recorder.events() == [.error(category: "notFound")])
}

@Test @MainActor func teamDetailBackgroundRefreshFailureAfterAGoodSnapshotRecordsNoEvent() async {
    let recorder = RecordingAppEventsRecorder()
    let underlying = FakeSnapshotRepository(snapshotResults: ["bills": .success(snapshot())])
    let repository = CachingDepthRepository(underlying: underlying, store: inMemoryStore())
    let model = TeamDetailViewModel(teamId: "bills", repository: repository, events: recorder)

    await model.load()  // succeeds, records depthChartReached
    await underlying.setSnapshotResult(.failure(DepthError.server("boom")), forTeam: "bills")
    await model.load()  // fails, but a snapshot is already on screen — no error event

    #expect(recorder.events() == [.depthChartReached])
}

// MARK: - AuthFlowViewModel

private actor FakeAuthService: DepthAuthServicing {
    var sendError: DepthAuthError?
    var verifyError: DepthAuthError?
    let user = DepthUser(id: UUID(), email: "owner@example.com")

    func sessionChanges() -> AsyncStream<DepthUser?> {
        AsyncStream { continuation in
            continuation.yield(nil)
            continuation.finish()
        }
    }
    func currentUser() -> DepthUser? { nil }
    func sendEmailOtp(to email: String, shouldCreateUser: Bool) throws {
        if let sendError { throw sendError }
    }
    func verifyEmailOtp(email: String, code: String) throws -> DepthUser {
        if let verifyError { throw verifyError }
        return user
    }
    func refreshSession() throws -> DepthUser { user }
    func signOut() {}
    func deleteAccount() throws {}
    func setSendError(_ error: DepthAuthError?) { sendError = error }
    func setVerifyError(_ error: DepthAuthError?) { verifyError = error }
}

@Test @MainActor func authStartedRecordsOnceOnASuccessfulSend() async {
    let recorder = RecordingAppEventsRecorder()
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    let model = AuthFlowViewModel(service: service, sessionStore: store, events: recorder)
    model.email = "owner@example.com"

    await model.sendCode()

    #expect(recorder.events() == [.authStarted])
}

@Test @MainActor func authSendFailureRecordsAnErrorEventNotAuthStarted() async {
    let recorder = RecordingAppEventsRecorder()
    let service = FakeAuthService()
    await service.setSendError(.rateLimited)
    let store = AuthSessionStore(service: service)
    let model = AuthFlowViewModel(service: service, sessionStore: store, events: recorder)
    model.email = "owner@example.com"

    await model.sendCode()

    #expect(recorder.events() == [.error(category: "validation")])
}

@Test @MainActor func authCompletedRecordsOnceOnASuccessfulVerify() async {
    let recorder = RecordingAppEventsRecorder()
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    let model = AuthFlowViewModel(service: service, sessionStore: store, events: recorder)
    model.email = "owner@example.com"
    await model.sendCode()
    model.code = "123456"

    _ = await model.verifyCode()

    #expect(recorder.events() == [.authStarted, .authCompleted])
}

// MARK: - OverrideEditorViewModel

private actor FakeOverrideWriter: DepthOverrideWriting {
    var error: DepthError?
    func save(teamId: String, position: String, playerIds: [String]) async throws {
        if let error { throw error }
    }
    func clear(teamId: String, position: String) async throws {
        if let error { throw error }
    }
    func setError(_ error: DepthError?) { self.error = error }
}

@Test @MainActor func overrideSaveSuccessRecordsOverrideSavedExactlyOnce() async {
    let recorder = RecordingAppEventsRecorder()
    let writer = FakeOverrideWriter()
    let model = OverrideEditorViewModel(
        teamId: "bills", position: "QB", playerIds: ["a", "b"], writer: writer, events: recorder
    )
    model.draftPlayerIds = ["b", "a"]

    #expect(await model.save())

    #expect(recorder.events() == [.overrideSaved])
}

@Test @MainActor func overrideSaveValidationFailureRecordsAnErrorEventBeforeAnyNetworkCall() async {
    let recorder = RecordingAppEventsRecorder()
    let writer = FakeOverrideWriter()
    let model = OverrideEditorViewModel(
        teamId: "bills", position: "QB", playerIds: ["a", "b"], writer: writer, events: recorder
    )
    model.draftPlayerIds = []

    #expect(await model.save() == false)

    #expect(recorder.events() == [.error(category: "validation")])
}

@Test @MainActor func overrideSaveWriteFailureRecordsAnErrorEventWithItsCategory() async {
    let recorder = RecordingAppEventsRecorder()
    let writer = FakeOverrideWriter()
    await writer.setError(.offline)
    let model = OverrideEditorViewModel(
        teamId: "bills", position: "QB", playerIds: ["a", "b"], writer: writer, events: recorder
    )
    model.draftPlayerIds = ["b", "a"]

    #expect(await model.save() == false)

    #expect(recorder.events() == [.error(category: "offline")])
}
