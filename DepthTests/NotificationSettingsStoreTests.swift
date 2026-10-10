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

/// A server double whose `register` can be held open, so a test decides when and in what
/// order overlapping requests are applied.
private actor GatedSubscriptionService: PushSubscriptionServicing {
    /// Registrations in the order the server applied them.
    private(set) var applied: [PushRegistration] = []
    private(set) var maxInFlight = 0
    private var inFlight = 0
    private var holding = false
    private var appliesThenFails = false
    private var held: [CheckedContinuation<Void, Never>] = []
    private var arrivalWaiters: [CheckedContinuation<Void, Never>] = []

    func hold() { holding = true }

    /// The request reaches the server and is applied, but the caller sees an error.
    func setAppliesThenFails(_ value: Bool) { appliesThenFails = value }

    func register(_ registration: PushRegistration) async throws {
        inFlight += 1
        maxInFlight = max(maxInFlight, inFlight)
        defer { inFlight -= 1 }
        if holding {
            await withCheckedContinuation { continuation in
                held.append(continuation)
                arrivalWaiters.forEach { $0.resume() }
                arrivalWaiters = []
            }
        }
        applied.append(registration)
        if appliesThenFails { throw DepthError.offline }
    }

    func waitForAHeldRequest() async {
        guard held.isEmpty else { return }
        await withCheckedContinuation { arrivalWaiters.append($0) }
    }

    /// Lets every held request through, the most recent first.
    func releaseNewestFirst() {
        while let continuation = held.popLast() { continuation.resume() }
    }

    func stopHolding() {
        holding = false
        releaseNewestFirst()
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

private func isolatedPreferences() throws -> UserPreferences {
    let suite = "NotificationSettingsStoreTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suite))
    defaults.removePersistentDomain(forName: suite)
    return UserPreferences(defaults: defaults)
}

private let token = Data(repeating: 0xAB, count: 32)
private let tokenHex = String(repeating: "ab", count: 32)

/// Preferences of a device that already registered `tier` for the Seahawks.
private func registeredPreferences(tier: NotificationTier) throws -> UserPreferences {
    let preferences = try isolatedPreferences()
    preferences.pushToken = tokenHex
    preferences.notificationTeamId = "seahawks"
    preferences.notificationTier = tier
    preferences.lastSyncedRegistration = "\(tokenHex)|seahawks|\(tier.rawValue)"
    return preferences
}

@MainActor
private func makeStore(
    authorizer: FakeAuthorizer,
    service: any PushSubscriptionServicing = RecordingSubscriptionService(),
    preferences: UserPreferences? = nil,
    isEnabled: Bool = true
) throws -> NotificationSettingsStore {
    NotificationSettingsStore(
        service: service, authorizer: authorizer,
        preferences: try preferences ?? isolatedPreferences(),
        bundleId: "com.cwharris.depth.staging", environment: "sandbox",
        isEnabled: { isEnabled })
}

@MainActor @Test func tierDefaultsToBigMoments() throws {
    #expect(try makeStore(authorizer: FakeAuthorizer(.notDetermined)).tier == .bigMoments)
}

@MainActor @Test func enablingAsksOnceRegistersAndSyncsWhenTheTokenArrives() async throws {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined)
    let store = try makeStore(authorizer: authorizer, service: service)

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

@MainActor @Test func aDeclinedSystemPromptRegistersNothing() async throws {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined, grantOnRequest: false)
    let store = try makeStore(authorizer: authorizer, service: service)

    #expect(await store.enable(teamId: "seahawks") == false)
    #expect(authorizer.registerCount == 0)
    #expect(store.authorization == .denied)
    #expect(await service.registrations.isEmpty)
}

@MainActor @Test func changingTheTierSyncsTheNewValue() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.setTier(.everything, candidateTeamId: "bills")

    #expect(await service.registrations.map(\.tier) == [.bigMoments, .everything])
    // An explicit team is never replaced by the candidate.
    #expect(await service.registrations.last?.teamId == "seahawks")
}

@MainActor @Test func anUnchangedRegistrationIsNotSentAgain() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.refresh()
    await store.handleDeviceToken(token)
    #expect(await service.registrations.count == 1)
}

@MainActor @Test func aFailedSyncIsRetriedOnTheNextRefresh() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await service.setFailing(true)
    await store.handleDeviceToken(token)
    #expect(await service.registrations.isEmpty)

    await service.setFailing(false)
    await store.refresh()
    #expect(await service.registrations.count == 1)
}

@MainActor @Test func revokingPermissionInSystemSettingsSyncsOffAndKeepsTheChoice() async throws {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.authorized)
    let store = try makeStore(authorizer: authorizer, service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)

    authorizer.current = .denied
    await store.refresh()

    #expect(await service.registrations.map(\.tier) == [.bigMoments, .off])
    #expect(store.tier == .bigMoments)
    #expect(authorizer.requestCount == 0)
}

@MainActor @Test func turningOffEverythingDropsBackToBigMoments() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(authorizer: FakeAuthorizer(.authorized), service: service)
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.setTier(.everything, candidateTeamId: nil)
    await store.turnOffEverything()

    #expect(store.tier == .bigMoments)
    #expect(await service.registrations.last?.tier == .bigMoments)
}

@MainActor @Test func pickingATierWhileUndeterminedAsksAndAdoptsTheCandidateTeam() async throws {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined)
    let store = try makeStore(authorizer: authorizer, service: service)

    await store.setTier(.everything, candidateTeamId: "bills")
    await store.handleDeviceToken(token)

    #expect(authorizer.requestCount == 1)
    #expect(store.teamId == "bills")
    #expect(await service.registrations.last?.tier == .everything)
}

@MainActor @Test func choosingOffWhileUndeterminedDoesNotAsk() async throws {
    let authorizer = FakeAuthorizer(.notDetermined)
    let store = try makeStore(authorizer: authorizer)
    await store.setTier(.off, candidateTeamId: "bills")
    #expect(authorizer.requestCount == 0)
    #expect(store.tier == .off)
}

@MainActor @Test func nothingHappensWhileTheFlagIsOff() async throws {
    let service = RecordingSubscriptionService()
    let authorizer = FakeAuthorizer(.notDetermined)
    let preferences = try isolatedPreferences()
    let store = try makeStore(
        authorizer: authorizer, service: service, preferences: preferences, isEnabled: false)

    await store.refresh()
    #expect(await store.enable(teamId: "seahawks") == false)
    for tier in NotificationTier.allCases {
        await store.setTier(tier, candidateTeamId: "seahawks")
    }
    await store.setTeam("seahawks")
    await store.handleDeviceToken(token)
    await store.turnOffEverything()

    #expect(store.isAvailable == false)
    #expect(authorizer.requestCount == 0)
    #expect(authorizer.registerCount == 0)
    #expect(await service.registrations.isEmpty)
    #expect(preferences.pushToken == nil)
    #expect(preferences.notificationTier == .bigMoments)
    #expect(preferences.notificationTeamId == nil)
}

@MainActor @Test func theChoiceSurvivesARelaunch() async throws {
    let preferences = try isolatedPreferences()
    let first = try makeStore(authorizer: FakeAuthorizer(.authorized), preferences: preferences)
    await first.setTeam("seahawks")
    await first.setTier(.everything, candidateTeamId: nil)

    let second = try makeStore(authorizer: FakeAuthorizer(.authorized), preferences: preferences)
    #expect(second.tier == .everything)
    #expect(second.teamId == "seahawks")
}

@MainActor @Test func choosingATierAfterADenialNeverAsksAgain() async throws {
    let authorizer = FakeAuthorizer(.denied)
    let store = try makeStore(authorizer: authorizer)

    await store.setTier(.everything, candidateTeamId: "bills")
    #expect(await store.enable(teamId: "bills") == false)

    #expect(authorizer.requestCount == 0)
    #expect(authorizer.registerCount == 0)
}

@MainActor @Test func choosingATierWhileDeniedSendsOffExactlyOnce() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(
        authorizer: FakeAuthorizer(.denied), service: service,
        preferences: registeredPreferences(tier: .bigMoments))

    await store.setTier(.everything, candidateTeamId: nil)
    await store.setTier(.bigMoments, candidateTeamId: nil)

    #expect(await service.registrations.map(\.tier) == [.off])
    #expect(store.tier == .bigMoments)
}

@MainActor @Test func enablingLeavesAnAlreadyChosenTeamAlone() async throws {
    let store = try makeStore(authorizer: FakeAuthorizer(.authorized))
    await store.setTeam("seahawks")

    #expect(await store.enable(teamId: "bills"))
    #expect(store.teamId == "seahawks")
}

@MainActor @Test func turningOffEverythingBeforeAnyRefreshSendsBigMoments() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(
        authorizer: FakeAuthorizer(.authorized), service: service,
        preferences: registeredPreferences(tier: .everything))

    await store.turnOffEverything()

    #expect(await service.registrations.map(\.tier) == [.bigMoments])
    #expect(store.authorization == .authorized)
}

@MainActor @Test func aTokenStoredBeforePermissionWasAnsweredIsDiscardedUnsent() async throws {
    let service = RecordingSubscriptionService()
    let preferences = try registeredPreferences(tier: .everything)
    let store = try makeStore(
        authorizer: FakeAuthorizer(.notDetermined), service: service, preferences: preferences)

    await store.refresh()
    await store.setTeam("bills")

    #expect(await service.registrations.isEmpty)
    #expect(preferences.pushToken == nil)
    #expect(preferences.lastSyncedRegistration == nil)
    #expect(store.tier == .everything)
    #expect(preferences.notificationTeamId == "bills")
}

@MainActor @Test func choosingOffWhileAuthorizedSendsOff() async throws {
    let service = RecordingSubscriptionService()
    let store = try makeStore(
        authorizer: FakeAuthorizer(.authorized), service: service,
        preferences: registeredPreferences(tier: .bigMoments))

    await store.setTier(.off, candidateTeamId: nil)

    #expect(await service.registrations.map(\.tier) == [.off])
}

@MainActor @Test func overlappingTierChangesReachTheServerOneAtATimeInOrder() async throws {
    let service = GatedSubscriptionService()
    let preferences = try registeredPreferences(tier: .bigMoments)
    let store = try makeStore(
        authorizer: FakeAuthorizer(.authorized), service: service, preferences: preferences)
    await service.hold()

    let first = Task { await store.setTier(.everything, candidateTeamId: nil) }
    await service.waitForAHeldRequest()
    let second = Task { await store.setTier(.off, candidateTeamId: nil) }
    while store.tier != .off { await Task.yield() }
    // Room for a second request to reach the server while the first is still held.
    for _ in 0..<50 { await Task.yield() }

    let pump = Task {
        while !Task.isCancelled {
            await service.releaseNewestFirst()
            await Task.yield()
        }
    }
    await first.value
    await second.value
    pump.cancel()

    #expect(await service.maxInFlight == 1)
    #expect(await service.applied.map(\.tier) == [.everything, .off])
    #expect(preferences.lastSyncedRegistration == "\(tokenHex)|seahawks|off")
}

@MainActor @Test func aChangeRevertedWhileItsRequestIsInFlightIsSentAgain() async throws {
    let service = GatedSubscriptionService()
    let preferences = try registeredPreferences(tier: .bigMoments)
    let store = try makeStore(
        authorizer: FakeAuthorizer(.authorized), service: service, preferences: preferences)
    await service.hold()

    let first = Task { await store.setTier(.everything, candidateTeamId: nil) }
    await service.waitForAHeldRequest()
    let second = Task { await store.setTier(.bigMoments, candidateTeamId: nil) }
    while store.tier != .bigMoments { await Task.yield() }
    await service.stopHolding()
    await first.value
    await second.value

    #expect(await service.applied.last?.tier == store.tier)
    #expect(preferences.lastSyncedRegistration == "\(tokenHex)|seahawks|big_moments")
}

@MainActor @Test func anAmbiguousFailureIsResentEvenWhenTheChoiceGoesBack() async throws {
    let service = GatedSubscriptionService()
    let preferences = try registeredPreferences(tier: .bigMoments)
    let store = try makeStore(
        authorizer: FakeAuthorizer(.authorized), service: service, preferences: preferences)

    await service.setAppliesThenFails(true)
    await store.setTier(.everything, candidateTeamId: nil)
    #expect(preferences.lastSyncedRegistration == nil)

    await service.setAppliesThenFails(false)
    await store.setTier(.bigMoments, candidateTeamId: nil)

    #expect(await service.applied.map(\.tier) == [.everything, .bigMoments])
    #expect(preferences.lastSyncedRegistration == "\(tokenHex)|seahawks|big_moments")
}

@Test func internalBuildsRegisterWithTheSandboxAndStoreBuildsWithProduction() {
    #expect(PushRegistration.apnsEnvironment(isInternalBuild: true) == "sandbox")
    #expect(PushRegistration.apnsEnvironment(isInternalBuild: false) == "production")
}
