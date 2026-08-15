import XCTest

// Task 8E live journey: open a team, share the depth chart, and confirm the native
// share sheet presents on real production-shaped staging data. Cancelling must leave
// the team-detail screen unchanged (QA plan's "cancellation" case).
final class ShareUITests: XCTestCase {
    func testShareDepthChartPresentsTheNativeShareSheet() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "search field should appear once the team list loads")
        searchField.tap()
        searchField.typeText("Bills")

        let teamRow = app.buttons["team-row-bills"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 10), "searching \"Bills\" should surface the Buffalo Bills row")
        teamRow.tap()

        let shareButton = app.buttons["share-depth-chart"]
        XCTAssertTrue(shareButton.waitForExistence(timeout: 10), "team detail should expose a Share entry point")
        shareButton.tap()

        let shareSheet = app.otherElements["ActivityListView"]
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 10), "tapping Share should present the native share sheet")
        XCTAssertTrue(
            app.navigationBars["Buffalo Bills depth chart · Depth"].waitForExistence(timeout: 5),
            "the share sheet should carry the rendered card's title"
        )

        // Cancel via the popover's dismiss region; the team-detail screen underneath
        // must be unaffected (still showing the same team, no state change).
        let dismissRegion = app.otherElements["PopoverDismissRegion"]
        XCTAssertTrue(dismissRegion.waitForExistence(timeout: 5))
        dismissRegion.tap()
        XCTAssertFalse(shareSheet.waitForExistence(timeout: 3), "the share sheet should dismiss on cancel")
        XCTAssertTrue(shareButton.waitForExistence(timeout: 5), "team detail should remain unchanged after cancelling the share sheet")
    }
}
