import Foundation
import Observation

/// The device's notification choice and everything needed to keep the server's copy of
/// it current: the chosen tier and team, the APNs token and the system permission.
///
/// What is sent to the server is the chosen tier while permission is granted and `off`
/// once it is denied, so revoking permission in system settings stops delivery without
/// discarding the choice. Nothing is sent before the permission question is answered.
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
    /// The one pass that is sending registrations, if any. See `sync()`.
    @ObservationIgnored private var sending: Task<Void, Never>?

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
        if authorization == .notDetermined, preferences.pushToken != nil {
            // This install has never registered for a token, so a stored one was restored
            // from a backup or device transfer and identifies a different install.
            preferences.pushToken = nil
            preferences.lastSyncedRegistration = nil
        }
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

    /// What the server should hold right now. Nil without a token or a team, and while the
    /// permission question is unanswered. `off` is sent only when it was chosen or when
    /// permission is denied.
    private var desiredRegistration: PushRegistration? {
        guard let token = preferences.pushToken, let teamId else { return nil }
        let effective: NotificationTier
        switch authorization {
        case .authorized: effective = tier
        case .denied: effective = .off
        case .notDetermined: return nil
        }
        return PushRegistration(
            token: token, teamId: teamId, tier: effective, bundleId: bundleId,
            environment: environment)
    }

    private func marker(for registration: PushRegistration) -> String {
        "\(registration.token)|\(registration.teamId)|\(registration.tier.rawValue)"
    }

    /// Brings the server up to date with the current choice and system permission, and
    /// returns once that is done or has failed. The permission is read here so that no
    /// caller can sync from a value read earlier or never read at all.
    ///
    /// At most one request is in flight. A call that arrives during one waits for the
    /// running pass, which keeps sending until what it last sent is what is wanted.
    private func sync() async {
        authorization = await authorizer.status()
        if let sending {
            await sending.value
            return
        }
        let pass = Task {
            await sendUntilCurrent()
            // Cleared in the same main-actor turn as the loop's last check, so a caller
            // never waits on a pass that has already decided to stop.
            sending = nil
        }
        sending = pass
        await pass.value
    }

    /// The marker is cleared before each request and written only after it succeeds: a
    /// request with an unknown outcome leaves no marker, so the next sync sends again
    /// whatever the choice is by then. A failure is not retried here unless the wanted
    /// registration changed in the meantime; the next refresh retries it.
    private func sendUntilCurrent() async {
        var lastSent: PushRegistration?
        while let wanted = desiredRegistration, wanted != lastSent,
            preferences.lastSyncedRegistration != marker(for: wanted)
        {
            preferences.lastSyncedRegistration = nil
            lastSent = wanted
            do {
                try await service.register(wanted)
                preferences.lastSyncedRegistration = marker(for: wanted)
            } catch {
                // Best-effort: the choice is kept locally and re-sent on the next refresh.
            }
        }
    }
}
