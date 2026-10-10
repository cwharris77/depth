import UserNotifications

/// What the app does with a notification the user acted on. Parsing is separate from
/// the delegate so it can be tested without a delivered notification, and the parsed
/// value is Sendable so it can cross from the delegate callback to the main actor.
enum NotificationResponse: Equatable, Sendable {
    case openTeam(String)
    case turnOffEverything
    case ignore

    /// The category the sender puts on a notification that includes an Everything-tier
    /// event. Must match the sender's value exactly.
    static let everythingCategory = "EVERYTHING_TIER"
    static let turnOffEverythingAction = "TURN_OFF_EVERYTHING"

    static func parse(actionIdentifier: String, userInfo: [AnyHashable: Any])
        -> NotificationResponse
    {
        if actionIdentifier == turnOffEverythingAction { return .turnOffEverything }
        guard actionIdentifier == UNNotificationDefaultActionIdentifier,
            let teamId = userInfo["team_id"] as? String, !teamId.isEmpty
        else { return .ignore }
        return .openTeam(teamId)
    }

    /// Carries the response out. Opening a team parks the request for the Depth Charts
    /// tab and selects that tab, because the tap can arrive while another tab is showing.
    /// Inert while the feature is switched off.
    @MainActor
    func perform(
        routes: TeamRouteStore, onboarding: OnboardingController,
        settings: NotificationSettingsStore
    ) async {
        guard settings.isAvailable else { return }
        switch self {
        case .openTeam(let teamId):
            routes.request(teamId: teamId)
            onboarding.activeTab = .depthCharts
        case .turnOffEverything:
            await settings.turnOffEverything()
        case .ignore:
            break
        }
    }
}
