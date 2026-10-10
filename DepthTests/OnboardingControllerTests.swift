import Foundation
import Testing
@testable import Depth

@MainActor
struct OnboardingControllerTests {
    private func freshPreferences() -> UserPreferences {
        let suiteName = "OnboardingControllerTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        return UserPreferences(defaults: defaults)
    }

    @Test func isIdleOnlyWhileNoWelcomeOrCoachmarkIsUp() {
        let controller = OnboardingController(preferences: freshPreferences())
        #expect(controller.isIdle)

        controller.startIfNeeded()
        #expect(controller.phase == .welcome)
        #expect(controller.isIdle == false)

        controller.beginCoachmarks()
        #expect(controller.activeTutorial != nil)
        #expect(controller.isIdle == false)

        controller.skipCoachmarks()
        #expect(controller.isIdle)
    }

    @Test func firstLaunchShowsWelcomeAndSeenLaunchDoesNot() {
        let firstLaunch = OnboardingController(preferences: freshPreferences())
        firstLaunch.startIfNeeded()
        #expect(firstLaunch.phase == .welcome)
        #expect(firstLaunch.currentStep == nil)

        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let laterLaunch = OnboardingController(preferences: preferences)
        laterLaunch.startIfNeeded()
        #expect(laterLaunch.phase == .hidden)
        #expect(laterLaunch.currentStep == nil)
    }

    @Test func completeTourRunsRosterScheduleCompareAndPersistsAllPages() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.beginCoachmarks()

        #expect(controller.activeTutorial == .roster)
        #expect(controller.currentStep?.id == .teamPill)
        for _ in CoachmarkStep.roster.indices { controller.advance() }

        #expect(controller.activeTutorial == .schedule)
        #expect(controller.activeTab == .depthCharts)
        for _ in CoachmarkStep.schedule.indices { controller.advance() }

        #expect(controller.activeTutorial == .compare)
        #expect(controller.activeTab == .compare)
        for _ in CoachmarkStep.compare.indices { controller.advance() }

        #expect(controller.phase == .hidden)
        #expect(preferences.hasSeenOnboarding)
        #expect(TutorialID.allCases.allSatisfy { preferences.hasSeenTutorial($0.id) })
    }

    @Test func skippingCompleteTourSuppressesEveryPageTutorial() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.beginCoachmarks()
        controller.advance()
        controller.skipCoachmarks()

        #expect(TutorialID.allCases.allSatisfy { preferences.hasSeenTutorial($0.id) })
        controller.pageDidAppear(.schedule)
        #expect(controller.phase == .hidden)
    }

    @Test func skippingWelcomeSuppressesEveryPageTutorial() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.skipWelcome()

        #expect(TutorialID.allCases.allSatisfy { preferences.hasSeenTutorial($0.id) })
        controller.pageDidAppear(.compare)
        #expect(controller.phase == .hidden)
    }

    @Test func legacyOnboardingUsersCanSeeAndPersistPageTutorials() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        #expect(preferences.hasSeenTutorial(TutorialID.roster.id))
        controller.pageDidAppear(.schedule)

        #expect(controller.activeTutorial == .schedule)
        #expect(controller.currentStep?.id == .scheduleGame)
        controller.advance()
        #expect(preferences.hasSeenTutorial(TutorialID.schedule.id))

        let nextLaunch = OnboardingController(preferences: preferences)
        nextLaunch.startIfNeeded()
        nextLaunch.pageDidAppear(.schedule)
        #expect(nextLaunch.phase == .hidden)

        nextLaunch.pageDidAppear(.compare)
        #expect(nextLaunch.activeTutorial == .compare)
        #expect(nextLaunch.stepNumber == 1)
        #expect(nextLaunch.totalStepCount == 3)
        #expect(nextLaunch.isLastStep == false)
        nextLaunch.advance()
        nextLaunch.advance()
        #expect(nextLaunch.isLastStep)
    }

    @Test func skippingPageTutorialMarksOnlyThatPageSeen() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.pageDidAppear(.compare)
        controller.skipCoachmarks()

        #expect(preferences.hasSeenTutorial(TutorialID.compare.id))
        #expect(!preferences.hasSeenTutorial(TutorialID.schedule.id))
        #expect(controller.phase == .hidden)
    }

    @Test func replayStartsTheCompleteTour() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)
        controller.replay()
        controller.beginCoachmarks()

        #expect(controller.activeTutorial == .roster)
        #expect(controller.totalStepCount == 8)
    }

    @Test func replayFromScheduleRequestsRosterPageBeforeShowingTour() {
        let controller = OnboardingController(preferences: freshPreferences())
        controller.replay()

        #expect(controller.activeTab == .depthCharts)
        #expect(controller.requestedTeamPage == .roster)
        #expect(controller.teamPageRouteToken == 1)
        #expect(controller.consumeTeamPageRequest() == .roster)
        #expect(controller.consumeTeamPageRequest() == nil)

        controller.beginCoachmarks()
        #expect(controller.activeTutorial == .roster)
        #expect(controller.requestedTeamPage == .roster)
    }

    @Test func pageAppearanceBeforeLaunchGateDoesNotRaceWelcome() {
        let controller = OnboardingController(preferences: freshPreferences())
        controller.pageDidAppear(.compare)
        #expect(controller.phase == .hidden)
        controller.startIfNeeded()
        #expect(controller.phase == .welcome)
    }

    @Test func legacyPageVisitAfterLaunchGateCanStart() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)
        controller.pageDidAppear(.compare)
        controller.startIfNeeded()
        controller.pageDidAppear(.compare)

        #expect(controller.activeTutorial == .compare)
    }
}
