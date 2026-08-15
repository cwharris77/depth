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
            _ = app.searchFields.firstMatch.waitForExistence(timeout: 10)
        }
    }

    /// The manual, CI-blocking budget check (see file header for why `measure()` alone
    /// isn't enough). The first `app.launch()` primes the on-device cache — SwiftData
    /// isn't reset by `UI_TESTING_RESET_STATE` (that only clears the UserDefaults-backed
    /// last-team/last-unit prefs) — so the second, measured launch exercises the actual
    /// "warm cached content" scenario the spec's <1s budget targets. The threshold here
    /// (5s) is far looser than that spec number on purpose: a full XCUITest
    /// `app.launch()` pays for simulator process spawn and XCUITest's own
    /// instrumentation attach on top of the app's warm-cache render — overhead the
    /// spec's <1s number was never meant to include. 5s still catches an
    /// order-of-magnitude regression without flaking on a loaded CI runner (see
    /// `.superpowers/sdd/2026-08-14-native-ios-app/task-9b-performance-report.md`).
    func testWarmRelaunchReachesFirstUsefulRenderWithinBudget() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 10), "team list should load on the priming launch")
        app.terminate()

        let clock = ContinuousClock()
        let start = clock.now
        app.launch()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 10), "team list should load on the warm relaunch")
        let elapsed = clock.now - start

        XCTAssertLessThan(
            elapsed, .seconds(5),
            "warm relaunch to first useful render should stay well under budget, with slack for XCUITest/CI overhead"
        )
    }
}
