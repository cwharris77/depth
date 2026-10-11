import Foundation
import Observation

enum TutorialID: String, CaseIterable, Identifiable {
    case roster
    case schedule
    case compare

    var id: String { rawValue }

    var rootTab: RootTab {
        switch self {
        case .roster, .schedule: .depthCharts
        case .compare: .compare
        }
    }
}

enum TutorialTeamPage: Equatable {
    case roster
    case schedule
}

/// What the first run needs to know to offer its two setup steps, picking a team and
/// turning on notifications about it. The defaults offer neither.
struct OnboardingSetup {
    /// Whether the setup steps exist at all.
    var isAvailable: @MainActor () -> Bool = { false }
    var hasFavoriteTeam: @MainActor () -> Bool = { false }
    /// True while the system has never been asked for notification permission.
    var canAskForNotifications: @MainActor () -> Bool = { false }
}

@MainActor
@Observable
final class OnboardingController {
    enum Phase: Equatable {
        case hidden
        case welcome
        case pickTeam
        case notifications
        case coachmark(Int)

        /// The full-screen steps shown before the app itself.
        var isFullScreen: Bool {
            switch self {
            case .welcome, .pickTeam, .notifications: true
            case .hidden, .coachmark: false
            }
        }
    }

    private(set) var phase: Phase = .hidden
    private(set) var activeTutorial: TutorialID?
    private(set) var teamPageRouteToken = 0
    private(set) var requestedTeamPage: TutorialTeamPage?
    var activeTab: RootTab = .depthCharts

    private let preferences: UserPreferences
    private let setup: OnboardingSetup
    /// True from the welcome screen until the tour it leads to ends. Skipping during it
    /// turns off every page's hints, not just the one on screen.
    private var isWelcomeTour = false
    /// True when the welcome screen was reopened from Settings, which goes straight to
    /// the tour.
    private var isReplay = false
    private var hasEvaluatedLaunch = false

    init(preferences: UserPreferences, setup: OnboardingSetup = OnboardingSetup()) {
        self.preferences = preferences
        self.setup = setup
    }

    var currentStep: CoachmarkStep? {
        guard let activeTutorial, case .coachmark(let index) = phase else { return nil }
        return Self.steps(for: activeTutorial).indices.contains(index)
            ? Self.steps(for: activeTutorial)[index] : nil
    }

    var stepNumber: Int {
        guard case .coachmark(let index) = phase else { return 0 }
        return index + 1
    }

    var totalStepCount: Int {
        activeTutorial.map { Self.steps(for: $0).count } ?? 0
    }

    var isLastStep: Bool {
        guard let activeTutorial, case .coachmark(let index) = phase else { return false }
        return index == Self.steps(for: activeTutorial).count - 1
    }

    /// True while no welcome step and no coachmark tour is up.
    var isIdle: Bool { phase == .hidden && activeTutorial == nil }

    /// Whether the welcome screen leads into the setup steps rather than straight to the
    /// tour.
    var offersSetup: Bool { !isReplay && setup.isAvailable() }

    func startIfNeeded() {
        hasEvaluatedLaunch = true
        guard !preferences.hasSeenOnboarding else {
            preferences.markTutorialSeen(TutorialID.roster.id)
            return
        }
        isWelcomeTour = true
        isReplay = false
        activeTab = .depthCharts
        phase = .welcome
    }

    /// Reopens the welcome screen and the roster tour, and lets the other pages' hints
    /// show again on the next visit.
    func replay() {
        hasEvaluatedLaunch = true
        isWelcomeTour = true
        isReplay = true
        preferences.clearTutorialsSeen()
        activeTab = .depthCharts
        requestTeamPage(.roster)
        phase = .welcome
    }

    func skipWelcome() {
        preferences.markAllTutorialsSeen()
        finish()
    }

    /// The welcome screen's main action.
    func continueFromWelcome() {
        guard offersSetup else {
            beginCoachmarks()
            return
        }
        if setup.hasFavoriteTeam() {
            continueFromTeam()
        } else {
            phase = .pickTeam
        }
    }

    /// The team step ended, with a team picked or not. Notifications are about the
    /// favorite team, so without one there is nothing to offer.
    func continueFromTeam() {
        if setup.isAvailable(), setup.hasFavoriteTeam(), setup.canAskForNotifications() {
            phase = .notifications
        } else {
            beginCoachmarks()
        }
    }

    func continueFromNotifications() {
        beginCoachmarks()
    }

    func beginCoachmarks() {
        isWelcomeTour = true
        beginTutorial(.roster)
    }

    func pageDidAppear(_ tutorial: TutorialID) {
        guard hasEvaluatedLaunch, phase == .hidden, !isWelcomeTour,
            !preferences.hasSeenTutorial(tutorial.id)
        else { return }
        beginTutorial(tutorial)
    }

    func consumeTeamPageRequest() -> TutorialTeamPage? {
        defer { requestedTeamPage = nil }
        return requestedTeamPage
    }

    func advance() {
        guard let tutorial = activeTutorial, case .coachmark(let index) = phase else { return }
        if index + 1 < Self.steps(for: tutorial).count {
            phase = .coachmark(index + 1)
            return
        }
        preferences.markTutorialSeen(tutorial.id)
        finish()
    }

    func skipCoachmarks() {
        if isWelcomeTour {
            preferences.markAllTutorialsSeen()
        } else if let activeTutorial {
            preferences.markTutorialSeen(activeTutorial.id)
        }
        finish()
    }

    private func beginTutorial(_ tutorial: TutorialID) {
        guard !Self.steps(for: tutorial).isEmpty else {
            finish()
            return
        }
        activeTutorial = tutorial
        activeTab = tutorial.rootTab
        if tutorial == .roster { requestTeamPage(.roster) }
        if tutorial == .schedule { requestTeamPage(.schedule) }
        phase = .coachmark(0)
    }

    private func requestTeamPage(_ page: TutorialTeamPage) {
        requestedTeamPage = page
        teamPageRouteToken += 1
    }

    private func finish() {
        phase = .hidden
        activeTutorial = nil
        preferences.markOnboardingSeen()
        isWelcomeTour = false
        isReplay = false
    }

    private static func steps(for tutorial: TutorialID) -> [CoachmarkStep] {
        switch tutorial {
        case .roster: CoachmarkStep.roster
        case .schedule: CoachmarkStep.schedule
        case .compare: CoachmarkStep.compare
        }
    }
}

struct CoachmarkStep: Identifiable {
    let id: CoachmarkID
    let title: String
    let message: String
    let fallbackMessage: String?

    init(
        id: CoachmarkID, title: String, message: String, fallbackMessage: String? = nil
    ) {
        self.id = id
        self.title = title
        self.message = message
        self.fallbackMessage = fallbackMessage
    }

    static let roster: [CoachmarkStep] = [
        CoachmarkStep(
            id: .playerDot,
            title: "Tap any player",
            message: "Every dot on the field opens that player's stats and spot on the depth chart."
        ),
        CoachmarkStep(
            id: .overflowMenu,
            title: "More lives in here",
            message:
                "Uniforms, past seasons, formations, and edit mode are all one tap away in this menu."
        ),
    ]

    static let schedule: [CoachmarkStep] = [
        CoachmarkStep(
            id: .scheduleGame,
            title: "Compare a matchup",
            message: "Tap a game to compare these teams.",
            fallbackMessage:
                "When a current-season game is available, tap it to compare these teams."
        )
    ]

    static let compare: [CoachmarkStep] = [
        CoachmarkStep(
            id: .compareSwitcher,
            title: "Choose a view",
            message: "By team lines up unit metrics. By position compares depth at each spot."
        )
    ]
}
