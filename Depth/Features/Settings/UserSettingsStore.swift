import Foundation
import Observation

// Favorite-team + start-on-favorite state for Settings and startup resolution.
//
//   - While it is kept on the device, the favorite is read from UserPreferences at
//     launch and exists without an account. Otherwise it lives only on the signed-in
//     user's settings row and there is none while signed out.
//   - load() fetches the signed-in user's settings row. The account's favorite replaces
//     the device's; an account without one takes the device's. Signed out it reads
//     nothing: the row is account-gated by RLS.
//   - selectTeam() writes the favorite to local state first, then mirrors it to the
//     server without waiting. Setting a favorite for the first time opts into
//     start-on-favorite.
//   - setStartOnFavorite() writes just the toggle, as a single-field partial upsert.
//
// The local value renders immediately and the startup resolver reads the same store, so
// a favorite picked this session already wins the next resolution. A server write that
// fails surfaces as a non-fatal hint in Settings.
@Observable
@MainActor
final class UserSettingsStore {
    /// The favorite picker's live value (nil = "No favorite"). Read by the startup
    /// resolver for the favorite tier of `StartupTeam.resolve`.
    private(set) var favoriteTeamId: String?
    /// The "open this team when I start the app" toggle. Defaults on (web parity); only
    /// consulted by the resolver when a favorite is set.
    private(set) var startOnFavorite = true
    /// True until the first settings load resolves, so the picker renders a placeholder
    /// instead of flashing "No favorite" before the real value arrives (web's
    /// `settingsLoaded` skeleton gate — the same flash-then-jump guard).
    private(set) var isLoading = true
    /// Non-fatal write error surfaced under the settings card.
    private(set) var updateError: String?

    /// Server sink; consulted only while signed in (RLS-gated row — a signed-out write
    /// could never succeed, and web's `if (user)` guard skips it entirely).
    private let remote: (any UserSettingsServicing)?
    /// The live session; remote access is gated on this.
    private let sessionStore: AuthSessionStore
    /// Where the favorite is kept on the device, and whether it is kept there at all.
    /// While it is, the favorite exists without an account and survives a sign-out.
    private let preferences: UserPreferences?
    private let keepsOnDevice: @MainActor () -> Bool
    /// Told the favorite whenever it is set, cleared or first known.
    private let onFavoriteChange: (@MainActor (String?) -> Void)?

    init(
        remote: (any UserSettingsServicing)?,
        sessionStore: AuthSessionStore,
        preferences: UserPreferences? = nil,
        keepsOnDevice: @escaping @MainActor () -> Bool = { false },
        onFavoriteChange: (@MainActor (String?) -> Void)? = nil
    ) {
        self.remote = remote
        self.sessionStore = sessionStore
        self.preferences = preferences
        self.keepsOnDevice = keepsOnDevice
        self.onFavoriteChange = onFavoriteChange
        if let device {
            favoriteTeamId = device.favoriteTeamId
            startOnFavorite = device.startOnFavorite
        }
    }

    /// The device copy, while the favorite is kept on the device.
    private var device: UserPreferences? { keepsOnDevice() ? preferences : nil }

    /// True when a favorite can be held: on the device, or on a signed-in account.
    var canHoldFavorite: Bool { device != nil || isSignedIn }

    /// True while there is a signed-in user whose row is readable/writable.
    private var isSignedIn: Bool {
        sessionStore.user != nil
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        guard let remote else { return }
        // Wait for the session restore (ContentView's `.task` refresh()) to settle before
        // deciding whether there is a row to read — without this, the startup resolver's
        // `.task` could run while the restore is still in flight and skip the favorite
        // tier for the launch (a fresh launch would open last-viewed instead of the
        // favorite). The guard below therefore cannot be hoisted above this await to skip
        // the wait when signed out: `user` is nil for the whole restore window, so
        // "signed out" is not knowable until this returns.
        await sessionStore.waitForRestore()
        // A favorite already known, from the device, is announced whatever the account
        // read below comes to.
        defer { if let favoriteTeamId { onFavoriteChange?(favoriteTeamId) } }
        guard isSignedIn else { return }
        do {
            let settings = try await remote.settings()
            if device != nil, settings.favoriteTeamId == nil, let local = favoriteTeamId {
                // The account has no favorite yet, so it takes the device's.
                mirror(.favorite(local, startOnFavorite: startOnFavorite))
                return
            }
            favoriteTeamId = settings.favoriteTeamId
            startOnFavorite = settings.startOnFavorite
            device?.favoriteTeamId = settings.favoriteTeamId
            device?.startOnFavorite = settings.startOnFavorite
        } catch {
            // Best-effort: keep the current (or default) values rather than blanking the
            // controls when the read fails (offline, auth hiccup) — the sheet opens on
            // defaults and the startup tier simply falls back to last-viewed.
        }
    }

    /// Called for every row picked in the picker, including "No favorite" (nil).
    func selectTeam(_ id: String?) {
        let previous = favoriteTeamId
        favoriteTeamId = id
        updateError = nil
        device?.favoriteTeamId = id
        if previous != id { onFavoriteChange?(id) }

        guard let id else {
            // Clears the favorite. startOnFavorite stays whatever it was — the toggle
            // hides once there's no favorite, and setting a favorite again re-opts in.
            mirror(.clearFavorite())
            return
        }
        if previous == nil {
            // First favorite ever set opts into open-at-startup (web parity: the one
            // two-field body web sends).
            startOnFavorite = true
            device?.startOnFavorite = true
            mirror(.favorite(id, startOnFavorite: true))
        } else {
            mirror(.favorite(id))
        }
    }

    func setStartOnFavorite(_ on: Bool) {
        startOnFavorite = on
        updateError = nil
        device?.startOnFavorite = on
        mirror(.startOnFavorite(on))
    }

    /// Fire-and-forget: the optimistic local value already rendered; the server write
    /// must not block or fail the sheet. A dropped write surfaces as a non-fatal hint,
    /// matching web's fire-and-forget putSettings. In-flight tasks are retained so tests
    /// can deterministically observe every patch sent (`awaitPendingWrites`).
    private var pendingMirrors: [Task<Void, Never>] = []

    private func mirror(_ patch: UserSettingsPatch) {
        guard isSignedIn, let remote else { return }
        let task = Task {
            do {
                try await remote.update(patch)
            } catch {
                updateError = "This will sync the next time you're online."
            }
        }
        pendingMirrors.append(task)
    }

    /// Waits for all in-flight mirror writes to settle — test/diagnostic hook so a test
    /// can observe the exact patches sent rather than racing the fire-and-forget.
    func awaitPendingWrites() async {
        let pending = pendingMirrors
        pendingMirrors.removeAll()
        for task in pending { await task.value }
    }
}
