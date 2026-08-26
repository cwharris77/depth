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

        // UI_TESTING_START_TEAM: an optional test launch arg (`UI_TESTING_START_TEAM=bills`)
        // that pins the launch destination to a specific team after the reset above. Every
        // production-backed journey that only needs *a* real team (schedule, page-switcher,
        // stats/schedule season pickers, tab bar reachability) previously spent the same
        // ~20s-plus prologue — cold default-team fetch, then opening the switcher sheet and
        // waiting up to 20s (`selectTeam`'s row wait) just to land on the Bills. With this
        // arg the app launches straight into that team's chart, so those journeys collapse a
        // 5-line `selectTeam` prologue into a single `waitForDepthChart`. It writes
        // `lastTeamId`, the *same* preference `selectTeam` ultimately sets, so the launched
        // state is indistinguishable from a real switch. Must run after the reset block so it
        // wins over the nil-ing above. Only honored while UI_TESTING_RESET_STATE is set, so
        // it can never leak into a manual launch.
        if ProcessInfo.processInfo.arguments.contains("UI_TESTING_RESET_STATE"),
            let startTeamArg = ProcessInfo.processInfo.arguments.first(where: {
                $0.hasPrefix("UI_TESTING_START_TEAM=")
            })
        {
            // Trim both the prefix and whitespace so whitespace-separated launch-arg arrays
            // pass the value cleanly.
            let teamName = startTeamArg
                .replacingOccurrences(of: "UI_TESTING_START_TEAM=", with: "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            if !teamName.isEmpty {
                // Resolve-free direct write: StartupTeam.resolve would validate against the
                // live ids, but the list hasn't loaded this early in init. Tests pass a
                // real id, and DepthChartsTab's `.task` already corrects a stale
                // preference once the list arrives (AGENTS.md invariant 6), so writing the
                // raw id here is safe.
                DepthEnvironment.preferences.lastTeamId = teamName
            }
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
