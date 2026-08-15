import SwiftData
import SwiftUI

// App entry point. Owns nothing but scene wiring — no Supabase/repository access here
// or in any view; that boundary is DepthEnvironment (Support/) and the DepthRepository
// protocol (Data/), per the design spec's "views never query Supabase directly" rule.
@main
struct DepthApp: App {
    init() {
        // Opens the "app init → first useful render" signpost interval (Performance
        // Review #5); closed by TeamDetailViewModel.load() on its first successful load.
        DepthSignposts.beginAppLaunch()

        // UI tests launch with this argument so every test starts from the same
        // anonymous, no-restored-team state instead of inheriting whatever a previous
        // run/manual session left in UserDefaults.
        if ProcessInfo.processInfo.arguments.contains("UI_TESTING_RESET_STATE") {
            DepthEnvironment.preferences.lastTeamId = nil
            DepthEnvironment.preferences.lastUnit = nil
        }

        // App Store screenshot capture (task-9d-screenshots-brief.md) needs the same
        // clean-slate starting state as UI_TESTING_RESET_STATE: with no restored team,
        // the Depth Charts tab opens on StartupTeam.defaultTeamId, so a screenshot run
        // always starts from the same chart regardless of what a prior manual session
        // left behind. AppStoreScreenshotsUITests then opens the team switcher and picks
        // Buffalo Bills itself; that selection persists for the rest of the one launch.
        // The signed-out half of "deterministic, signed-out state" is enforced in
        // ContentView's `.task` (after session restore has a chance to run).
        if ProcessInfo.processInfo.arguments.contains("UI_TESTING_APPSTORE_SCREENSHOTS") {
            DepthEnvironment.preferences.lastTeamId = nil
            DepthEnvironment.preferences.lastUnit = nil
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(DepthEnvironment.modelContainer)
    }
}
