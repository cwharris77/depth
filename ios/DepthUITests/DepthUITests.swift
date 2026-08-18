import XCTest

// Critical-path UI journey (design spec's "TEAM JOURNEY": launch chart → switch team via
// search → team snapshot → position group → player detail). As of the 2026-08-15
// navigation-parity spec the app launches straight into a depth chart rather than a team
// list, so every journey opens the switcher sheet (`selectTeam`, UITestHelpers.swift)
// instead of searching a root list. Runs against the production Supabase project
// (ios/xcconfig/Debug.xcconfig — all configs point at it, there is no dedicated staging),
// same as every other Debug-config run — no seeded/mocked data.
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

        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        let unitTab = app.buttons["unit-tab-offense"]
        XCTAssertTrue(unitTab.waitForExistence(timeout: 10), "depth chart should render the unit tab bar once the team snapshot loads")

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
        XCTAssertTrue(
            app.otherElements["player-profile-depth"].waitForExistence(timeout: 5),
            "profile should show the position depth list"
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
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        // Round-4 (DEP-217): Schedule is the middle tab of the ROSTER/SCHEDULE/STATS page
        // switcher, no longer a toolbar destination.
        let scheduleTab = app.buttons["page-switcher-schedule"]
        XCTAssertTrue(scheduleTab.waitForExistence(timeout: 10), "team detail should expose a Schedule page tab")
        scheduleTab.tap()

        let scheduleContent = app.otherElements["schedule-content"]
        XCTAssertTrue(scheduleContent.waitForExistence(timeout: 10), "the schedule should render production content")

        let weekCard = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'schedule-week-'")
        ).firstMatch
        XCTAssertTrue(weekCard.waitForExistence(timeout: 5), "the schedule should render at least one weekly card")
    }

    /// Round-4 (DEP-216/217): the ROSTER/SCHEDULE/STATS page switcher reaches all three
    /// pages, each rendering its own content — the roster chart, the Stats record, and
    /// the embedded schedule. Uses the Bills, a team with real ingested stats.
    func testPageSwitcherReachesAllThreePages() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        let statsTab = app.buttons["page-switcher-stats"]
        XCTAssertTrue(statsTab.waitForExistence(timeout: 10), "team detail should expose a Stats page tab")
        statsTab.tap()
        XCTAssertTrue(
            app.scrollViews["stats-content"].waitForExistence(timeout: 15),
            "the Stats page should render its record content"
        )
        XCTAssertTrue(
            app.staticTexts["stats-record"].waitForExistence(timeout: 5),
            "the Stats page should render the team's record"
        )

        let scheduleTab = app.buttons["page-switcher-schedule"]
        XCTAssertTrue(scheduleTab.waitForExistence(timeout: 5), "the page switcher should still be reachable from Stats")
        scheduleTab.tap()
        XCTAssertTrue(
            app.otherElements["schedule-content"].waitForExistence(timeout: 15),
            "the schedule page should render once switched from Stats"
        )

        let rosterTab = app.buttons["page-switcher-roster"]
        XCTAssertTrue(rosterTab.waitForExistence(timeout: 5))
        rosterTab.tap()
        XCTAssertTrue(
            app.waitForDepthChart(),
            "returning to Roster should render the depth chart again"
        )
    }

    /// Round-4 (DEP-218): the underline unit tabs replace the stock capsule Picker, and
    /// the spec's Testing section requires the 44pt tap target survive the restyle.
    func testUnitTabsPreserveTapTargets() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        for identifier in ["unit-tab-offense", "unit-tab-defense", "unit-tab-special"] {
            let tab = app.buttons[identifier]
            XCTAssertTrue(tab.waitForExistence(timeout: 10), "\(identifier) should render")
            XCTAssertTrue(tab.isHittable, "\(identifier) should be tappable")
            XCTAssertGreaterThanOrEqual(
                tab.frame.height, 44,
                "\(identifier) must keep the 44-point minimum tap target"
            )
        }
    }

    func testOpenHistoricalRosterProfileAndReturnToToday() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("seahawks", searching: "Seahawks", expectedDisplayName: "Seattle Seahawks")

        // Seasons lives behind the ••• overflow menu (2026-08-15 visual-pass: the bare
        // icon row was removed).
        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10), "team detail should expose the overflow menu")
        overflow.tap()

        let historyButton = app.buttons["history-destination"]
        XCTAssertTrue(historyButton.waitForExistence(timeout: 5), "the overflow menu should expose History")
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
        // Historical rosters are read-only: reopen the overflow menu and confirm the
        // Edit Depth Chart toggle is present but disabled (DEP-231 — disabled, not
        // hidden, matching web's disabledReason treatment).
        let overflow2 = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow2.waitForExistence(timeout: 5))
        overflow2.tap()
        let editToggle = app.buttons["edit-depth-order"]
        XCTAssertTrue(editToggle.waitForExistence(timeout: 5), "historical rosters still show the Edit toggle")
        XCTAssertFalse(editToggle.isEnabled, "historical rosters are read-only — toggle disabled")

        // The popover must be dismissed before the QB interaction below: re-tapping the
        // anchor while its popover is open is a no-op, and the header sits inside the
        // popover's non-hittable region, but the field's QB slot is outside the popover,
        // so a tap there is consumed by the popover dismissal.
        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10), "the historical field should render its QB")
        quarterback.tap()
        // First tap dismisses the popover; the second opens the player. If the popover
        // was already gone (presentation behavior varies across iOS versions), the first
        // tap already presented the sheet, so only tap again when it didn't.
        if !app.scrollViews["player-profile-content"].waitForExistence(timeout: 2) {
            quarterback.tap()
        }
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["player-profile-name"].waitForExistence(timeout: 5))
        app.buttons["Close"].tap()

        let backToToday = app.buttons["history-back-to-today"]
        XCTAssertTrue(backToToday.waitForExistence(timeout: 5))
        backToToday.tap()
        XCTAssertFalse(seasonState.waitForExistence(timeout: 2))
    }

    /// DEP-245: the Seasons sheet itself offers a one-tap "Back to current" while a past
    /// season is selected, so a user who scrolled deep into the 1999→present list never
    /// has to scroll back to the current-season row. Reuses the 2013 selection so the
    /// sheet is verified from a genuinely historical state.
    func testBackToCurrentFromSeasonsSheet() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("seahawks", searching: "Seahawks", expectedDisplayName: "Seattle Seahawks")

        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10), "team detail should expose the overflow menu")
        overflow.tap()
        app.buttons["history-destination"].tap()

        let season = app.buttons["history-season-2013"]
        for _ in 0..<4 where !season.exists {
            app.swipeUp()
        }
        XCTAssertTrue(season.waitForExistence(timeout: 5), "2013 should be available in the season picker")
        season.tap()

        let seasonState = app.staticTexts["history-season-state"]
        XCTAssertTrue(seasonState.waitForExistence(timeout: 10))
        XCTAssertEqual(seasonState.label, "2013 season")

        // Reopen the sheet while 2013 is still the active historical season.
        let overflow2 = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow2.waitForExistence(timeout: 5))
        overflow2.tap()
        app.buttons["history-destination"].tap()

        let backToCurrent = app.buttons["history-season-back-to-current"]
        XCTAssertTrue(
            backToCurrent.waitForExistence(timeout: 5),
            "the Seasons sheet should offer Back to current while a past season is selected"
        )
        backToCurrent.tap()

        XCTAssertFalse(backToCurrent.waitForExistence(timeout: 2), "the sheet should dismiss on Back to current")
        XCTAssertFalse(seasonState.waitForExistence(timeout: 2), "Back to current should leave the historical roster")
    }

    /// DEP-245: the Stats page's season chips have no other way back to the current
    /// season — a past chip selected means scrolling to re-tap the current chip. The
    /// "Back to current" affordance appears only while a past season is selected and
    /// returns to the current/upcoming tab on tap.
    func testBackToCurrentFromStatsPage() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        let statsTab = app.buttons["page-switcher-stats"]
        XCTAssertTrue(statsTab.waitForExistence(timeout: 10))
        statsTab.tap()
        XCTAssertTrue(app.scrollViews["stats-content"].waitForExistence(timeout: 15))

        // Every team has at least current + prior seasons ingested; select the second
        // chip (the year before the newest) so a completed past season is active.
        let chips = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'stats-season-'"))
        XCTAssertGreaterThanOrEqual(chips.count, 2, "the stats page should offer more than one season chip")
        chips.element(boundBy: 1).tap()

        let seasonState = app.staticTexts["stats-season-state"]
        XCTAssertTrue(seasonState.waitForExistence(timeout: 5), "a past season should show its season-state line")

        let backToCurrent = app.buttons["stats-back-to-current"]
        XCTAssertTrue(backToCurrent.waitForExistence(timeout: 5), "a past season should offer Back to current")
        backToCurrent.tap()

        XCTAssertFalse(backToCurrent.waitForExistence(timeout: 2), "Back to current should hide once on the current season")
        XCTAssertFalse(seasonState.waitForExistence(timeout: 2), "Back to current should leave the past season")
    }

    /// DEP-254: the Schedule tab's season picker has no other one-tap way back to the
    /// current season — a past row selected means reopening the picker to re-tap current.
    /// The "Back to current" affordance appears only while a past season is selected and
    /// returns to the current season (defaultSeason) on tap, mirroring DEP-245.
    func testBackToCurrentFromSchedulePage() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        let scheduleTab = app.buttons["page-switcher-schedule"]
        XCTAssertTrue(scheduleTab.waitForExistence(timeout: 10))
        scheduleTab.tap()
        XCTAssertTrue(app.otherElements["schedule-content"].waitForExistence(timeout: 15))

        // Current season -> no escape shown.
        let backToCurrent = app.buttons["schedule-back-to-current"]
        XCTAssertFalse(backToCurrent.waitForExistence(timeout: 2), "current season should not offer Back to current")

        // DEP-263: the schedule season picker is now the same chip row Stats uses —
        // select the oldest chip directly (chips are ascending oldest-to-newest, left
        // to right) so isPastSeason is unambiguously true.
        let chips = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'schedule-season-'"))
        XCTAssertGreaterThanOrEqual(chips.count, 2, "the schedule should offer a current and at least one past season")
        chips.element(boundBy: 0).tap()
        XCTAssertTrue(backToCurrent.waitForExistence(timeout: 5), "a past season should offer Back to current")

        // Screenshot the historical state before returning to current.
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = "schedule-past-season-with-back-to-current"
        attachment.lifetime = .keepAlways
        add(attachment)

        backToCurrent.tap()
        XCTAssertFalse(backToCurrent.waitForExistence(timeout: 2), "Back to current should hide once on the current season")
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
        // DEP-258: the real compare UI renders the two team-slot pickers + the
        // Matchup/By-position switcher, plus the "Pick two teams to compare" prompt
        // (no teams picked on a fresh launch — the placeholder "coming soon" is gone).
        XCTAssertTrue(
            app.scrollViews["compare-content"].waitForExistence(timeout: 10),
            "Compare should render its team-slot picker content"
        )
        XCTAssertTrue(
            app.staticTexts["Pick two teams to compare"].waitForExistence(timeout: 5),
            "Compare should prompt to pick two teams on first load"
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
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")
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
