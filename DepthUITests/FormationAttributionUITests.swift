import XCTest

// The FTN notice belongs to the content it attributes, not to the viewport chrome.
// These regressions pin both placements: after the field on the team page and after
// every formation row in the picker sheet.
@MainActor
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

    // A historical snapshot carries no formation rows, so the screen takes the generic
    // layout: no FTN notice, no Formations row, and a plain-text personnel label (not a
    // menu) in true-scale mode.
    func testHistoricalSeasonUsesGenericLayoutAndPlainTextFormationLabel() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"))

        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10))

        // Live roster: the formations row exists, so the contrast below is meaningful.
        overflow.tap()
        XCTAssertTrue(
            app.buttons["choose-formation"].waitForExistence(timeout: 5),
            "the live roster should offer a Formations row")
        app.buttons["history-destination"].tap()

        let season = app.buttons["history-season-2025"]
        for _ in 0..<4 where !season.exists {
            app.swipeUp()
        }
        XCTAssertTrue(
            season.waitForExistence(timeout: 5), "the fixture bundle should carry a 2025 season")
        season.tap()

        let seasonTrigger = app.buttons["roster-history-season-trigger"]
        XCTAssertTrue(seasonTrigger.waitForExistence(timeout: 20))
        XCTAssertTrue(seasonTrigger.waitForLabel(containing: "2025", timeout: 20))
        XCTAssertTrue(app.waitForDepthChart())

        XCTAssertFalse(
            app.staticTexts["field-attribution"].waitForExistence(timeout: 2),
            "a historical snapshot has no FTN formation data to attribute")

        overflow.tap()
        XCTAssertTrue(app.buttons["history-destination"].waitForExistence(timeout: 5))
        XCTAssertFalse(
            app.buttons["choose-formation"].exists,
            "a historical snapshot has no formations to choose between")
        // Dismiss the menu before reaching for the field's corner control.
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5)).tap()

        let trueScale = app.buttons["true-scale-open"]
        XCTAssertTrue(trueScale.waitForExistence(timeout: 5))
        XCTAssertTrue(trueScale.tapUntil { app.otherElements["true-scale-field"].exists })

        let label = app.staticTexts["true-scale-formation"]
        XCTAssertTrue(
            label.waitForExistence(timeout: 5),
            "true scale should name the personnel as plain text for a historical snapshot")
        XCTAssertFalse(label.label.isEmpty)
        XCTAssertFalse(
            app.buttons["true-scale-formation"].exists,
            "with no formations to switch between, the label must not be a menu")
    }

    private func launchBillsDepthChart() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = XCUIApplication.hermeticLaunchArguments
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
