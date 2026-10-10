import XCTest

// A request to open a team's depth chart has to land whether it is made while another
// tab is showing or before the tab view exists at all. Both run on the fixture backend.
@MainActor
final class TeamRouteUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testARequestFromAnotherTabOpensThatTeamsChart() throws {
        let app = XCUIApplication()
        app.launchArguments = XCUIApplication.hermeticLaunchArguments
        app.launch()
        XCTAssertTrue(app.waitForDepthChart())
        let switcher = app.buttons["team-switcher-button"]
        XCTAssertFalse(switcher.label.contains("Buffalo Bills"), "launch should not start on Bills")

        app.tabBars.buttons["Uniforms"].tap()
        XCTAssertTrue(app.buttons["uniforms-team-bills"].waitForExistence(timeout: 20))
        app.buttons["uniforms-team-bills"].tap()
        let kit = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'uniform-kit-row-'")
        ).firstMatch
        XCTAssertTrue(kit.waitForExistence(timeout: 10))
        kit.tap()
        let openChart = app.buttons["uniform-kit-open-depth-chart"]
        XCTAssertTrue(openChart.waitForExistence(timeout: 10))
        for _ in 0..<12 where !openChart.isHittable { app.swipeUp() }
        openChart.tap()

        XCTAssertTrue(
            switcher.waitForLabel(containing: "Buffalo Bills"),
            "the request should switch to Depth Charts on the Bills, got \"\(switcher.label)\"")
        XCTAssertTrue(app.waitForDepthChart())
    }

    func testARequestMadeBeforeTheTabsExistOpensThatTeamsChart() throws {
        let app = XCUIApplication()
        app.launchArguments =
            XCUIApplication.hermeticLaunchArguments + ["UI_TESTING_ROUTE_TEAM=bills"]
        app.launch()

        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15))
        XCTAssertTrue(
            switcher.waitForLabel(containing: "Buffalo Bills"),
            "a request made during launch should open the Bills, got \"\(switcher.label)\"")
        XCTAssertTrue(app.waitForDepthChart())
    }
}
