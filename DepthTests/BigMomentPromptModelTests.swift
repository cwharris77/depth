import Foundation
import Testing

@testable import Depth

private actor PromptRepositoryFake: DepthRepository {
    private let event: TeamEvent?
    private(set) var askedFor: [String] = []

    init(event: TeamEvent?) { self.event = event }

    func latestBigMoment(teamId: String) async throws -> TeamEvent? {
        askedFor.append(teamId)
        return event
    }

    func teams() async throws -> [Team] { [] }
    func teamSnapshot(teamId: String) async throws -> TeamSnapshot { throw DepthError.notFound }
    func teamSeason(teamId: String, season: Int) async throws -> TeamSnapshot {
        throw DepthError.notFound
    }
    func teamSchedule(teamId: String, season: Int?) async throws -> TeamSchedule {
        throw DepthError.notFound
    }
    func playerStats(playerId: String, teamId: String?) async throws -> [PlayerSeasonStats] { [] }
    func teamStats(teamId: String) async throws -> TeamStatsPage { throw DepthError.notFound }
    func appConfig() async throws -> AppConfig { throw DepthError.notFound }
}

@MainActor
private final class PromptAuthorizer: NotificationAuthorizing {
    var current: NotificationAuthorization
    private(set) var requestCount = 0

    init(_ current: NotificationAuthorization) { self.current = current }

    func status() async -> NotificationAuthorization { current }

    func request() async -> Bool {
        requestCount += 1
        current = .authorized
        return true
    }

    func registerForRemoteNotifications() {}
}

private let now = Date(timeIntervalSince1970: 1_791_600_000)

private func bigMoment(daysAgo: Double) -> TeamEvent {
    TeamEvent(
        id: "e1", type: "starter_change", tier: "big_moments", teamId: "seahawks",
        headline: "Seahawks: Sam Darnold is the new starter at QB",
        detail: "Replaces Geno Smith.", source: "espn_depth_chart",
        occurredAt: now.addingTimeInterval(-daysAgo * 86_400))
}

@MainActor
private struct PromptHarness {
    let model: BigMomentPromptModel
    let preferences: UserPreferences
    let settings: NotificationSettingsStore
    let repository: PromptRepositoryFake
    let authorizer: PromptAuthorizer
}

@MainActor
private func makeModel(
    event: TeamEvent?,
    authorization: NotificationAuthorization = .notDetermined,
    firstSessionFinished: Bool = true,
    alreadyShown: Bool = false,
    isEnabled: Bool = true,
    isSuppressed: Bool = false
) throws -> PromptHarness {
    let suite = "BigMomentPromptModelTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suite))
    defaults.removePersistentDomain(forName: suite)
    let preferences = UserPreferences(defaults: defaults)
    preferences.hasFinishedFirstSession = firstSessionFinished
    preferences.bigMomentPromptShown = alreadyShown
    let authorizer = PromptAuthorizer(authorization)
    let settings = NotificationSettingsStore(
        service: NoOpPushSubscriptionService(), authorizer: authorizer, preferences: preferences,
        bundleId: "com.cwharris.depth.staging", environment: "sandbox",
        isEnabled: { isEnabled })
    let repository = PromptRepositoryFake(event: event)
    let model = BigMomentPromptModel(
        repository: repository, authorizer: authorizer, settings: settings,
        preferences: preferences, isSuppressed: isSuppressed, now: { now })
    return PromptHarness(
        model: model, preferences: preferences, settings: settings, repository: repository,
        authorizer: authorizer)
}

@MainActor @Test func aRecentBigMomentForTheTeamRaisesThePrompt() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2))
    #expect(harness.model.isEligible)
    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event?.id == "e1")
    #expect(await harness.repository.askedFor == ["seahawks"])
    // Showing the prompt is not the system dialog: that waits for the user to accept.
    #expect(harness.authorizer.requestCount == 0)
}

@MainActor @Test func thePromptNeverAppearsInTheFirstSession() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2), firstSessionFinished: false)
    #expect(harness.model.isEligible == false)
    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event == nil)
    #expect(await harness.repository.askedFor.isEmpty)
}

@MainActor @Test func thePromptIsShownOnlyOnce() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2), alreadyShown: true)
    #expect(harness.model.isEligible == false)
    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event == nil)
    #expect(await harness.repository.askedFor.isEmpty)
}

@MainActor @Test func aUserWhoAlreadyAnsweredTheSystemDialogIsNotPrompted() async throws {
    for answered in [NotificationAuthorization.denied, .authorized] {
        let harness = try makeModel(event: bigMoment(daysAgo: 2), authorization: answered)
        await harness.model.evaluate(candidateTeamId: "seahawks")
        #expect(harness.model.event == nil)
        #expect(await harness.repository.askedFor.isEmpty)
    }
}

@MainActor @Test func anOldBigMomentOrNoneOrNoTeamDoesNotPrompt() async throws {
    let stale = try makeModel(event: bigMoment(daysAgo: 8))
    await stale.model.evaluate(candidateTeamId: "seahawks")
    #expect(stale.model.event == nil)

    let none = try makeModel(event: nil)
    await none.model.evaluate(candidateTeamId: "seahawks")
    #expect(none.model.event == nil)

    let noTeam = try makeModel(event: bigMoment(daysAgo: 2))
    await noTeam.model.evaluate(candidateTeamId: nil)
    #expect(noTeam.model.event == nil)
}

@MainActor @Test func thePromptDoesNotAppearWhileTheFlagIsOff() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2), isEnabled: false)
    #expect(harness.model.isEligible == false)
    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event == nil)
    #expect(await harness.repository.askedFor.isEmpty)
}

@MainActor @Test func aSuppressedPromptNeverAppearsOrReadsAnything() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2), isSuppressed: true)
    #expect(harness.model.isEligible == false)
    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event == nil)
    #expect(await harness.repository.askedFor.isEmpty)
    #expect(harness.preferences.bigMomentPromptShown == false)
}

@MainActor @Test func acceptingAsksTheSystemFollowsThatTeamAndNeverPromptsAgain() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2))
    await harness.model.evaluate(candidateTeamId: "seahawks")
    await harness.model.accept()
    #expect(harness.model.event == nil)
    #expect(harness.preferences.bigMomentPromptShown)
    #expect(harness.authorizer.requestCount == 1)
    #expect(harness.settings.teamId == "seahawks")
    #expect(harness.settings.tier == .bigMoments)

    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event == nil)
}

@MainActor @Test func decliningRecordsTheAnswerAndFollowsNothing() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2))
    await harness.model.evaluate(candidateTeamId: "seahawks")
    harness.model.decline()
    #expect(harness.model.event == nil)
    #expect(harness.preferences.bigMomentPromptShown)
    #expect(harness.authorizer.requestCount == 0)
    #expect(harness.settings.teamId == nil)

    await harness.model.evaluate(candidateTeamId: "seahawks")
    #expect(harness.model.event == nil)
}

@MainActor @Test func decliningAfterAcceptingChangesNothing() async throws {
    let harness = try makeModel(event: bigMoment(daysAgo: 2))
    await harness.model.evaluate(candidateTeamId: "seahawks")
    await harness.model.accept()
    harness.model.decline()
    #expect(harness.settings.teamId == "seahawks")
    #expect(harness.preferences.bigMomentPromptShown)
}
