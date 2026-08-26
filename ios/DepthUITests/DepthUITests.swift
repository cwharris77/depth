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
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

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
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

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
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

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
        XCTAssertTrue(app.launch(intoTeam: "seahawks"), "the app should launch straight into the Seahawks depth chart")

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
        XCTAssertTrue(app.launch(intoTeam: "seahawks"), "the app should launch straight into the Seahawks depth chart")

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

    /// DEP-278 follow-up: the Stats page's season chip row stopped scaling once
    /// team_stats ingest landed seasons back to 1999 (~25+ entries no longer fit a
    /// swipeable strip), so it moved behind a trigger + SeasonPickerSheet — the same
    /// sheet shape as History's HistorySeasonSheet, generalized off HistorySeason to a
    /// plain Int season. "Back to current" now lives in the sheet's toolbar rather than
    /// a second on-page button.
    func testBackToCurrentFromStatsPage() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

        let statsTab = app.buttons["page-switcher-stats"]
        XCTAssertTrue(statsTab.waitForExistence(timeout: 10))
        statsTab.tap()
        XCTAssertTrue(app.scrollViews["stats-content"].waitForExistence(timeout: 15))

        let trigger = app.buttons["stats-season-trigger"]
        XCTAssertTrue(trigger.waitForExistence(timeout: 10))
        let currentLabel = trigger.label
        trigger.tap()

        // Every team has at least current + prior seasons ingested; select the second
        // row (the year before the newest, top of the list) so a completed past season
        // is active.
        // Regex, not BEGINSWITH: the trigger ("stats-season-trigger") and toolbar button
        // ("stats-season-back-to-current") share the same "stats-season-" prefix as the
        // numbered rows.
        let rows = app.buttons.matching(NSPredicate(format: "identifier MATCHES 'stats-season-[0-9]+'"))
        XCTAssertGreaterThanOrEqual(rows.count, 2, "the stats picker should offer more than one season row")
        let pastRow = rows.element(boundBy: 1)
        // Row label is "<year>" (or "<year>, selected") — strip the suffix so we can
        // check the trigger relabels to that same year below.
        let pastYear = pastRow.label.components(separatedBy: ",").first ?? pastRow.label
        pastRow.tap()

        // The trigger itself is the only on-screen season indicator (DEP-282 removed the
        // redundant "<year> season" line that just repeated the trigger's own label) — a
        // past season relabels the trigger to the picked year.
        XCTAssertTrue(
            trigger.waitForLabel(containing: pastYear),
            "selecting a past season should relabel the trigger to that season"
        )

        trigger.tap()
        let backToCurrent = app.buttons["stats-season-back-to-current"]
        XCTAssertTrue(backToCurrent.waitForExistence(timeout: 5), "a past season should offer Back to current in the sheet toolbar")
        backToCurrent.tap()

        XCTAssertTrue(
            trigger.waitForLabel(containing: currentLabel),
            "Back to current should relabel the trigger back to the current season"
        )
    }

    /// DEP-278 follow-up: same trigger + SeasonPickerSheet conversion as Stats, applied
    /// to Schedule — replacing the flat chip row DEP-263 originally promoted out of
    /// Stats. "Back to current" now lives in the sheet's toolbar.
    func testBackToCurrentFromSchedulePage() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

        let scheduleTab = app.buttons["page-switcher-schedule"]
        XCTAssertTrue(scheduleTab.waitForExistence(timeout: 10))
        scheduleTab.tap()
        XCTAssertTrue(app.otherElements["schedule-content"].waitForExistence(timeout: 15))

        let trigger = app.buttons["schedule-season-trigger"]
        XCTAssertTrue(trigger.waitForExistence(timeout: 10))
        trigger.tap()

        // Rows are newest-first; select the last row (oldest) so isPastSeason is
        // unambiguously true.
        // Regex, not BEGINSWITH: the trigger ("schedule-season-trigger") and toolbar
        // button ("schedule-season-back-to-current") share the same "schedule-season-"
        // prefix as the numbered rows.
        let rows = app.buttons.matching(NSPredicate(format: "identifier MATCHES 'schedule-season-[0-9]+'"))
        XCTAssertGreaterThanOrEqual(rows.count, 2, "the schedule picker should offer a current and at least one past season")
        rows.element(boundBy: rows.count - 1).tap()

        trigger.tap()
        let backToCurrent = app.buttons["schedule-season-back-to-current"]
        XCTAssertTrue(backToCurrent.waitForExistence(timeout: 5), "a past season should offer Back to current in the sheet toolbar")

        // Screenshot the historical state before returning to current.
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = "schedule-past-season-with-back-to-current"
        attachment.lifetime = .keepAlways
        add(attachment)

        backToCurrent.tap()
        XCTAssertFalse(app.buttons["schedule-season-back-to-current"].waitForExistence(timeout: 2), "Back to current should hide once on the current season")
    }

    /// DEP-278 follow-up: Stats and Schedule fetch no uniform data of their own
    /// (invariant 5), so their accent comes from `CurrentTeamStore` — refined by
    /// TeamDetailView whenever the roster page resolves a picked kit. Picking a
    /// non-default uniform on the roster should be reflected the moment Stats/Schedule
    /// next render, with no separate refetch. XCUITest can't assert a SwiftUI
    /// `foregroundStyle` color directly, so this attaches before/after screenshots for
    /// visual confirmation (same approach as PRScreenshotsUITests) alongside asserting
    /// the functional flow — kit picked, sheet dismissed, both pages still render —
    /// completes without regressing.
    func testKitPickFollowsOntoScheduleAndStats() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

        let statsTab = app.buttons["page-switcher-stats"]
        XCTAssertTrue(statsTab.waitForExistence(timeout: 10))
        statsTab.tap()
        XCTAssertTrue(app.scrollViews["stats-content"].waitForExistence(timeout: 15))
        let statsBefore = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        statsBefore.name = "stats-before-kit-pick"
        statsBefore.lifetime = .keepAlways
        add(statsBefore)

        // Back to the roster to pick a kit.
        app.buttons["page-switcher-roster"].tap()
        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10), "team detail should expose the overflow menu")
        overflow.tap()
        let chooseUniform = app.buttons["choose-uniform"]
        XCTAssertTrue(chooseUniform.waitForExistence(timeout: 5), "the Bills should have uniforms to pick from")
        chooseUniform.tap()
        XCTAssertTrue(app.otherElements["uniform-picker-sheet"].waitForExistence(timeout: 10))

        // DEP-256 visual evidence: capture the carousel's first card (the deterministic
        // opening page — see UniformPickerSheet's `init`, which seeds `currentIndex`
        // from `selectedID`) before interacting with it.
        let carouselCard0 = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        carouselCard0.name = "uniform-picker-carousel-card-0"
        carouselCard0.lifetime = .keepAlways
        add(carouselCard0)

        // Card 0 is the team's current/home kit (nothing pre-checked on a fresh reset
        // state); card 1 is a genuinely different kit, so its color should differ from
        // the base team accent seen in `statsBefore`. DEP-256: the picker is now a
        // swipeable carousel, so selection happens via the page dots (a real swipe
        // gesture isn't reliably drivable in XCUITest) rather than a row tap, and no
        // longer auto-dismisses the sheet — the sheet stays open so you can keep
        // paging and previewing the recolor live, closed explicitly via the X button.
        let pageDots = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'uniform-dot-'"))
        XCTAssertGreaterThanOrEqual(pageDots.count, 2, "the Bills should offer more than one uniform to distinguish a kit pick")
        pageDots.element(boundBy: 1).tap()

        let carouselCard1 = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        carouselCard1.name = "uniform-picker-carousel-card-1"
        carouselCard1.lifetime = .keepAlways
        add(carouselCard1)

        app.buttons["Close"].tap()
        XCTAssertFalse(app.otherElements["uniform-picker-sheet"].waitForExistence(timeout: 5), "closing the picker should dismiss the sheet")

        statsTab.tap()
        XCTAssertTrue(app.scrollViews["stats-content"].waitForExistence(timeout: 15), "Stats should still render after a kit pick")
        let statsAfter = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        statsAfter.name = "stats-after-kit-pick"
        statsAfter.lifetime = .keepAlways
        add(statsAfter)

        let scheduleTab = app.buttons["page-switcher-schedule"]
        scheduleTab.tap()
        XCTAssertTrue(app.otherElements["schedule-content"].waitForExistence(timeout: 15), "Schedule should still render after a kit pick")
        let scheduleAfter = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        scheduleAfter.name = "schedule-after-kit-pick"
        scheduleAfter.lifetime = .keepAlways
        add(scheduleAfter)
    }

    /// Locked decisions #1/#2/#6/#7, updated by DEP-252: the tab bar exists and its two
    /// content tabs (Depth Charts, Compare) plus the Uniforms tab are reachable. Account
    /// is no longer a tab — it's a nav-bar trailing icon on the team page, covered
    /// separately below.
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

        tabs.buttons["Uniforms"].tap()
        XCTAssertTrue(
            app.navigationBars["Uniforms"].waitForExistence(timeout: 10),
            "Uniforms should render its own content"
        )

        tabs.buttons["Depth Charts"].tap()
        XCTAssertTrue(app.waitForDepthChart(), "returning to Depth Charts should show the chart again")

        // DEP-252: Account is now a nav-bar trailing icon on the team page, opening the
        // settings content as a sheet rather than switching tabs.
        let accountButton = app.buttons["account-button"]
        XCTAssertTrue(accountButton.waitForExistence(timeout: 10), "Account should be reachable from the nav bar")
        accountButton.tap()
        XCTAssertTrue(
            app.staticTexts["settings-about-version"].waitForExistence(timeout: 10),
            "Account should render the settings content"
        )
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

    /// DEP-266 (Compare page unification) — the web-parity elements the first port
    /// dropped must render once both teams are picked: the VS capsule, the "By team"/
    /// "By position" tab labels, the 44pt position chips, and the dashed unpicked slot
    /// (verified before picking). Aug 2026 feedback pass: Forecast and Roster were
    /// removed outright (not just reworded) and the depth table's rank-dot legend went
    /// with them — see CompareViewModel.swift's `Lens` doc comment and
    /// CompareView.swift's `CompareRows` doc comment for why. This test now covers the
    /// three lenses that remain instead of asserting the deleted ones exist.
    func testCompareRendersWebParityElements() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "Depth Charts should be the launch tab")

        app.tabBars.firstMatch.buttons["Compare"].tap()
        let content = app.scrollViews["compare-content"]
        XCTAssertTrue(content.waitForExistence(timeout: 10), "Compare should render its content")

        // Both empty slots exist and read as "Pick a team" holes.
        let slotA = app.buttons["compare-slot-a"]
        let slotB = app.buttons["compare-slot-b"]
        XCTAssertTrue(slotA.waitForExistence(timeout: 5), "the A slot should exist")
        XCTAssertTrue(slotB.exists, "the B slot should exist")

        // "By team" / "By position" tab labels (web's CompareView SegmentedControl copy).
        XCTAssertTrue(app.buttons["compare-tab-matchup"].exists, "the Matchup segment should render as 'By team'")
        XCTAssertTrue(app.buttons["compare-tab-position"].exists, "the Position segment should render as 'By position'")

        // Pick two teams through the slot picker sheets.
        pickTeam(into: "a", query: "Bills", expectedRow: "team-row-bills", app: app)
        pickTeam(into: "b", query: "Seahawks", expectedRow: "team-row-seahawks", app: app)

        // The By-team surface now opens on Offense and exposes exactly three synchronized
        // lens-selector buttons — no Forecast, no Roster. Selecting Defense pages the
        // content and reports the selection to VoiceOver rather than relying on color alone.
        let offenseLens = app.buttons["compare-lens-offense"]
        XCTAssertTrue(offenseLens.waitForExistence(timeout: 20), "Offense should be the first compare lens")
        XCTAssertFalse(app.buttons["compare-lens-forecast"].exists, "Forecast was removed outright")
        XCTAssertFalse(app.buttons["compare-lens-roster"].exists, "Roster was removed outright")
        let defenseLens = app.buttons["compare-lens-defense"]
        XCTAssertTrue(defenseLens.exists)
        XCTAssertTrue(app.buttons["compare-lens-specialTeams"].exists)

        defenseLens.tap()
        let defenseCard = app.descendants(matching: .any)["compare-lens-defense-card"].firstMatch
        XCTAssertTrue(defenseCard.waitForExistence(timeout: 10), "selecting Defense should page to its evidence card")
        XCTAssertTrue(defenseLens.isSelected, "the active lens should expose the selected accessibility trait")

        // Position tab: the DEP-311 room picker (unit lens + room grid). The old horizontal
        // `compare-position-row` scroller is gone.
        app.buttons["compare-tab-position"].tap()
        let lineupOffense = app.buttons["unit-tab-offense"]
        XCTAssertTrue(lineupOffense.waitForExistence(timeout: 10), "the unit lens row should render on the position tab")
        XCTAssertTrue(lineupOffense.isSelected || lineupOffense.frame.height >= 44 - 0.01, "the unit lens keeps its 44pt tap target")
        // The default unit (Offense) room grid: every room tile keeps the 44pt minimum and
        // is exposed without any horizontal scrolling.
        let firstRoom = app.buttons["compare-room-quarterback"]
        XCTAssertTrue(firstRoom.waitForExistence(timeout: 5), "the offense Quarterback room tile should render")
        XCTAssertGreaterThanOrEqual(firstRoom.frame.height, 44 - 0.01, "room tiles must meet the 44pt touch minimum")

        // Quarterback is a single-position room — it selects directly with no exact-role
        // panel and no "compare-position-QB" role tile of its own.
        XCTAssertFalse(app.buttons["compare-position-QB"].exists, "a single-position room has no role panel")

        let depthRows = app.descendants(matching: .any)["compare-rows"].firstMatch
        XCTAssertTrue(depthRows.waitForExistence(timeout: 5), "the depth table should render for the default Quarterback selection")
    }

    /// DEP-311: every unit's last role is reachable through the two-step room→position
    /// picker without horizontal scrolling. Picks a room in each unit and taps its final
    /// exact role — all resolvable by identifier (no swipe) on the position tab.
    func testMatchupRoomsReachEveryUnitWithoutHorizontalScrolling() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "Depth Charts should be the launch tab")

        app.tabBars.firstMatch.buttons["Compare"].tap()
        XCTAssertTrue(app.scrollViews["compare-content"].waitForExistence(timeout: 10))
        pickTeam(into: "a", query: "Bills", expectedRow: "team-row-bills", app: app)
        pickTeam(into: "b", query: "Seahawks", expectedRow: "team-row-seahawks", app: app)

        app.buttons["compare-tab-position"].tap()
        // Offense was the launch unit; its room grid renders immediately.
        XCTAssertTrue(app.buttons["compare-room-line"].waitForExistence(timeout: 10), "the offense Line room should render without horizontal scrolling")

        // Offense → Line room → RT (the last role in that room).
        app.buttons["compare-room-line"].tap()
        let rightTackle = app.buttons["compare-position-RT"]
        XCTAssertTrue(rightTackle.waitForExistence(timeout: 5), "RT should be reachable in the Line exact-role panel")
        XCTAssertGreaterThanOrEqual(rightTackle.frame.height, 44 - 0.01, "RT must keep the 44pt touch minimum")
        rightTackle.tap()

        // Defense: unit lens → Safeties room → FS (last role).
        // The unit lens is the same DepthUnitTabBar treatment as the field (unit-tab-*).
        app.buttons["unit-tab-defense"].tap()
        XCTAssertTrue(app.buttons["compare-room-safeties"].waitForExistence(timeout: 5), "the defense Safeties room should render in the grid")
        app.buttons["compare-room-safeties"].tap()
        let freeSafety = app.buttons["compare-position-FS"]
        XCTAssertTrue(freeSafety.waitForExistence(timeout: 5), "FS should be reachable from the Safeties exact-role panel")
        XCTAssertGreaterThanOrEqual(freeSafety.frame.height, 44 - 0.01, "FS must keep the 44pt touch minimum")
        freeSafety.tap()

        // Special Teams: Specialists is this unit's only room, and (Aug 2026: switching
        // units now jumps straight to the new unit's first room, expanded — see
        // CompareViewModel.swift's `selectUnit` doc comment) it's already expanded by the
        // unit-tab tap alone. Tapping it again here would collapse it instead (the same
        // Aug 2026 pass made an already-expanded room collapse on a second tap), so unlike
        // the Line and Safeties rooms above, this one is asserted without an explicit tap.
        app.buttons["unit-tab-special"].tap()
        XCTAssertTrue(app.buttons["compare-room-specialists"].waitForExistence(timeout: 5), "the Specialists room should render in special teams")
        let kicker = app.buttons["compare-position-K"]
        XCTAssertTrue(kicker.waitForExistence(timeout: 5), "K should be reachable from the Specialists exact-role panel")
        XCTAssertGreaterThanOrEqual(kicker.frame.height, 44 - 0.01, "K must keep the 44pt touch minimum")
        XCTAssertTrue(kicker.isHittable, "K should be tappable without horizontal scrolling")
        kicker.tap()
    }

    /// Picks a team into a compare slot: taps the slot, searches in the picker sheet,
    /// taps the matching row, and waits for the sheet to close.
    private func pickTeam(into slot: String, query: String, expectedRow: String, app: XCUIApplication) {
        let slotButton = app.buttons["compare-slot-\(slot)"]
        XCTAssertTrue(slotButton.waitForExistence(timeout: 10), "the \(slot) compare slot should exist")
        slotButton.tap()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "the picker sheet should offer team search")
        searchField.tap()
        searchField.typeText(query)

        let teamRow = app.buttons[expectedRow]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 15), "searching \"\(query)\" should surface \(expectedRow)")
        teamRow.tap()

        XCTAssertFalse(
            app.otherElements["team-switcher-sheet"].waitForExistence(timeout: 3),
            "selecting a compare team should close the picker sheet"
        )
    }
}
