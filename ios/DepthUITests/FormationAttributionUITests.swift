import XCTest

// The FTN notice belongs to the content it attributes, not to the viewport chrome.
// These regressions pin both placements: after the field on the team page and after
// every formation row in the picker sheet.
final class FormationAttributionUITests: XCTestCase {
    func testFieldAttributionScrollsAfterTheField() throws {
        let app = launchBillsDepthChart()
        let attribution = app.staticTexts["field-attribution"]

        XCTAssertFalse(
            isVisible(attribution, in: app),
            "the field attribution should not be pinned to the viewport"
        )

        app.swipeUp()

        XCTAssertTrue(
            attribution.waitForExistence(timeout: 5) && isVisible(attribution, in: app),
            "scrolling below the field should reveal its attribution"
        )
    }

    func testFormationsAttributionFollowsEveryFormationRow() throws {
        let app = launchBillsDepthChart()
        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10))
        overflow.tap()

        let formations = app.buttons["choose-formation"]
        XCTAssertTrue(formations.waitForExistence(timeout: 5))
        formations.tap()

        let attribution = app.staticTexts["formations-attribution"]
        XCTAssertFalse(
            isVisible(attribution, in: app),
            "the formations attribution should not hover over the visible rows"
        )

        for _ in 0..<12 where !isVisible(attribution, in: app) {
            app.swipeUp()
        }

        XCTAssertTrue(
            isVisible(attribution, in: app),
            "scrolling past every formation should reveal the attribution at the list bottom"
        )
    }

    private func launchBillsDepthChart() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart())
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")
        return app
    }

    private func isVisible(_ element: XCUIElement, in app: XCUIApplication) -> Bool {
        element.exists
            && !element.frame.isEmpty
            && element.frame.intersects(app.windows.firstMatch.frame)
    }
}
