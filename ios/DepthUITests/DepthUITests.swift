import XCTest

// Critical-path UI journey (design spec's "TEAM JOURNEY": launch chart → switch team via
// search → team snapshot → position group → player detail). As of the 2026-08-15
// navigation-parity spec the app launches straight into a depth chart rather than a team
// list, so every journey opens the switcher sheet (`selectTeam`, UITestHelpers.swift)
// instead of searching a root list. Runs against Debug's real staging Supabase
// (ios/xcconfig/Debug.xcconfig), same as every other Debug-config run — no seeded/mocked
// data.
final class DepthUITests: XCTestCase {
    func testAppLaunches() throws {
        let app = XCUIApplication()
        app.launch()
    }

    func testLaunchesIntoAChartThenSwitchesTeamAndOpensPlayerDetail() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        // No stored preference → the default team's chart is the launch destination.
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")

        app.selectTeam("bills", searching: "Bills")

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

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills")

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

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("seahawks", searching: "Seahawks")

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

    /// Locked decisions #1/#2/#6/#7: the tab bar exists, all three tabs are reachable,
    /// and each renders its own content.
    func testTabBarReachesAllThreeDestinations() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "Depth Charts should be the launch tab")

        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 10), "the app should present a bottom tab bar")

        tabs.buttons["Compare"].tap()
        // `.accessibilityElement(children: .combine)` on CompareView's
        // ContentUnavailableView collapses its image+text children into one element, but
        // SwiftUI infers that combined element's accessibility *type* from its content
        // (StaticText here, not the generic Other type a plain container would report) —
        // match by identifier across any type rather than assuming one.
        XCTAssertTrue(
            app.descendants(matching: .any).matching(
                NSPredicate(format: "identifier == 'compare-placeholder'")
            ).firstMatch.waitForExistence(timeout: 10),
            "Compare should render its coming-soon placeholder"
        )

        tabs.buttons["Account"].tap()
        XCTAssertTrue(
            app.staticTexts["settings-about-name"].waitForExistence(timeout: 10),
            "Account should render the settings content"
        )

        tabs.buttons["Depth Charts"].tap()
        XCTAssertTrue(app.waitForDepthChart(), "returning to Depth Charts should show the chart again")
    }

    /// Locked decision #3 plus the spec's restoration requirement: the last-viewed team
    /// is the launch destination on the next launch, with no list-then-push transition.
    func testRelaunchRestoresTheLastViewedTeamAsTheLaunchDestination() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.selectTeam("bills", searching: "Bills")
        app.terminate()

        // No reset argument — this launch must inherit the stored preference.
        app.launchArguments = []
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "relaunch should open a chart directly")

        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 10))
        XCTAssertTrue(
            switcher.label.contains("Buffalo Bills"),
            "relaunch should restore the last-viewed team, got \"\(switcher.label)\""
        )
    }
}
