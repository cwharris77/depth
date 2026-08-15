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

        let profile = app.scrollViews["player-profile-content"]
        XCTAssertTrue(profile.waitForExistence(timeout: 5), "player detail should expose a scrollable complete profile")
        XCTAssertTrue(
            app.staticTexts["player-profile-name"].waitForExistence(timeout: 5),
            "profile should show the player name"
        )
        XCTAssertTrue(
            app.staticTexts["player-profile-position"].waitForExistence(timeout: 5),
            "profile should show granular and full position"
        )
        XCTAssertTrue(
            app.staticTexts["player-profile-status"].waitForExistence(timeout: 5),
            "profile should show player status"
        )
        XCTAssertTrue(
            app.otherElements["player-profile-vitals"].waitForExistence(timeout: 5),
            "profile should show age, experience, height, and weight"
        )
        XCTAssertTrue(app.otherElements["player-profile-stats"].waitForExistence(timeout: 10), "profile should resolve a stats state")

        closeButton.tap()
        XCTAssertFalse(closeButton.waitForExistence(timeout: 2), "dismissing should close the player detail sheet")
    }

    func testOpenTeamSchedule() throws {
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

        let scheduleButton = app.buttons["schedule-destination"]
        XCTAssertTrue(scheduleButton.waitForExistence(timeout: 10), "team detail should expose a Schedule destination")
        scheduleButton.tap()

        let scheduleContent = app.otherElements["schedule-content"]
        XCTAssertTrue(scheduleContent.waitForExistence(timeout: 10), "the schedule should render production-shaped staging content")

        let weekCard = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'schedule-week-'")
        ).firstMatch
        XCTAssertTrue(weekCard.waitForExistence(timeout: 5), "the schedule should render at least one weekly card")
    }

    func testOpenHistoricalRosterProfileAndReturnToToday() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10))
        searchField.tap()
        searchField.typeText("Seahawks")

        let teamRow = app.buttons["team-row-seahawks"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 10))
        teamRow.tap()

        let historyButton = app.buttons["history-destination"]
        XCTAssertTrue(historyButton.waitForExistence(timeout: 10), "team detail should expose History")
        historyButton.tap()

        let season = app.buttons["history-season-2013"]
        for _ in 0..<4 where !season.exists {
            app.swipeUp()
        }
        XCTAssertTrue(season.waitForExistence(timeout: 5), "2013 should be available in the season picker")
        season.tap()

        let seasonState = app.staticTexts["history-season-state"]
        XCTAssertTrue(seasonState.waitForExistence(timeout: 10))
        XCTAssertEqual(seasonState.label, "2013 season")
        XCTAssertFalse(app.buttons["edit-depth-order"].exists, "historical rosters are read-only")

        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10), "the historical field should render its QB")
        quarterback.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["player-profile-name"].waitForExistence(timeout: 5))
        app.buttons["Close"].tap()

        let backToToday = app.buttons["history-back-to-today"]
        XCTAssertTrue(backToToday.waitForExistence(timeout: 5))
        backToToday.tap()
        XCTAssertFalse(seasonState.waitForExistence(timeout: 2))
    }
}
