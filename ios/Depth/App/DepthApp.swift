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
        // run/manual session left in UserDefaults. Depth overrides (DEP-219) and the
        // one-time reorder hint (DEP-226) are part of that clean slate — without
        // clearing them a leftover Bills QB override from an earlier run makes reorder
        // tests non-deterministic.
        if ProcessInfo.processInfo.arguments.contains("UI_TESTING_RESET_STATE") {
            DepthEnvironment.preferences.lastTeamId = nil
            DepthEnvironment.preferences.lastUnit = nil
            DepthEnvironment.preferences.clearReorderHint()
            for teamId in DepthEnvironment.preferences.allOverrides().keys {
                DepthEnvironment.preferences.clearTeamOverride(teamId: teamId)
            }
            // DEP-251: mark the first-run tutorial already seen so the welcome screen
            // doesn't intercept every other UI test's launch — only
            // UI_TESTING_SHOW_ONBOARDING (below) opts back into seeing it.
            DepthEnvironment.preferences.markOnboardingSeen()
        }

        // DEP-251 onboarding UI tests: the one launch argument that puts the app back
        // into its genuine "never seen the tutorial" state, isolated from the blanket
        // "seen" default UI_TESTING_RESET_STATE sets above.
        if ProcessInfo.processInfo.arguments.contains("UI_TESTING_SHOW_ONBOARDING") {
            DepthEnvironment.preferences.clearOnboardingSeen()
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
            // Without this, the first coachmark step (.teamPill, "Tap here to jump to
            // any of the 32 teams' depth charts") sits on top of team-switcher-button
            // on a genuinely first launch and swallows the test's tap on it — the tap
            // dismisses the coachmark instead of opening the switcher sheet, so the
            // search field the test waits on next never appears. UI_TESTING_RESET_STATE
            // already avoids this (line ~30); this block needs the same call.
            DepthEnvironment.preferences.markOnboardingSeen()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(DepthEnvironment.modelContainer)
    }
}
