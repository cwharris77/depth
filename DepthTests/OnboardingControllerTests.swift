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

    /// Setup steps whose answers a test can change as the flow goes on.
    @MainActor
    private final class SetupState {
        var isAvailable = true
        var hasFavoriteTeam = false
        var canAskForNotifications = true

        var setup: OnboardingSetup {
            OnboardingSetup(
                isAvailable: { self.isAvailable },
                hasFavoriteTeam: { self.hasFavoriteTeam },
                canAskForNotifications: { self.canAskForNotifications })
        }
    }

    @Test func isIdleOnlyWhileNoWelcomeOrCoachmarkIsUp() {
        let controller = OnboardingController(preferences: freshPreferences())
        #expect(controller.isIdle)

        controller.startIfNeeded()
        #expect(controller.phase == .welcome)
        #expect(controller.isIdle == false)

        controller.continueFromWelcome()
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

    @Test func theWelcomeTourIsTheTwoRosterStepsAndNothingElse() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.continueFromWelcome()

        #expect(controller.activeTutorial == .roster)
        #expect(controller.currentStep?.id == .playerDot)
        #expect(controller.stepNumber == 1)
        #expect(controller.totalStepCount == 2)
        controller.advance()
        #expect(controller.currentStep?.id == .overflowMenu)
        #expect(controller.isLastStep)
        controller.advance()

        #expect(controller.isIdle)
        #expect(preferences.hasSeenOnboarding)
        #expect(preferences.hasSeenTutorial(TutorialID.roster.id))
        // The other pages keep their hint for the first visit.
        #expect(!preferences.hasSeenTutorial(TutorialID.schedule.id))
        #expect(!preferences.hasSeenTutorial(TutorialID.compare.id))
    }

    @Test func aPageHintShowsOnItsFirstVisitAfterTheTour() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.continueFromWelcome()
        controller.advance()
        controller.advance()

        controller.pageDidAppear(.compare)
        #expect(controller.activeTutorial == .compare)
        #expect(controller.currentStep?.id == .compareSwitcher)
        #expect(controller.totalStepCount == 1)
        controller.advance()
        #expect(controller.isIdle)

        controller.pageDidAppear(.compare)
        #expect(controller.isIdle)
    }

    @Test func aPageHintDoesNotInterruptTheWelcomeTour() {
        let controller = OnboardingController(preferences: freshPreferences())
        controller.startIfNeeded()
        controller.pageDidAppear(.schedule)
        #expect(controller.phase == .welcome)
        controller.continueFromWelcome()
        controller.pageDidAppear(.schedule)
        #expect(controller.activeTutorial == .roster)
    }

    @Test func skippingTheWelcomeTourSuppressesEveryPageHint() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.continueFromWelcome()
        controller.skipCoachmarks()

        #expect(preferences.hasSeenOnboarding)
        for tutorial in TutorialID.allCases {
            #expect(preferences.hasSeenTutorial(tutorial.id))
        }
        controller.pageDidAppear(.schedule)
        #expect(controller.isIdle)
    }

    @Test func skippingWelcomeSuppressesEveryPageHint() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.skipWelcome()

        #expect(controller.isIdle)
        #expect(preferences.hasSeenOnboarding)
        for tutorial in TutorialID.allCases {
            #expect(preferences.hasSeenTutorial(tutorial.id))
        }
    }

    @Test func usersFromBeforePageHintsStillSeeThemOnce() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        #expect(preferences.hasSeenTutorial(TutorialID.roster.id))

        controller.pageDidAppear(.roster)
        #expect(controller.isIdle)
        controller.pageDidAppear(.schedule)
        #expect(controller.activeTutorial == .schedule)
        controller.skipCoachmarks()
        #expect(preferences.hasSeenTutorial(TutorialID.schedule.id))
        #expect(!preferences.hasSeenTutorial(TutorialID.compare.id))
    }

    @Test func pageAppearanceBeforeLaunchGateDoesNotRaceWelcome() {
        let controller = OnboardingController(preferences: freshPreferences())
        controller.pageDidAppear(.roster)
        #expect(controller.isIdle)
    }

    @Test func replayGoesStraightToTheTourAndBringsPageHintsBack() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        preferences.markAllTutorialsSeen()
        let state = SetupState()
        let controller = OnboardingController(preferences: preferences, setup: state.setup)
        controller.startIfNeeded()

        controller.replay()
        #expect(controller.phase == .welcome)
        #expect(!controller.offersSetup)
        #expect(controller.consumeTeamPageRequest() == .roster)
        controller.continueFromWelcome()
        #expect(controller.activeTutorial == .roster)
        controller.advance()
        controller.advance()

        controller.pageDidAppear(.schedule)
        #expect(controller.activeTutorial == .schedule)
    }

    // MARK: - Setup steps

    @Test func firstRunAsksForATeamThenNotificationsThenTours() {
        let state = SetupState()
        let controller = OnboardingController(preferences: freshPreferences(), setup: state.setup)
        controller.startIfNeeded()
        #expect(controller.offersSetup)

        controller.continueFromWelcome()
        #expect(controller.phase == .pickTeam)
        #expect(controller.phase.isFullScreen)
        #expect(!controller.isIdle)

        state.hasFavoriteTeam = true
        controller.continueFromTeam()
        #expect(controller.phase == .notifications)

        controller.continueFromNotifications()
        #expect(controller.activeTutorial == .roster)
        #expect(controller.phase == .coachmark(0))
    }

    @Test func skippingTheTeamSkipsNotificationsToo() {
        let state = SetupState()
        let controller = OnboardingController(preferences: freshPreferences(), setup: state.setup)
        controller.startIfNeeded()
        controller.continueFromWelcome()

        controller.continueFromTeam()
        #expect(controller.phase == .coachmark(0))
    }

    @Test func aKnownFavoriteSkipsTheTeamStep() {
        let state = SetupState()
        state.hasFavoriteTeam = true
        let controller = OnboardingController(preferences: freshPreferences(), setup: state.setup)
        controller.startIfNeeded()

        controller.continueFromWelcome()
        #expect(controller.phase == .notifications)
    }

    @Test func anAnsweredPermissionSkipsTheNotificationStep() {
        let state = SetupState()
        state.hasFavoriteTeam = true
        state.canAskForNotifications = false
        let controller = OnboardingController(preferences: freshPreferences(), setup: state.setup)
        controller.startIfNeeded()

        controller.continueFromWelcome()
        #expect(controller.phase == .coachmark(0))
    }

    @Test func withoutTheSetupStepsWelcomeLeadsToTheTour() {
        let state = SetupState()
        state.isAvailable = false
        let controller = OnboardingController(preferences: freshPreferences(), setup: state.setup)
        controller.startIfNeeded()
        #expect(!controller.offersSetup)

        controller.continueFromWelcome()
        #expect(controller.phase == .coachmark(0))
    }
}
