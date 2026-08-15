import SwiftData
import SwiftUI

// App entry point. Owns nothing but scene wiring — no Supabase/repository access here
// or in any view; that boundary is DepthEnvironment (Support/) and the DepthRepository
// protocol (Data/), per the design spec's "views never query Supabase directly" rule.
@main
struct DepthApp: App {
    init() {
        // Opens the "app init → first useful render" signpost interval (Performance
        // Review #5); closed by `TeamListViewModel.load()` on its first successful load.
        DepthSignposts.beginAppLaunch()

        // UI tests launch with this argument so every test starts from the same
        // anonymous, no-restored-team state instead of inheriting whatever a previous
        // run/manual session left in UserDefaults.
        if ProcessInfo.processInfo.arguments.contains("UI_TESTING_RESET_STATE") {
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
