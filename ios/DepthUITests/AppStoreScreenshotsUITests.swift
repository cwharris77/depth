import XCTest

// Deterministic App Store screenshot capture (task-9d-screenshots-brief.md). Not part of
// the default `xcodebuild test` run — excluded via project.yml's scheme `skippedTests`
// because it's a slow, human-triggered release-prep tool, not a correctness gate, and
// because screenshot #4 deliberately previews the reorder editor via a screenshot-only
// bypass rather than a real authenticated session (see TeamDetailView.beginEditing's
// `isAppStoreScreenshotMode`). Run it explicitly:
//
//   xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
//     -destination 'platform=iOS Simulator,id=<a 6.9-inch simulator UDID>' \
//     -only-testing:DepthUITests/AppStoreScreenshotsUITests test
//
// See docs/ios-appstore-screenshots.md for the full local workflow, the simulator/
// resolution requirement, and how to export the captured PNGs from the .xcresult.
final class AppStoreScreenshotsUITests: XCTestCase {
    func testCaptureAppStoreScreenshotSequence() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_APPSTORE_SCREENSHOTS"]
        app.launch()

        // 1. Team selector/search — "Every team. One clear depth chart."
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 15), "search field should appear once the team list loads")
        searchField.tap()
        searchField.typeText("Bills")

        let teamRow = app.buttons["team-row-bills"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 15), "searching \"Bills\" should surface the Buffalo Bills row")
        // Dismiss the keyboard before capturing — a raw post-typing screenshot would
        // show the on-screen keyboard covering most of the result, which isn't a clean
        // release screenshot (spec item 38's "inspect for clipping" concern applies to
        // self-inflicted clipping too).
        app.keyboards.buttons["Search"].tap()
        attachScreenshot(name: "01-team-search")

        // 2. Team depth chart — "See every position at a glance."
        teamRow.tap()
        let unitPicker = app.segmentedControls.firstMatch
        XCTAssertTrue(unitPicker.waitForExistence(timeout: 15), "depth chart should render a unit picker once the team snapshot loads")
        let playerSlot = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
        XCTAssertTrue(playerSlot.waitForExistence(timeout: 15), "at least one filled depth-chart slot should be tappable")
        attachScreenshot(name: "02-team-depth-chart")

        // 3. Player detail — "Know who's next."
        playerSlot.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 10), "player detail should present")
        XCTAssertTrue(app.staticTexts["player-profile-name"].waitForExistence(timeout: 10), "profile should show the player name")
        attachScreenshot(name: "03-player-detail")
        let closeButton = app.buttons["Close"]
        XCTAssertTrue(closeButton.waitForExistence(timeout: 5))
        closeButton.tap()
        XCTAssertFalse(closeButton.waitForExistence(timeout: 3), "dismissing should close the player detail sheet")

        // 4. Personal reorder editing — "Make the chart yours." Reached signed-out via
        // the screenshot-only bypass in TeamDetailView.beginEditing; the draft list
        // renders with drag handles already active (`.editMode = .constant(.active)`
        // in OverrideEditorSheet), so this captures the real reorder UI without ever
        // calling Save.
        let editMenu = app.buttons["edit-depth-order"]
        XCTAssertTrue(editMenu.waitForExistence(timeout: 10), "team detail should expose Edit Order while unsaved overrides exist for this unit")
        editMenu.tap()
        let editorEntry = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'edit-depth-order-'")
        ).firstMatch
        XCTAssertTrue(editorEntry.waitForExistence(timeout: 10), "the Edit Order menu should list at least one position group")
        editorEntry.tap()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 10), "the reorder sheet should present")
        attachScreenshot(name: "04-reorder-editing")
        let cancelButton = app.buttons["Cancel"]
        XCTAssertTrue(cancelButton.waitForExistence(timeout: 5))
        cancelButton.tap()

        // 5. Schedule — "Context beyond the lineup."
        let scheduleButton = app.buttons["schedule-destination"]
        XCTAssertTrue(scheduleButton.waitForExistence(timeout: 10), "team detail should expose a Schedule destination")
        scheduleButton.tap()
        XCTAssertTrue(app.otherElements["schedule-content"].waitForExistence(timeout: 15), "the schedule should render production-shaped staging content")
        attachScreenshot(name: "05-schedule")
    }

    /// `XCUIScreen.main.screenshot()` captures the simulator's full physical framebuffer
    /// at native device resolution (no simulator bezel/chrome — that's rendered by the
    /// Simulator.app window, never part of the captured buffer) rather than
    /// `XCUIApplication.screenshot()`, which is scoped to the app's own window frame.
    /// For App Store Connect's exact-pixel-resolution requirement (1320×2868 on the
    /// iPhone 17 Pro Max this test targets), the full-screen API is the one that's
    /// guaranteed to match the published spec.
    private func attachScreenshot(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
