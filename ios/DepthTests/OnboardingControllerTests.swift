import Foundation
import Testing
@testable import Depth

// DEP-251: coverage for OnboardingController's welcome/coachmark state machine and its
// persistence gate (UserPreferences.hasSeenOnboarding/markOnboardingSeen) — the
// first-run tutorial's only pure logic; WelcomeView/CoachmarkOverlayView are rendering
// only. Same isolated-UserDefaults pattern as LocalFirstOverrideWriterTests, so runs
// never interfere with each other or a real device's persisted "seen" state.

@MainActor
struct OnboardingControllerTests {
    private func freshPreferences() -> UserPreferences {
        let suiteName = "OnboardingControllerTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        return UserPreferences(defaults: defaults)
    }

    @Test func startIfNeededShowsWelcomeOnFirstLaunch() {
        let controller = OnboardingController(preferences: freshPreferences())

        controller.startIfNeeded()

        #expect(controller.phase == .welcome)
        #expect(controller.activeTab == .depthCharts)
    }

    @Test func startIfNeededIsNoOpOnceSeen() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)

        controller.startIfNeeded()

        #expect(controller.phase == .hidden)
    }

    @Test func skippingWelcomeMarksSeenAndHides() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()

        controller.skipWelcome()

        #expect(controller.phase == .hidden)
        #expect(preferences.hasSeenOnboarding)
    }

    @Test func beginCoachmarksStartsAtFirstStep() {
        let controller = OnboardingController(preferences: freshPreferences())
        controller.startIfNeeded()

        controller.beginCoachmarks()

        #expect(controller.phase == .coachmark(0))
        #expect(controller.currentStep?.id == .teamPill)
        #expect(controller.stepNumber == 1)
        #expect(controller.isLastStep == false)
    }

    @Test func advanceStepsThroughEveryCoachmarkThenFinishes() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.beginCoachmarks()

        var seenIDs: [CoachmarkID] = []
        for _ in CoachmarkStep.all.indices {
            if let id = controller.currentStep?.id { seenIDs.append(id) }
            controller.advance()
        }

        #expect(seenIDs == CoachmarkStep.all.map(\.id))
        // The final `advance()` (called once per step, including the last) finishes the
        // whole flow rather than stepping past the end.
        #expect(controller.phase == .hidden)
        #expect(preferences.hasSeenOnboarding)
    }

    @Test func isLastStepIsTrueOnlyOnTheFinalCoachmark() {
        let controller = OnboardingController(preferences: freshPreferences())
        controller.startIfNeeded()
        controller.beginCoachmarks()

        for index in CoachmarkStep.all.indices {
            #expect(controller.isLastStep == (index == CoachmarkStep.all.count - 1))
            controller.advance()
        }
    }

    @Test func skipCoachmarksEndsTheFlowImmediately() {
        let preferences = freshPreferences()
        let controller = OnboardingController(preferences: preferences)
        controller.startIfNeeded()
        controller.beginCoachmarks()
        controller.advance() // now on the second step, not the first or last

        controller.skipCoachmarks()

        #expect(controller.phase == .hidden)
        #expect(preferences.hasSeenOnboarding)
    }

    @Test func replayShowsWelcomeAgainEvenAfterBeingSeen() {
        let preferences = freshPreferences()
        preferences.markOnboardingSeen()
        let controller = OnboardingController(preferences: preferences)
        controller.activeTab = .account // Settings' "Take the Tour" is reached from here

        controller.replay()

        #expect(controller.phase == .welcome)
        #expect(controller.activeTab == .depthCharts)
    }

    @Test func currentStepIsNilOutsideCoachmarkPhase() {
        let controller = OnboardingController(preferences: freshPreferences())

        #expect(controller.currentStep == nil)

        controller.startIfNeeded()
        #expect(controller.currentStep == nil) // .welcome, not .coachmark
    }
}
