import XCTest

// XCUITest performance coverage for design spec Performance Review #5/#6: launch and
// first-useful-render budgets, measured against the real running app driven from a
// separate process (same real staging Supabase data as `DepthUITests.swift`, not a
// mock). `XCTApplicationLaunchMetric` is Apple's standard warm-launch metric; the custom
// `XCTOSSignpostMetric` targets the app-init → team-list-loaded interval this task adds
// (`ios/Depth/Support/DepthSignposts.swift`'s `appLaunch`/`subsystem`/`category` —
// duplicated here as literal strings since a UI test process can't `@testable import
// Depth`). Neither `measure(metrics:)` call fails a test by itself without a recorded
// Xcode baseline (a machine-specific artifact this repo doesn't commit), so the actual
// CI-blocking gate is the manual `ContinuousClock` assertion in
// `testWarmRelaunchReachesFirstUsefulRenderWithinBudget` below.
@MainActor
final class PerformanceUITests: XCTestCase {
    private func oneShotOptions() -> XCTMeasureOptions {
        let options = XCTMeasureOptions()
        options.iterationCount = 1
        return options
    }

    /// `TeamListView`'s `.searchable` search field exists as soon as the
    /// `NavigationStack` builds — including during the loading skeleton, before any
    /// team data has arrived — so it isn't proof the list actually rendered (Greptile
    /// P1, PR #371). A real team row (`team-row-<id>`, `TeamListView.swift`) only
    /// exists once `TeamListViewModel.load()` reaches `.loaded` with a non-empty list,
    /// making it the accurate "content rendered" signal for these tests.
    private func waitForFirstTeamRow(in app: XCUIApplication, timeout: TimeInterval = 10) -> Bool {
        app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'team-row-'")).firstMatch
            .waitForExistence(timeout: timeout)
    }

    func testColdLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()], options: oneShotOptions()) {
            let app = XCUIApplication()
            app.launchArguments = ["UI_TESTING_RESET_STATE"]
            app.launch()
        }
    }

    func testAppLaunchSignpostMetric() throws {
        // Must match DepthSignposts.subsystem/.category/.appLaunch exactly — the app's
        // bundle identifier (ios/xcconfig/Base.xcconfig's PRODUCT_BUNDLE_IDENTIFIER).
        let metric = XCTOSSignpostMetric(
            subsystem: "com.cwharris.depth",
            category: "performance",
            name: "AppLaunchToFirstUsefulRender"
        )
        measure(metrics: [metric], options: oneShotOptions()) {
            let app = XCUIApplication()
            app.launchArguments = ["UI_TESTING_RESET_STATE"]
            app.launch()
            _ = waitForFirstTeamRow(in: app)
        }
    }

    /// The manual, CI-blocking budget check (see file header for why `measure()` alone
    /// isn't enough). The first `app.launch()` primes the on-device cache — SwiftData
    /// isn't reset by `UI_TESTING_RESET_STATE` (that only clears the UserDefaults-backed
    /// last-team/last-unit prefs) — so the second, measured launch exercises the actual
    /// "warm cached content" scenario the spec's <1s budget targets. The threshold here
    /// (15s) is far looser than that spec number on purpose: a full XCUITest
    /// `app.launch()` pays for simulator process spawn and XCUITest's own
    /// instrumentation attach on top of the app's warm-cache render — overhead the
    /// spec's <1s number was never meant to include — and `ios-ci.yml`'s GitHub-hosted
    /// macOS runners are measurably slower than local dev hardware for this exact
    /// interval. A real CI run (depth#371) measured the *app-internal*
    /// `AppLaunchToFirstUsefulRender` signpost (`testAppLaunchSignpostMetric` above) at
    /// 2.094s on CI vs 0.528s locally, and Apple's own `XCTApplicationLaunchMetric`
    /// (`testColdLaunchPerformance`) at 2.459s CI vs 1.013s locally — a consistent ~2-2.4x
    /// slowdown across every launch-related metric, not a regression isolated to this
    /// flow, which is why the fix here is a wider budget rather than a code change. That
    /// same CI run measured this flow-level interval (which stacks XCUITest's own launch
    /// overhead on top of the app-internal number) at 6.44s; 15s keeps meaningful margin
    /// over that single data point for shared-runner noise while still catching an
    /// order-of-magnitude regression.
    func testWarmRelaunchReachesFirstUsefulRenderWithinBudget() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(waitForFirstTeamRow(in: app), "team list should load on the priming launch")
        app.terminate()

        let clock = ContinuousClock()
        let start = clock.now
        app.launch()
        XCTAssertTrue(waitForFirstTeamRow(in: app), "team list should load on the warm relaunch")
        let elapsed = clock.now - start

        XCTAssertLessThan(
            elapsed, .seconds(15),
            "warm relaunch to first useful render should stay well under budget, with slack for XCUITest/CI overhead"
        )
    }
}
