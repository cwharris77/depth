import Foundation
import Observation

// First-run tutorial / onboarding walkthrough for the native app (DEP-251, Cooper's
// locked direction 2026-08-17): a one-screen welcome followed by 3-5 in-context
// coachmarks over the real UI — context-over-ceremony, no standalone tutorial mode, no
// blocking tour. This controller owns the sequence's state machine (welcome shown ->
// which coachmark step is active, or none) and which root tab needs to be on screen for
// the current/pending step, so RootTabView can switch there itself rather than every
// coachmark target needing to exist on every tab.
//
// Persistence is UserPreferences.hasSeenOnboarding/markOnboardingSeen — the same
// one-time-hint pattern as the depth-chart reorder hint (seenReorderHint). Settings'
// "Take the tour" row (`replay()`) bypasses that flag entirely; it only gates the
// automatic first-launch trigger (`startIfNeeded()`).
@MainActor
@Observable
final class OnboardingController {
    enum Phase: Equatable {
        case hidden
        case welcome
        case coachmark(Int)
    }

    private(set) var phase: Phase = .hidden
    /// The root tab the active/pending coachmark step needs on screen. RootTabView
    /// two-way binds its TabView's `selection` to this (via `@Bindable`), so a manual
    /// tab switch by the user stays in sync here too — this only needs to be forced
    /// when `startIfNeeded()`/`replay()` kick off a new tour.
    var activeTab: RootTab = .depthCharts

    private let preferences: UserPreferences

    init(preferences: UserPreferences) {
        self.preferences = preferences
    }

    var currentStep: CoachmarkStep? {
        guard case .coachmark(let index) = phase, CoachmarkStep.all.indices.contains(index) else {
            return nil
        }
        return CoachmarkStep.all[index]
    }

    var stepNumber: Int {
        guard case .coachmark(let index) = phase else { return 0 }
        return index + 1
    }

    var isLastStep: Bool {
        guard case .coachmark(let index) = phase else { return false }
        return index == CoachmarkStep.all.count - 1
    }

    /// Called once from ContentView's launch task, after the update gate has cleared —
    /// starts the welcome screen on a genuinely first launch and is a no-op on every
    /// later launch (or once the flow has been skipped/finished).
    func startIfNeeded() {
        guard !preferences.hasSeenOnboarding else { return }
        activeTab = .depthCharts
        phase = .welcome
    }

    /// Settings' "Take the tour": replays the whole flow regardless of the persisted
    /// "seen" flag, and jumps to Depth Charts first since every current coachmark
    /// target lives there.
    func replay() {
        activeTab = .depthCharts
        phase = .welcome
    }

    /// Welcome screen's "Skip" — ends the whole flow without any coachmarks.
    func skipWelcome() {
        finish()
    }

    /// Welcome screen's "Take the Tour" — starts the coachmark sequence.
    func beginCoachmarks() {
        guard !CoachmarkStep.all.isEmpty else {
            finish()
            return
        }
        phase = .coachmark(0)
    }

    /// A coachmark bubble's "Next"/"Done" — advances to the next step, or finishes the
    /// flow on the last one.
    func advance() {
        guard case .coachmark(let index) = phase else { return }
        let next = index + 1
        if next < CoachmarkStep.all.count {
            phase = .coachmark(next)
        } else {
            finish()
        }
    }

    /// A coachmark bubble's "Skip" — ends the whole remaining sequence, matching the
    /// welcome screen's skip (every step in the tour is skippable, not just the intro).
    func skipCoachmarks() {
        finish()
    }

    private func finish() {
        phase = .hidden
        preferences.markOnboardingSeen()
    }
}

/// One step in the guided coachmark sequence (DEP-251 tasks: team pill, a player dot,
/// the overflow menu, the bottom tabs — in that order, the "core tap -> card aha"
/// deliberately placed second so it lands right after the team pill establishes context).
struct CoachmarkStep: Identifiable {
    let id: CoachmarkID
    let title: String
    let message: String

    static let all: [CoachmarkStep] = [
        CoachmarkStep(
            id: .teamPill,
            title: "Switch teams anytime",
            message: "Tap here to jump to any of the 32 teams' depth charts."
        ),
        CoachmarkStep(
            id: .playerDot,
            title: "Tap any player",
            message: "Every dot on the field opens that player's bio, stats, and spot on the depth chart."
        ),
        CoachmarkStep(
            id: .overflowMenu,
            title: "More lives in here",
            message: "Uniforms, past seasons, formations, and edit mode are all one tap away in this menu."
        ),
        CoachmarkStep(
            id: .bottomTabs,
            title: "Explore the app",
            // DEP-252: Account moved out of the tab bar into a nav-bar icon, so this
            // step no longer mentions it — the tab bar is Depth Charts/Compare/Uniforms
            // only now.
            message: "Switch between Depth Charts, Compare, and Uniforms down here."
        ),
    ]
}
