import XCTest

// Critical-path UI journey for the T6 vertical slice (design spec's "TEAM JOURNEY":
// team list → local search → team snapshot → position group → player detail). Runs
// against Debug's real staging Supabase (ios/xcconfig/Debug.xcconfig), same as every
// other Debug-config run — no seeded/mocked data.
final class DepthUITests: XCTestCase {
    func testAppLaunches() throws {
        let app = XCUIApplication()
        app.launch()
    }

    func testSearchTeamOpenChartAndPlayerDetail() throws {
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

        let unitPicker = app.segmentedControls.firstMatch
        XCTAssertTrue(unitPicker.waitForExistence(timeout: 10), "depth chart should render a unit picker once the team snapshot loads")

        let playerSlot = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
        XCTAssertTrue(playerSlot.waitForExistence(timeout: 10), "at least one filled depth-chart slot should be tappable")
        playerSlot.tap()

        let closeButton = app.buttons["Close"]
        XCTAssertTrue(closeButton.waitForExistence(timeout: 5), "player detail sheet should present with a Close action")
        closeButton.tap()
        XCTAssertFalse(closeButton.waitForExistence(timeout: 2), "dismissing should close the player detail sheet")
    }
}
