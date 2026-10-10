import Foundation
import Observation

/// The device's notification choice and everything needed to keep the server's copy of
/// it current: the chosen tier and team, the APNs token and the system permission.
///
/// What is sent to the server is the chosen tier while permission is granted and `off`
/// once it is denied, so revoking permission in system settings stops delivery without
/// discarding the choice.
@MainActor
@Observable
final class NotificationSettingsStore {
    private(set) var tier: NotificationTier
    private(set) var teamId: String?
    private(set) var authorization: NotificationAuthorization = .notDetermined

    @ObservationIgnored private let service: any PushSubscriptionServicing
    @ObservationIgnored private let authorizer: any NotificationAuthorizing
    @ObservationIgnored private let preferences: UserPreferences
    @ObservationIgnored private let bundleId: String
    @ObservationIgnored private let environment: String
    @ObservationIgnored private let isEnabled: @MainActor () -> Bool

    init(
        service: any PushSubscriptionServicing,
        authorizer: any NotificationAuthorizing,
        preferences: UserPreferences,
        bundleId: String,
        environment: String,
        isEnabled: @escaping @MainActor () -> Bool
    ) {
        self.service = service
        self.authorizer = authorizer
        self.preferences = preferences
        self.bundleId = bundleId
        self.environment = environment
        self.isEnabled = isEnabled
        tier = preferences.notificationTier
        teamId = preferences.notificationTeamId
    }

    /// False while the feature is switched off; every entry point below is then inert.
    var isAvailable: Bool { isEnabled() }

    /// Re-reads the system permission and brings the server up to date. Call on launch
    /// and whenever the app becomes active.
    func refresh() async {
        guard isAvailable else { return }
        authorization = await authorizer.status()
        if authorization == .authorized, tier != .off, teamId != nil {
            // Tokens can change between launches; asking again is how a new one arrives.
            authorizer.registerForRemoteNotifications()
        }
        await sync()
    }

    /// Shows the system dialog if it has never been answered, then registers for a token.
    /// Returns whether notifications are now permitted.
    @discardableResult
    func enable(teamId candidate: String) async -> Bool {
        guard isAvailable else { return false }
        authorization = await authorizer.status()
        if authorization == .notDetermined {
            authorization = await authorizer.request() ? .authorized : .denied
        }
        guard authorization == .authorized else { return false }
        if teamId == nil { adopt(teamId: candidate) }
        if tier == .off { adopt(tier: .bigMoments) }
        authorizer.registerForRemoteNotifications()
        await sync()
        return true
    }

    /// `candidateTeamId` is used only when no team has been chosen yet.
    func setTier(_ newTier: NotificationTier, candidateTeamId: String?) async {
        guard isAvailable else { return }
        adopt(tier: newTier)
        if newTier != .off {
            authorization = await authorizer.status()
            if authorization == .notDetermined, let team = teamId ?? candidateTeamId {
                await enable(teamId: team)
                return
            }
            if teamId == nil, let candidateTeamId { adopt(teamId: candidateTeamId) }
            if authorization == .authorized { authorizer.registerForRemoteNotifications() }
        }
        await sync()
    }

    func setTeam(_ newTeamId: String) async {
        guard isAvailable else { return }
        adopt(teamId: newTeamId)
        await sync()
    }

    /// The system delivered an APNs token.
    func handleDeviceToken(_ data: Data) async {
        guard isAvailable else { return }
        preferences.pushToken = data.map { String(format: "%02x", $0) }.joined()
        authorization = await authorizer.status()
        await sync()
    }

    /// The "Turn off Everything" notification action.
    func turnOffEverything() async {
        guard isAvailable, tier == .everything else { return }
        adopt(tier: .bigMoments)
        await sync()
    }

    private func adopt(tier newTier: NotificationTier) {
        tier = newTier
        preferences.notificationTier = newTier
    }

    private func adopt(teamId newTeamId: String) {
        teamId = newTeamId
        preferences.notificationTeamId = newTeamId
    }

    /// Sends the current registration when it differs from the last one the server
    /// accepted. Without a token or a team there is nothing to register. A failure
    /// leaves the marker unchanged, so the next refresh tries again.
    private func sync() async {
        guard let token = preferences.pushToken, let teamId else { return }
        let effective = authorization == .authorized ? tier : NotificationTier.off
        let marker = "\(token)|\(teamId)|\(effective.rawValue)"
        guard preferences.lastSyncedRegistration != marker else { return }
        do {
            try await service.register(
                PushRegistration(
                    token: token, teamId: teamId, tier: effective, bundleId: bundleId,
                    environment: environment))
            preferences.lastSyncedRegistration = marker
        } catch {
            // Best-effort: the choice is kept locally and re-sent on the next refresh.
        }
    }
}
