import Foundation
import Testing

@testable import Depth

// Deterministic feature-state tests. Authorization itself remains covered by the real
// local Supabase actor-matrix and Edge Function suites; these prove UI recovery contracts.
private actor FakeAuthService: DepthAuthServicing {
    var sentEmails: [(String, Bool)] = []
    var verifiedCodes: [(String, String)] = []
    var sendError: DepthAuthError?
    var verifyError: DepthAuthError?
    var refreshError: DepthAuthError?
    var deletionError: DepthAuthError?
    var signedOut = false
    var deletionCalls = 0
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
        sentEmails.append((email, shouldCreateUser))
    }

    func verifyEmailOtp(email: String, code: String) throws -> DepthUser {
        if let verifyError { throw verifyError }
        verifiedCodes.append((email, code))
        return user
    }

    func refreshSession() throws -> DepthUser {
        if let refreshError { throw refreshError }
        return user
    }

    func signOut() { signedOut = true }

    func deleteAccount() throws {
        deletionCalls += 1
        if let deletionError { throw deletionError }
    }

    func setVerifyError(_ error: DepthAuthError?) { verifyError = error }
    func setRefreshError(_ error: DepthAuthError?) { refreshError = error }
    func setDeletionError(_ error: DepthAuthError?) { deletionError = error }
    func sentEmailValues() -> [(String, Bool)] { sentEmails }
    func verifiedCodeValues() -> [(String, String)] { verifiedCodes }
    func didSignOut() -> Bool { signedOut }
    func deletionCallCount() -> Int { deletionCalls }
}

private actor AsyncCounter {
    private var count = 0
    func increment() { count += 1 }
    func value() -> Int { count }
}

@Test @MainActor func authRejectsInvalidEmailBeforeNetwork() async {
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    let model = AuthFlowViewModel(service: service, sessionStore: store)
    model.email = "not-an-email"

    await model.sendCode()

    #expect(model.error == .invalidEmail)
    #expect(await service.sentEmailValues().isEmpty)
}

@Test @MainActor func authNormalizesEmailAndEnforcesResendTimer() async {
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    let now = Date(timeIntervalSince1970: 100)
    let model = AuthFlowViewModel(service: service, sessionStore: store, now: { now })
    model.email = " Owner@Example.COM "

    await model.sendCode()
    await model.sendCode()

    #expect(model.step == .code)
    #expect(await service.sentEmailValues().map(\.0) == ["owner@example.com"])
    #expect(model.resendAvailableAt == now.addingTimeInterval(60))
}

@Test @MainActor func expiredOtpKeepsRetryableCodeState() async {
    let service = FakeAuthService()
    await service.setVerifyError(.expiredCode)
    let store = AuthSessionStore(service: service)
    let model = AuthFlowViewModel(service: service, sessionStore: store)
    model.email = "owner@example.com"
    await model.sendCode()
    model.code = "123456"

    #expect(await model.verifyCode() == false)
    #expect(model.step == .code)
    #expect(model.code == "123456")
    #expect(model.error == .expiredCode)
    #expect(store.user == nil)
}

@Test @MainActor func verifiedOtpUpdatesSessionWithoutLeavingPublicFlow() async {
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    let model = AuthFlowViewModel(service: service, sessionStore: store)
    model.email = "owner@example.com"
    await model.sendCode()
    model.code = "123456"

    #expect(await model.verifyCode())
    #expect(store.user?.email == "owner@example.com")
    #expect(await service.verifiedCodeValues().map(\.1) == ["123456"])
}

@Test @MainActor func expiredSessionClearsPrivateIdentity() async {
    let service = FakeAuthService()
    await service.setRefreshError(.unauthenticated)
    let store = AuthSessionStore(service: service)
    store.accept(DepthUser(id: UUID(), email: "owner@example.com"))

    await store.refresh()

    #expect(store.user == nil)
}

@Test @MainActor func deletionFailureKeepsSessionAndPrivateData() async {
    let service = FakeAuthService()
    await service.setDeletionError(.deletionFailed(correlationId: "support-123"))
    let store = AuthSessionStore(service: service)
    store.accept(service.user)
    let cleanupCount = AsyncCounter()
    let model = AccountDeletionViewModel(
        email: "owner@example.com",
        service: service,
        sessionStore: store,
        clearPrivateData: { await cleanupCount.increment() }
    )
    await model.requestFreshCode()
    model.code = "123456"

    #expect(await model.confirmDeletion() == false)
    #expect(store.user != nil)
    #expect(await cleanupCount.value() == 0)
    #expect(model.error == .deletionFailed(correlationId: "support-123"))
}

@Test @MainActor func deletionCodeRequestEnforcesResendTimer() async {
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    let now = Date(timeIntervalSince1970: 100)
    let model = AccountDeletionViewModel(
        email: "owner@example.com",
        service: service,
        sessionStore: store,
        now: { now }
    )

    await model.requestFreshCode()
    await model.requestFreshCode()

    #expect(await service.sentEmailValues().map(\.0) == ["owner@example.com"])
    #expect(model.resendAvailableAt == now.addingTimeInterval(60))
}

@Test @MainActor func failedDeletionReauthenticationNeverCallsFunction() async {
    let service = FakeAuthService()
    await service.setVerifyError(.expiredCode)
    let store = AuthSessionStore(service: service)
    store.accept(service.user)
    let model = AccountDeletionViewModel(
        email: "owner@example.com",
        service: service,
        sessionStore: store
    )
    await model.requestFreshCode()
    model.code = "123456"

    #expect(await model.confirmDeletion() == false)
    #expect(store.user != nil)
    #expect(model.error == .expiredCode)
    #expect(await service.deletionCallCount() == 0)
}

@Test @MainActor func confirmedDeletionSignsOutAndCleansPrivateData() async {
    let service = FakeAuthService()
    let store = AuthSessionStore(service: service)
    store.accept(service.user)
    let cleanupCount = AsyncCounter()
    let model = AccountDeletionViewModel(
        email: "owner@example.com",
        service: service,
        sessionStore: store,
        clearPrivateData: { await cleanupCount.increment() }
    )
    await model.requestFreshCode()
    model.code = "123456"

    #expect(await model.confirmDeletion())
    #expect(store.user == nil)
    #expect(await cleanupCount.value() == 1)
    #expect(await service.didSignOut())
}

@Test func persistedOverrideProjectionReranksPlayersAndKeepsRosterAdditions() {
    let colors = TeamColors(
        primary: "#000000",
        secondary: "#111111",
        accent: "#222222",
        uiAccent: "#FFFFFF",
        onAccent: "#000000"
    )
    let snapshot = TeamSnapshot(
        team: Team(
            id: "test",
            city: "Test",
            name: "Team",
            abbrev: "TST",
            conference: "AFC",
            division: "West",
            colors: colors,
            logo: nil,
            logoDark: nil
        ),
        players: [
            Player(id: "a", position: .qb, depthRank: 1, number: 10),
            Player(id: "b", position: .qb, depthRank: 2, number: 20),
            Player(id: "new", position: .qb, depthRank: 3, number: 30),
        ],
        specialTeams: [],
        uniforms: []
    )

    let projected = applyingDepthOverrides(
        to: snapshot,
        orders: [.qb: ["removed", "b", "a"]]
    )
    let quarterbacks = projected.players.filter { $0.position == .qb }.sorted(by: byDepthOrder)

    #expect(quarterbacks.map(\.id) == ["b", "a", "new"])
    #expect(quarterbacks.map(\.depthRank) == [1, 2, 3])
    #expect(quarterbacks.map(\.order) == [0, 1, 2])
}

@Test func rerankedPlayersPreservesProfileFieldsAndStatus() {
    // DEP-226: the projection must carry every profile field through the rebuild — a
    // partial reconstruction silently wiped college/bio/vitals (the card opened from a
    // team with a custom order showed them blank).
    let college = Player(
        id: "c", position: .qb, depthRank: 1, number: 7, status: .starter,
        age: 24, college: "Georgia", experience: 2, height: "6'2\"", weight: 215,
        bio: "Chip off the old block", photoUrl: "https://example.com/c.jpg"
    )
    let backup = Player(id: "b", position: .qb, depthRank: 2, number: 12, status: .backup)

    let reranked = rerankedPlayers([backup, college])

    #expect(reranked.map(\.id) == ["b", "c"])
    #expect(reranked[0].status == .starter)
    #expect(reranked[1].status == .backup)
    #expect(reranked[1].college == "Georgia")
    #expect(reranked[1].bio == "Chip off the old block")
    #expect(reranked[1].age == 24)
    #expect(reranked[1].height == "6'2\"")
    #expect(reranked[1].weight == 215)
    #expect(reranked[1].photoUrl == "https://example.com/c.jpg")
}

@Test func rerankedPlayersPreservesRookieAndInjuredStatus() {
    // Web's statusForRank keeps rookie/injured regardless of the new rank.
    let rookie = Player(id: "r", position: .qb, depthRank: 3, number: 15, status: .rookie)
    let injured = Player(id: "i", position: .qb, depthRank: 2, number: 9, status: .injured)

    let reranked = rerankedPlayers([rookie, injured])

    #expect(reranked[0].status == .rookie)
    #expect(reranked[1].status == .injured)
}

@Test func rerankedPlayersCapsRankAtThree() {
    // Mirrors web: depthRank is capped 1..3, deeper slots read as "reserve".
    let players = (0..<5).map { Player(id: "p\($0)", position: .qb, depthRank: $0 + 1, number: $0) }

    let reranked = rerankedPlayers(players)

    #expect(reranked.map(\.depthRank) == [1, 2, 3, 3, 3])
    #expect(reranked.map(\.order) == [0, 1, 2, 3, 4])
}
