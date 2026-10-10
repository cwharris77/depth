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

@MainActor
@Observable
final class OnboardingController {
    enum Phase: Equatable {
        case hidden
        case welcome
        case coachmark(Int)
    }

    private(set) var phase: Phase = .hidden
    private(set) var activeTutorial: TutorialID?
    private(set) var teamPageRouteToken = 0
    private(set) var requestedTeamPage: TutorialTeamPage?
    var activeTab: RootTab = .depthCharts

    private let preferences: UserPreferences
    private var isCompleteTour = false
    private var hasEvaluatedLaunch = false

    init(preferences: UserPreferences) {
        self.preferences = preferences
    }

    var currentStep: CoachmarkStep? {
        guard let activeTutorial, case .coachmark(let index) = phase else { return nil }
        return Self.steps(for: activeTutorial).indices.contains(index)
            ? Self.steps(for: activeTutorial)[index] : nil
    }

    var stepNumber: Int {
        guard let activeTutorial, case .coachmark(let index) = phase else { return 0 }
        guard isCompleteTour else { return index + 1 }
        let prior = TutorialID.allCases.prefix { $0 != activeTutorial }
            .reduce(0) { $0 + Self.steps(for: $1).count }
        return prior + index + 1
    }

    var totalStepCount: Int {
        if !isCompleteTour, let activeTutorial {
            return Self.steps(for: activeTutorial).count
        }
        return TutorialID.allCases.reduce(0) { $0 + Self.steps(for: $1).count }
    }

    var isLastStep: Bool {
        guard let activeTutorial, case .coachmark(let index) = phase else { return false }
        if isCompleteTour {
            return activeTutorial == .compare && index == Self.steps(for: .compare).count - 1
        }
        return index == Self.steps(for: activeTutorial).count - 1
    }

    /// True while neither the welcome screen nor a coachmark tour is up.
    var isIdle: Bool { phase == .hidden && activeTutorial == nil }

    func startIfNeeded() {
        hasEvaluatedLaunch = true
        guard !preferences.hasSeenOnboarding else {
            preferences.markTutorialSeen(TutorialID.roster.id)
            return
        }
        isCompleteTour = true
        activeTab = .depthCharts
        phase = .welcome
    }

    func replay() {
        hasEvaluatedLaunch = true
        isCompleteTour = true
        activeTab = .depthCharts
        requestTeamPage(.roster)
        phase = .welcome
    }

    func skipWelcome() {
        if isCompleteTour { preferences.markAllTutorialsSeen() }
        finish()
    }

    func beginCoachmarks() {
        isCompleteTour = true
        beginTutorial(.roster)
    }

    func pageDidAppear(_ tutorial: TutorialID) {
        guard hasEvaluatedLaunch, phase == .hidden, !isCompleteTour,
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
        let steps = Self.steps(for: tutorial)
        if index + 1 < steps.count {
            phase = .coachmark(index + 1)
            return
        }

        preferences.markTutorialSeen(tutorial.id)
        guard isCompleteTour,
            let next = TutorialID.allCases.drop(while: { $0 != tutorial }).dropFirst().first
        else {
            finish()
            return
        }
        beginTutorial(next)
    }

    func skipCoachmarks() {
        if isCompleteTour {
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
        isCompleteTour = false
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
            id: .teamPill,
            title: "Switch teams anytime",
            message: "Tap here to jump to any of the 32 teams' depth charts."
        ),
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
        CoachmarkStep(
            id: .bottomTabs,
            title: "Explore the app",
            message: "Switch between Depth Charts, Compare, and Uniforms down here."
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
            id: .compareTeams,
            title: "Pick two teams",
            message: "Tap either slot to choose the teams you want to compare."
        ),
        CoachmarkStep(
            id: .compareSwitcher,
            title: "Choose a view",
            message: "By team lines up unit metrics. By position compares depth at each spot."
        ),
        CoachmarkStep(
            id: .compareContent,
            title: "Read the comparison",
            message:
                "Browse offense, defense, and special teams metrics, or switch to a position for the depth chart."
        ),
    ]
}
