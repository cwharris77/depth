import Foundation
import Observation

// Favorite-team + start-on-favorite state for the Settings sheet and startup resolution
// (DEP-319), mirroring web's AccountView favorite controls (components/AccountView.tsx):
//
//   - load() fetches the signed-in user's settings row (missing row → defaults). It is a
//     no-op while signed out — the row is account-gated by RLS, so there is nothing to
//     read — which is also what keeps a stale favorite from ever applying after a
//     sign-out (the store never persists to disk; it is server-backed only).
//   - selectTeam() writes the favorite optimistically to local state, then fire-and-
//     forgets the server mirror. Setting a favorite for the *first* time opts into
//     start-on-favorite, exactly like web's changeFavorite (`if (next && !prev) {
//     setStartOnFavorite(true); putSettings({favoriteTeamId, startOnFavorite: true}) }`).
//   - setStartOnFavorite() writes just the toggle, the same single-field partial upsert
//     as web's `putSettings({ startOnFavorite: next })`.
//
// The optimistic local value renders immediately (selectTeam flips state before awaiting
// the server), and the startup resolver reads the same store — so a favorite picked this
// session already wins the next DepthChartsTab resolution, and a server write that fails
// surfaces as a non-fatal hint under the settings card, exactly web's fire-and-forget
// putSettings.
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
    /// The live session; remote access is gated on this so a stale favorite never
    /// survives a sign-out (the store itself is ephemeral — server-backed only, never
    /// persisted to disk).
    private let sessionStore: AuthSessionStore

    init(remote: (any UserSettingsServicing)?, sessionStore: AuthSessionStore) {
        self.remote = remote
        self.sessionStore = sessionStore
    }

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
        // `.task` could run while `isRestoring` is still true and skip the favorite tier
        // for the launch (a fresh launch would open last-viewed instead of the favorite).
        while sessionStore.isRestoring {
            try? await Task.sleep(for: .milliseconds(25))
        }
        guard isSignedIn else { return }
        do {
            let settings = try await remote.settings()
            favoriteTeamId = settings.favoriteTeamId
            startOnFavorite = settings.startOnFavorite
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
            mirror(.favorite(id, startOnFavorite: true))
        } else {
            mirror(.favorite(id))
        }
    }

    func setStartOnFavorite(_ on: Bool) {
        startOnFavorite = on
        updateError = nil
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