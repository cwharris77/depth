import Foundation
import Testing
import UserNotifications

@testable import Depth

@Test func aTapOpensTheTeamTheNotificationIsAbout() {
    let response = NotificationResponse.parse(
        actionIdentifier: UNNotificationDefaultActionIdentifier,
        userInfo: ["team_id": "seahawks", "event_ids": ["e1"]])
    #expect(response == .openTeam(teamId: "seahawks", eventIds: ["e1"]))
}

@Test func theLeaveEverythingActionDoesNotOpenATeam() {
    let response = NotificationResponse.parse(
        actionIdentifier: NotificationResponse.turnOffEverythingAction,
        userInfo: ["team_id": "seahawks"])
    #expect(response == .turnOffEverything)
}

@Test func aNotificationWithoutATeamIsIgnored() {
    #expect(
        NotificationResponse.parse(
            actionIdentifier: UNNotificationDefaultActionIdentifier, userInfo: [:]) == .ignore)
    #expect(
        NotificationResponse.parse(
            actionIdentifier: UNNotificationDefaultActionIdentifier,
            userInfo: ["team_id": 7]) == .ignore)
}

@Test func dismissingANotificationDoesNothing() {
    #expect(
        NotificationResponse.parse(
            actionIdentifier: UNNotificationDismissActionIdentifier,
            userInfo: ["team_id": "seahawks"]) == .ignore)
}

@Test func theCategoryIdentifierMatchesTheSender() {
    #expect(NotificationResponse.everythingCategory == "EVERYTHING_TIER")
}

@MainActor
private struct ResponseStores {
    let recorder = RecordingAppEventsRecorder()
    let routes = TeamRouteStore()
    let onboarding: OnboardingController
    let settings: NotificationSettingsStore

    init(tier: NotificationTier = .bigMoments, isEnabled: Bool = true) throws {
        let suite = "NotificationResponseTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defaults.removePersistentDomain(forName: suite)
        let preferences = UserPreferences(defaults: defaults)
        preferences.notificationTier = tier
        onboarding = OnboardingController(preferences: preferences)
        settings = NotificationSettingsStore(
            service: NoOpPushSubscriptionService(),
            authorizer: NoOpNotificationAuthorizer(fixed: .authorized),
            preferences: preferences, bundleId: "com.cwharris.depth.staging",
            environment: "sandbox", isEnabled: { isEnabled })
    }

    func perform(_ response: NotificationResponse) async {
        await response.perform(
            routes: routes, onboarding: onboarding, settings: settings, events: recorder)
    }
}

@MainActor @Test func aTapWhileOnAnotherTabRequestsTheTeamAndShowsDepthCharts() async throws {
    let stores = try ResponseStores()
    stores.onboarding.activeTab = .compare

    await stores.perform(.openTeam(teamId: "bills", eventIds: []))

    #expect(stores.routes.requestedTeamId == "bills")
    #expect(stores.onboarding.activeTab == .depthCharts)
}

@MainActor @Test func theTurnOffEverythingActionChangesTheTierAndLeavesTheScreenAlone() async throws
{
    let stores = try ResponseStores(tier: .everything)
    stores.onboarding.activeTab = .compare

    await stores.perform(.turnOffEverything)

    #expect(stores.settings.tier == .bigMoments)
    #expect(stores.routes.requestedTeamId == nil)
    #expect(stores.onboarding.activeTab == .compare)
}

@MainActor @Test func anIgnoredResponseChangesNothing() async throws {
    let stores = try ResponseStores(tier: .everything)
    stores.onboarding.activeTab = .uniforms

    await stores.perform(.ignore)

    #expect(stores.settings.tier == .everything)
    #expect(stores.routes.requestedTeamId == nil)
    #expect(stores.onboarding.activeTab == .uniforms)
}

@MainActor @Test func aNotificationResponseDoesNothingWhileTheFlagIsOff() async throws {
    let stores = try ResponseStores(tier: .everything, isEnabled: false)
    stores.onboarding.activeTab = .compare

    await stores.perform(.openTeam(teamId: "bills", eventIds: []))
    await stores.perform(.turnOffEverything)

    #expect(stores.settings.tier == .everything)
    #expect(stores.routes.requestedTeamId == nil)
    #expect(stores.onboarding.activeTab == .compare)
}

@Test func parseTreatsMalformedEventIdsAsNone() {
    #expect(
        NotificationResponse.parse(
            actionIdentifier: UNNotificationDefaultActionIdentifier,
            userInfo: ["team_id": "bills", "event_ids": "e1"])
            == .openTeam(teamId: "bills", eventIds: []))
    #expect(
        NotificationResponse.parse(
            actionIdentifier: UNNotificationDefaultActionIdentifier,
            userInfo: ["team_id": "bills", "event_ids": ["e1", 7, ""]])
            == .openTeam(teamId: "bills", eventIds: ["e1"]))
}
@MainActor @Test func oneEventRoutesAndCountsOneAnonymousOpen() async throws {
    let stores = try ResponseStores()
    await stores.perform(.openTeam(teamId: "bills", eventIds: ["e1"]))
    #expect(stores.routes.consume().event == .event(id: "e1"))
    #expect(stores.recorder.events() == [.notificationOpened])
}
@MainActor @Test func severalEventsOpenTheFeed() async throws {
    let stores = try ResponseStores()
    await stores.perform(.openTeam(teamId: "bills", eventIds: ["e1", "e2"]))
    #expect(stores.routes.consume().event == .feed)
}
@MainActor @Test func disabledNotificationsDoNotCountAnOpen() async throws {
    let stores = try ResponseStores(isEnabled: false)
    await stores.perform(.openTeam(teamId: "bills", eventIds: ["e1"]))
    #expect(stores.routes.consume().event == nil)
    #expect(stores.recorder.events().isEmpty)
}
@MainActor @Test func notificationActionsAreNotCountedAsOpens() async throws {
    let stores = try ResponseStores(tier: .everything)
    await stores.perform(.turnOffEverything)
    await stores.perform(.ignore)
    #expect(stores.recorder.events().isEmpty)
}
