import Foundation

// Last-selected team/section restoration state. This is small key-value state, not
// a versioned server snapshot, so it lives in UserDefaults rather than SwiftData —
// keeps CachedSnapshotStore scoped to what it's actually versioning.
struct UserPreferences: Sendable {
    // UserDefaults is thread-safe (Apple docs) but not yet marked Sendable in this SDK —
    // `nonisolated(unsafe)` documents that the unchecked-Sendable risk is accepted, not
    // ignored.
    private nonisolated(unsafe) let defaults: UserDefaults

    private enum Key {
        static let lastTeamId = "preferences.lastTeamId"
        static let lastUnit = "preferences.lastUnit"
        static let uniformSelections = "preferences.uniformSelections"
        static let depthOverrides = "preferences.depthOverrides"
        static let seenOnboarding = "preferences.seenOnboarding"
        static let seenTutorials = "preferences.seenTutorials"
        static let notificationTier = "preferences.notificationTier"
        static let notificationTeamId = "preferences.notificationTeamId"
        static let pushToken = "preferences.pushToken"
        static let lastSyncedRegistration = "preferences.lastSyncedRegistration"
        static let hasFinishedFirstSession = "preferences.hasFinishedFirstSession"
        static let bigMomentPromptShown = "preferences.bigMomentPromptShown"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    var lastTeamId: String? {
        get { defaults.string(forKey: Key.lastTeamId) }
        nonmutating set { defaults.set(newValue, forKey: Key.lastTeamId) }
    }

    var lastUnit: Unit? {
        get { (defaults.string(forKey: Key.lastUnit)).flatMap(Unit.init(rawValue:)) }
        nonmutating set { defaults.set(newValue?.rawValue, forKey: Key.lastUnit) }
    }

    /// The chosen notification level. Absent means the default, Big moments.
    var notificationTier: NotificationTier {
        get {
            defaults.string(forKey: Key.notificationTier).flatMap(NotificationTier.init(rawValue:))
                ?? .bigMoments
        }
        nonmutating set { defaults.set(newValue.rawValue, forKey: Key.notificationTier) }
    }

    /// The team this device is notified about. Set when the user opts in and changed only
    /// from the notification control; it does not follow the team being viewed.
    var notificationTeamId: String? {
        get { defaults.string(forKey: Key.notificationTeamId) }
        nonmutating set { defaults.set(newValue, forKey: Key.notificationTeamId) }
    }

    /// The last APNs token the system handed over, as lowercase hex.
    var pushToken: String? {
        get { defaults.string(forKey: Key.pushToken) }
        nonmutating set { defaults.set(newValue, forKey: Key.pushToken) }
    }

    /// "token|team|tier" of the last registration the server accepted, so an unchanged
    /// one is not sent on every foreground.
    var lastSyncedRegistration: String? {
        get { defaults.string(forKey: Key.lastSyncedRegistration) }
        nonmutating set { defaults.set(newValue, forKey: Key.lastSyncedRegistration) }
    }

    /// True once the app has gone to the background at least once.
    var hasFinishedFirstSession: Bool {
        get { defaults.bool(forKey: Key.hasFinishedFirstSession) }
        nonmutating set { defaults.set(newValue, forKey: Key.hasFinishedFirstSession) }
    }

    /// True once the one-time notification prompt has been shown, whatever the answer.
    var bigMomentPromptShown: Bool {
        get { defaults.bool(forKey: Key.bigMomentPromptShown) }
        nonmutating set { defaults.set(newValue, forKey: Key.bigMomentPromptShown) }
    }

    /// Returns the notification choice and the prompt to a fresh install's state.
    func resetNotificationState() {
        for key in [
            Key.notificationTier, Key.notificationTeamId, Key.pushToken,
            Key.lastSyncedRegistration, Key.bigMomentPromptShown,
        ] {
            defaults.removeObject(forKey: key)
        }
    }

    /// Per-team uniform selection: the uniform the
    /// field recolors with. Keyed by team id so switching teams keeps each team's own
    /// jersey, mirroring web's per-team localStorage kit selection.
    func uniformSelection(for teamId: String) -> String? {
        (defaults.dictionary(forKey: Key.uniformSelections) as? [String: String])?[teamId]
    }

    func setUniformSelection(_ uniformId: String?, for teamId: String) {
        var selections =
            defaults.dictionary(forKey: Key.uniformSelections) as? [String: String] ?? [:]
        if let uniformId {
            selections[teamId] = uniformId
        } else {
            selections[teamId] = nil
        }
        defaults.set(selections, forKey: Key.uniformSelections)
    }

    // Local-first custom depth-chart order, literal port of web's
    // web/lib/utils/depth-chart/depth-overrides.ts (localStorage there, UserDefaults here).
    // The always-on cache — works with no account, mirrored to the server only when
    // signed in (DepthOverrideStore.LocalFirstWriter). Stored as plain
    // [teamId: [positionRawValue: [playerId]]] — a plist-native shape, no JSON
    // encode/decode needed, matching this file's existing dictionary(forKey:) pattern.

    private var overrideStore: [String: [String: [String]]] {
        defaults.dictionary(forKey: Key.depthOverrides) as? [String: [String: [String]]] ?? [:]
    }

    func teamOverride(for teamId: String) -> [Position: [String]] {
        decode(overrideStore[teamId] ?? [:])
    }

    /// Every locally-held team's override, teamId -> override. Used by the sign-in
    /// merge to reconcile the whole local cache against the server at once.
    func allOverrides() -> [String: [Position: [String]]] {
        overrideStore.mapValues(decode)
    }

    func setPositionOrder(teamId: String, position: Position, ids: [String]) {
        var store = overrideStore
        var team = store[teamId] ?? [:]
        team[position.rawValue] = ids
        store[teamId] = team
        defaults.set(store, forKey: Key.depthOverrides)
    }

    func clearPositionOrder(teamId: String, position: Position) {
        var store = overrideStore
        guard var team = store[teamId] else { return }
        team[position.rawValue] = nil
        store[teamId] = team.isEmpty ? nil : team
        defaults.set(store, forKey: Key.depthOverrides)
    }

    func clearTeamOverride(teamId: String) {
        var store = overrideStore
        store[teamId] = nil
        defaults.set(store, forKey: Key.depthOverrides)
    }

    /// Replaces a team's whole override at once (sign-in merge pulling the server's
    /// copy, which wins per team — web/lib/utils/depth-chart/overrides-sync.ts's
    /// `planMerge`). An empty override clears the team's entry entirely.
    func setTeamOverride(_ override: [Position: [String]], for teamId: String) {
        var store = overrideStore
        if override.isEmpty {
            store[teamId] = nil
        } else {
            store[teamId] = Dictionary(
                uniqueKeysWithValues: override.map { ($0.key.rawValue, $0.value) })
        }
        defaults.set(store, forKey: Key.depthOverrides)
    }

    // First-run tutorial "seen" flag, a one-time flag. OnboardingController checks
    // this once at launch (startIfNeeded) and sets it the moment the welcome/coachmark flow
    // is skipped or finished — never on every intermediate step — so a user who backgrounds
    // the app mid-tour doesn't see it silently reset. Settings' "Take the tour" row bypasses
    // this flag entirely (OnboardingController.replay()), it only gates the automatic
    // first-launch trigger.
    var hasSeenOnboarding: Bool {
        defaults.bool(forKey: Key.seenOnboarding)
    }

    func markOnboardingSeen() {
        defaults.set(true, forKey: Key.seenOnboarding)
    }

    /// Test-reset hook — UI_TESTING_RESET_STATE restores this to its "unseen" default so
    /// onboarding UI tests start deterministic.
    func clearOnboardingSeen() {
        defaults.removeObject(forKey: Key.seenOnboarding)
    }

    func hasSeenTutorial(_ id: String) -> Bool {
        (defaults.stringArray(forKey: Key.seenTutorials) ?? []).contains(id)
    }

    func markTutorialSeen(_ id: String) {
        var seen = defaults.stringArray(forKey: Key.seenTutorials) ?? []
        guard !seen.contains(id) else { return }
        seen.append(id)
        defaults.set(seen, forKey: Key.seenTutorials)
    }

    func markAllTutorialsSeen() {
        defaults.set(TutorialID.allCases.map(\.id), forKey: Key.seenTutorials)
    }

    func clearTutorialsSeen() {
        defaults.removeObject(forKey: Key.seenTutorials)
    }

    private func decode(_ raw: [String: [String]]) -> [Position: [String]] {
        Dictionary(
            uniqueKeysWithValues: raw.compactMap { key, ids in
                Position(rawValue: key).map { ($0, ids) }
            })
    }
}
