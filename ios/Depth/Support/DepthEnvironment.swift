import Foundation
import Supabase
import SwiftData

// Constructs the one shared SupabaseClient from the values baked into Info.plist by the
// active .xcconfig (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY — see ios/xcconfig/). Only
// the public publishable key ever reaches the app bundle; the secret key is never
// referenced anywhere in ios/.
enum DepthEnvironment {
    static let supabaseClient: SupabaseClient = {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: urlString),
            let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_PUBLISHABLE_KEY") as? String
        else {
            fatalError("Missing SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY in Info.plist — check the active .xcconfig")
        }
        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            // Opt in to emitting the locally stored session immediately as the initial
            // session (supabase-swift #822). The legacy default refreshed the stored
            // session before emitting it, which is the behavior Supabase is warning about
            // here; sessionChanges() filters expired sessions, so an expired stored
            // session is never surfaced as a signed-in user.
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }()

    /// This cache is disposable — Supabase is always the source of truth (design spec's
    /// "safe schema discard") — so a `ModelContainer` that fails to open (an
    /// incompatible on-disk store from an old build, e.g. after this app's own
    /// SwiftData model changes shape) must not crash-loop the app forever. One retry
    /// against a freshly wiped store directory recovers from that; only a second
    /// failure (a genuinely broken environment — disk full, sandbox issue) is fatal.
    static let modelContainer: ModelContainer = {
        let schema = Schema(DepthCacheSchema.models)
        let storeURL = URL.applicationSupportDirectory.appending(path: "DepthCache.store")
        let configuration = ModelConfiguration(schema: schema, url: storeURL)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // SQLite's WAL sidecar files are named by appending "-wal"/"-shm" to the
            // full store filename, not a `.wal`/`.shm` extension.
            for suffix in ["", "-wal", "-shm"] {
                let sidecarURL = storeURL.deletingLastPathComponent()
                    .appending(path: storeURL.lastPathComponent + suffix)
                try? FileManager.default.removeItem(at: sidecarURL)
            }
            do {
                return try ModelContainer(for: schema, configurations: [configuration])
            } catch {
                fatalError("Failed to create SwiftData ModelContainer even after clearing the store: \(error)")
            }
        }
    }()

    static let repository: CachingDepthRepository = CachingDepthRepository(
        underlying: SupabaseDepthRepository(client: supabaseClient),
        store: CachedSnapshotStore(modelContainer: modelContainer)
    )

    static let preferences = UserPreferences()
    static let authService: any DepthAuthServicing =
        SupabaseDepthAuthService(client: supabaseClient)
    static let overrideService: any DepthOverrideServicing =
        SupabaseDepthOverrideService(client: supabaseClient)
    static let appEvents: any AppEventsRecording = SupabaseAppEventsRecorder(client: supabaseClient)
    @MainActor static let authSessionStore = AuthSessionStore(service: authService)
    /// The current team's accent, published by DepthChartsTab and read by the root tab
    /// bar for its `.tint` — app chrome adopts team color (web parity: activeColors.uiAccent).
    @MainActor static let currentTeamStore = CurrentTeamStore()
    /// DEP-251 first-run tutorial state — owns the welcome/coachmark sequence, shared
    /// between ContentView (mounts the overlay + fires the first-launch trigger) and
    /// SettingsView ("Take the tour" row).
    @MainActor static let onboarding = OnboardingController(preferences: preferences)
}
