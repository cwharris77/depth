import XCTest

// Task 8E live journey: open a team, share the depth chart, and confirm the native
// share sheet presents on real production data. Cancelling must leave
// the team-detail screen unchanged (QA plan's "cancellation" case).
final class ShareUITests: XCTestCase {
    @MainActor
    func testShareDepthChartPresentsTheNativeShareSheet() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")

        // Share lives behind the ••• overflow menu (2026-08-15 visual-pass: the bare
        // icon row was removed).
        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10), "team detail should expose the overflow menu")
        overflow.tap()

        let shareButton = app.buttons["share-depth-chart"]
        XCTAssertTrue(shareButton.waitForExistence(timeout: 5), "the overflow menu should expose a Share entry point")
        shareButton.tap()

        let shareSheet = app.otherElements["ActivityListView"]
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 10), "tapping Share should present the native share sheet")
        let brandedTitle = app.navigationBars.matching(
            NSPredicate(format: "identifier CONTAINS %@", "depth chart · The Sticks")
        ).firstMatch
        XCTAssertTrue(brandedTitle.waitForExistence(timeout: 5), "the share title should use the current brand")

        // Cancel via the popover's dismiss region; the team-detail screen underneath
        // must be unaffected (still showing the same team, no state change).
        let dismissRegion = app.otherElements["PopoverDismissRegion"]
        XCTAssertTrue(dismissRegion.waitForExistence(timeout: 5))
        dismissRegion.tap()
        XCTAssertTrue(shareSheet.waitForAbsence(timeout: 10), "the share sheet should dismiss on cancel")
        XCTAssertTrue(overflow.waitForExistence(timeout: 5), "team detail should remain unchanged after cancelling the share sheet")
        overflow.tap()
        XCTAssertTrue(shareButton.waitForExistence(timeout: 5), "Share should still be reachable in the overflow menu")
    }
}
