import XCTest

// DEP-395: coordinate taps exercise whitespace that element.tap() can silently avoid.
// Keep these journeys anonymous; none submits an email or mutates hosted account data.
@MainActor
final class TapTargetUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testCaptureAuditSurfaces() {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"))
        capture("page-appearance")
        app.buttons["team-switcher-button"].tap()
        XCTAssertTrue(app.buttons["team-conference-nfc"].waitForExistence(timeout: 15))
        capture("conference-appearance")
        app.buttons["Close"].tap()
        app.tabBars.buttons["Compare"].tap()
        XCTAssertTrue(app.buttons["compare-tab-position"].waitForExistence(timeout: 15))
        capture("compare-appearance")
        app.tabBars.buttons["Uniforms"].tap()
        XCTAssertTrue(app.buttons["uniforms-filter-button"].waitForExistence(timeout: 20))
        capture("archive-appearance")
        app.buttons["account-button"].tap()
        XCTAssertTrue(app.buttons["Sign In"].waitForExistence(timeout: 15))
        app.buttons["Sign In"].tap()
        XCTAssertTrue(app.textFields["auth-email"].waitForExistence(timeout: 15))
        capture("email-appearance")
        app.terminate()
        app.launchArguments = ["UI_TESTING_RESET_STATE", "UI_TESTING_DELETE_TAP_TARGET"]
        app.launch()
        XCTAssertTrue(app.textFields["delete-code"].waitForExistence(timeout: 15))
        capture("deletion-appearance")
    }

    func testFilterSortWhitespaceSelectsOrder() {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        let uniforms = app.tabBars.buttons["Uniforms"]
        XCTAssertTrue(uniforms.waitForExistence(timeout: 15))
        uniforms.tap()
        let filters = app.buttons["uniforms-filter-button"]
        XCTAssertTrue(filters.waitForExistence(timeout: 20))
        filters.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.5)).tap()
        let newest = app.buttons["filter-sort-newest"]
        XCTAssertTrue(newest.waitForExistence(timeout: 10))
        newest.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        XCTAssertTrue(newest.isSelected)
    }

    func testSegmentPaddingSelectsPage() {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"))
        let schedule = app.buttons["page-switcher-schedule"]
        XCTAssertTrue(schedule.waitForExistence(timeout: 10))
        capture("page-segments-before-tap")
        schedule.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.15)).tap()
        XCTAssertTrue(schedule.isSelected)
        XCTAssertTrue(app.otherElements["schedule-content"].waitForExistence(timeout: 15))
        let roster = app.buttons["page-switcher-roster"]
        roster.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.85)).tap()
        XCTAssertTrue(roster.isSelected)
        XCTAssertTrue(app.waitForDepthChart())
        capture("page-segments-after-tap")
    }

    func testOtherSegmentedControlCallers() {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"))
        app.buttons["team-switcher-button"].tap()
        selectAtEdge(app.buttons["team-conference-nfc"])
        selectAtEdge(app.buttons["team-conference-afc"], right: true)
        capture("conference-segments")
        app.buttons["Close"].tap()
        app.tabBars.buttons["Compare"].tap()
        selectAtEdge(app.buttons["compare-tab-position"])
        selectAtEdge(app.buttons["compare-tab-matchup"], right: true)
        capture("compare-segments")
        app.tabBars.buttons["Uniforms"].tap()
        selectAtEdge(app.buttons["uniforms-view-era"])
        selectAtEdge(app.buttons["uniforms-view-team"], right: true)
        capture("archive-segments")
    }

    func testDeletionCodePaddingFocusesField() {
        checkFieldEdges("delete-code", deletionFixture: true) { app in
            app.launchArguments = ["UI_TESTING_RESET_STATE", "UI_TESTING_DELETE_TAP_TARGET"]
            app.launch()
        }
    }

    func testEmailPaddingFocusesField() {
        checkFieldEdges("auth-email") { app in
            app.launchArguments = ["UI_TESTING_RESET_STATE"]
            app.launch()
            let account = app.buttons["account-button"]
            XCTAssertTrue(account.waitForExistence(timeout: 15))
            account.tap()
            let signIn = app.buttons["Sign In"]
            XCTAssertTrue(signIn.waitForExistence(timeout: 15))
            signIn.tap()
        }
    }

    private func checkFieldEdges(
        _ identifier: String, deletionFixture: Bool = false, launch: (XCUIApplication) -> Void
    ) {
        for right in [true, false] {
            let app = XCUIApplication()
            launch(app)
            let field = app.textFields[identifier]
            XCTAssertTrue(field.waitForExistence(timeout: 15))
            XCTAssertFalse(app.keyboards.firstMatch.exists)
            let edge = right ? "upper-right" : "lower-left"
            capture("\(identifier)-\(edge)-before-tap")
            if deletionFixture {
                // The focus gesture expands delete-code's AX frame to include padding.
                // Anchor to the DRAWN bounds instead: this fixture has 16pt screen +
                // 16pt card insets, and a 22pt text line with 16pt vertical padding.
                // These points stay 8pt inside the same corners before and after the fix.
                app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(
                    dx: right ? app.frame.width - 40 : 40,
                    dy: field.frame.midY + (right ? -19 : 19)
                )).tap()
            } else {
                field.coordinate(withNormalizedOffset: CGVector(
                    dx: right ? 0.98 : 0.02, dy: right ? 0.15 : 0.85
                )).tap()
            }
            XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
            field.typeText("1")
            XCTAssertEqual(field.value as? String, "1")
            capture("\(identifier)-\(edge)-after-tap")
            app.terminate()
        }
    }

    private func selectAtEdge(_ button: XCUIElement, right: Bool = false) {
        XCTAssertTrue(button.waitForExistence(timeout: 20))
        button.coordinate(withNormalizedOffset: CGVector(
            dx: right ? 0.95 : 0.05, dy: right ? 0.85 : 0.15
        )).tap()
        XCTAssertTrue(button.isSelected, "Edge tap should select \(button.identifier)")
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
