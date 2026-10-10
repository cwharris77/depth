import Foundation
import Testing

@testable import Depth

private actor RecordingSubscriptionService: PushSubscriptionServicing {
    private(set) var registrations: [PushRegistration] = []
    private var failing = false

    func setFailing(_ value: Bool) { failing = value }

    func register(_ registration: PushRegistration) async throws {
        if failing { throw DepthError.offline }
        registrations.append(registration)
    }
}

@MainActor
private final class FakeAuthorizer: NotificationAuthorizing {
    var current: NotificationAuthorization
    var grantOnRequest: Bool
    private(set) var requestCount = 0
    private(set) var registerCount = 0

    init(_ current: NotificationAuthorization, grantOnRequest: Bool = true) {
        self.current = current
        self.grantOnRequest = grantOnRequest
    }

    func status() async -> NotificationAuthorization { current }

    func request() async -> Bool {
        requestCount += 1
        current = grantOnRequest ? .authorized : .denied
        return grantOnRequest
    }

    func registerForRemoteNotifications() { registerCount += 1 }
}

private func isolatedPreferences() -> UserPreferences {
    let suite = "NotificationSettingsStoreTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite) ?? .standard
    defaults.removePersistentDomain(forName: suite)
    return UserPreferences(defaults: defaults)
}

private let token = Data(repeating: 0xAB, count: 32)
private let tokenHex = String(repeating: "ab", count: 32)

@MainActor
private func makeStore(
    authorizer: FakeAuthorizer,
    service: RecordingSubscriptionService = RecordingSubscriptionService(),
    preferences: UserPreferences = isolatedPreferences(),
    isEnabled: Bool = true
) -> NotificationSettingsStore {
    NotificationSettingsStore(
        service: service, authorizer: authorizer, preferences: preferences,
        bundleId: "com.cwharris.depth.staging", environment: "sandbox",
        isEnabled: { isEnabled })
}

@MainActor @Test func tierDefaultsToBigMoments() {
    #expect(makeStore(authorizer: FakeAuthorizer(.notDetermined)).tier == .bigMoments)
}

@MainActor @Test func enablingAsksOnceRegistersAndSyncsWhenTheTokenArrives() async {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined)
    let store = makeStore(authorizer: authorizer, service: service)

    #expect(await store.enable(teamId: "seahawks"))
    #expect(authorizer.requestCount == 1)
    #expect(authorizer.registerCount == 1)
    #expect(await service.registrations.isEmpty)

    await store.handleDeviceToken(token)
    #expect(
        await service.registrations == [
            PushRegistration(
                token: tokenHex, teamId: "seahawks", tier: .bigMoments,
                bundleId: "com.cwharris.depth.staging", environment: "sandbox")
        ])
}

@MainActor @Test func aDeclinedSystemPromptRegistersNothing() async {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined, grantOnRequest: false)
    let store = makeStore(authorizer: authorizer, service: service)

    #expect(await store.enable(teamId: "seahawks") == false)
    #expect(authorizer.registerCount == 0)
    #expect(store.authorization == .denied)
    #expect(await service.registrations.isEmpty)
}

@MainActor @Test func changingTheTierSyncsTheNewValue() async {
    let service = RecordingSubscriptionService()
    let store = makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.setTier(.everything, candidateTeamId: "bills")

    #expect(await service.registrations.map(\.tier) == [.bigMoments, .everything])
    // An explicit team is never replaced by the candidate.
    #expect(await service.registrations.last?.teamId == "seahawks")
}

@MainActor @Test func anUnchangedRegistrationIsNotSentAgain() async {
    let service = RecordingSubscriptionService()
    let store = makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.refresh()
    await store.handleDeviceToken(token)
    #expect(await service.registrations.count == 1)
}

@MainActor @Test func aFailedSyncIsRetriedOnTheNextRefresh() async {
    let service = RecordingSubscriptionService()
    let store = makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await service.setFailing(true)
    await store.handleDeviceToken(token)
    #expect(await service.registrations.isEmpty)

    await service.setFailing(false)
    await store.refresh()
    #expect(await service.registrations.count == 1)
}

@MainActor @Test func revokingPermissionInSystemSettingsSyncsOffAndKeepsTheChoice() async {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.authorized)
    let store = makeStore(authorizer: authorizer, service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)

    authorizer.current = .denied
    await store.refresh()

    #expect(await service.registrations.map(\.tier) == [.bigMoments, .off])
    #expect(store.tier == .bigMoments)
    #expect(authorizer.requestCount == 0)
}

@MainActor @Test func turningOffEverythingDropsBackToBigMoments() async {
    let service = RecordingSubscriptionService()
    let store = makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.setTier(.everything, candidateTeamId: nil)
    await store.turnOffEverything()

    #expect(store.tier == .bigMoments)
    #expect(await service.registrations.last?.tier == .bigMoments)
}

@MainActor @Test func pickingATierWhileUndeterminedAsksAndAdoptsTheCandidateTeam() async {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined)
    let store = makeStore(authorizer: authorizer, service: service)

    await store.setTier(.everything, candidateTeamId: "bills")
    await store.handleDeviceToken(token)

    #expect(authorizer.requestCount == 1)
    #expect(store.teamId == "bills")
    #expect(await service.registrations.last?.tier == .everything)
}

@MainActor @Test func choosingOffWhileUndeterminedDoesNotAsk() async {
    let authorizer = FakeAuthorizer(.notDetermined)
    let store = makeStore(authorizer: authorizer)
    await store.setTier(.off, candidateTeamId: "bills")
    #expect(authorizer.requestCount == 0)
    #expect(store.tier == .off)
}

@MainActor @Test func nothingHappensWhileTheFlagIsOff() async {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.authorized)
    let store = makeStore(authorizer: authorizer, service: service, isEnabled: false)

    #expect(await store.enable(teamId: "seahawks") == false)
    await store.handleDeviceToken(token)
    await store.refresh()

    #expect(authorizer.registerCount == 0)
    #expect(await service.registrations.isEmpty)
    #expect(store.isAvailable == false)
}

@MainActor @Test func theChoiceSurvivesARelaunch() async {
    let preferences = isolatedPreferences()
    let first = makeStore(authorizer: FakeAuthorizer(.authorized), preferences: preferences)
    await first.setTeam("seahawks")
    await first.setTier(.everything, candidateTeamId: nil)

    let second = makeStore(authorizer: FakeAuthorizer(.authorized), preferences: preferences)
    #expect(second.tier == .everything)
    #expect(second.teamId == "seahawks")
}
