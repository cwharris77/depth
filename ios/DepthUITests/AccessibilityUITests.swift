import XCTest

// Accessibility acceptance for design spec Milestone 3 item 30 (VoiceOver labels,
// Accessibility XXXL layouts, increased contrast). These drive the same critical path
// as DepthUITests but under the accessibility environment overrides, because that is
// where layout regressions actually show up: a fixed-width frame or a fixed-size font
// still passes a default-size run and only clips once the content size category grows.
//
// Runs against Debug's real staging Supabase, same as every other Debug-config run.
final class AccessibilityUITests: XCTestCase {
    // Drives ContentView's UI_TESTING_DYNAMIC_TYPE override rather than
    // `-UIPreferredContentSizeCategoryName`, which is silently inert here — see the
    // comment on `ContentView.uiTestingDynamicTypeSize`.
    private func launchApp(dynamicTypeSize: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        if let dynamicTypeSize {
            app.launchArguments += ["UI_TESTING_DYNAMIC_TYPE", dynamicTypeSize]
        }
        app.launch()
        return app
    }

    /// Height of a team row, used as the proof that a Dynamic Type override actually
    /// landed. Without this the accessibility assertions below could all pass at default
    /// size and prove nothing.
    private func firstTeamRowHeight(_ app: XCUIApplication) -> CGFloat {
        let row = app.buttons["team-row-bills"]
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 15), "team list should load")
        searchField.tap()
        searchField.typeText("Bills")
        XCTAssertTrue(row.waitForExistence(timeout: 10), "Bills row should exist")
        return row.frame.height
    }

    private func openBillsDepthChart(_ app: XCUIApplication) {
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "team list should reach a searchable loaded state")
        searchField.tap()
        searchField.typeText("Bills")

        let teamRow = app.buttons["team-row-bills"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 10), "searching \"Bills\" should surface the Buffalo Bills row")
        teamRow.tap()
    }

    // Proves the override mechanism itself works, so the layout assertions below cannot
    // quietly degrade into a default-size run.
    func testDynamicTypeOverrideActuallyEnlargesTheLayout() throws {
        let defaultHeight = firstTeamRowHeight(launchApp(dynamicTypeSize: "large"))
        let accessibleHeight = firstTeamRowHeight(launchApp(dynamicTypeSize: "accessibility5"))

        XCTAssertGreaterThan(
            accessibleHeight, defaultHeight,
            "the Dynamic Type override is not reaching the view hierarchy — every other "
                + "accessibility assertion in this suite would be a vacuous pass"
        )
    }

    // The depth chart caps its own Dynamic Type scaling (positioned slots cannot
    // reflow), so the guarantee under test is that the journey still completes and the
    // slots stay hittable — not that the glyphs grow.
    func testCriticalPathRemainsUsableAtAccessibilityXXXL() throws {
        let app = launchApp(dynamicTypeSize: "accessibility5")
        openBillsDepthChart(app)

        let unitPicker = app.segmentedControls.firstMatch
        XCTAssertTrue(unitPicker.waitForExistence(timeout: 10), "unit picker should render at Accessibility XXXL")

        let playerSlot = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
        XCTAssertTrue(playerSlot.waitForExistence(timeout: 10), "a filled slot should still render at Accessibility XXXL")
        XCTAssertTrue(playerSlot.isHittable, "depth-chart slots must stay tappable at Accessibility XXXL")
        XCTAssertGreaterThanOrEqual(
            playerSlot.frame.height, 44,
            "slot tap targets must not fall below the 44-point minimum"
        )
        playerSlot.tap()

        let profile = app.scrollViews["player-profile-content"]
        XCTAssertTrue(profile.waitForExistence(timeout: 10), "player detail should open at Accessibility XXXL")
        XCTAssertTrue(
            app.staticTexts["player-profile-name"].waitForExistence(timeout: 5),
            "the player name must survive the larger layout rather than being clipped away"
        )

        attachScreenshot(app, named: "player-detail-accessibility-xxxl")

        let close = app.buttons["Close"]
        XCTAssertTrue(close.waitForExistence(timeout: 5), "Close must remain reachable at Accessibility XXXL")
        close.tap()

        attachScreenshot(app, named: "depth-chart-accessibility-xxxl")
    }

    // Assertions can prove elements exist and stay hittable; only an image shows whether
    // the layout still reads. Attached so a CI run carries its own evidence.
    private func attachScreenshot(_ app: XCUIApplication, named name: String) {
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    // Regression guard for the stat table's spoken reading: a row combined from its raw
    // cells announces bare numbers, so every value must arrive paired with its column's
    // spoken name (PlayerStatsAccessibility.rowLabel).
    func testSeasonStatRowsAnnounceColumnNamesWithTheirValues() throws {
        let app = launchApp()
        openBillsDepthChart(app)

        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 15), "the field should render its starting QB")
        quarterback.tap()

        let stats = app.otherElements["player-profile-stats"]
        XCTAssertTrue(stats.waitForExistence(timeout: 15), "the profile should resolve a stats state")

        // A starting QB in real production data always has season-stat rows, so this
        // asserts directly rather than skipping — a silent skip here would let the
        // spoken-label contract regress without ever failing the suite.
        let seasonRow = stats.otherElements.matching(NSPredicate(format: "label CONTAINS ' season, '")).firstMatch
        XCTAssertTrue(
            seasonRow.waitForExistence(timeout: 10),
            "the starting QB should have at least one season-stat row in staging data"
        )

        // Which columns appear depends on whichever position the field surfaced first,
        // so assert the shape rather than a specific stat: every segment after the
        // season/team must be a sentence-case spoken name plus its value. The compact
        // on-screen headers are all-caps abbreviations, so a segment with no lowercase
        // letter means a raw header (or a bare number) leaked into the spoken label.
        // The team segment is optional and is a single token ("BUF"); every stat segment
        // is "<name> <value>", so a space is what separates the two.
        let label = seasonRow.label
        let statSegments = label.components(separatedBy: ", ").dropFirst().filter { $0.contains(" ") }
        XCTAssertFalse(statSegments.isEmpty, "a season row should announce at least one stat: \(label)")
        for segment in statSegments {
            XCTAssertNotNil(
                segment.rangeOfCharacter(from: .lowercaseLetters),
                "\"\(segment)\" is not a spoken column name — full label: \(label)"
            )
            XCTAssertNotNil(
                segment.rangeOfCharacter(from: .decimalDigits.union(CharacterSet(charactersIn: "—"))),
                "\"\(segment)\" announces a column name with no value — full label: \(label)"
            )
        }
    }

    // The loading list hides its placeholder rows from VoiceOver; without a label on the
    // container the whole screen would announce nothing while teams load.
    func testTeamListAnnouncesItsLoadingState() throws {
        let app = launchApp()

        let loading = app.otherElements["team-list-loading"]
        let searchField = app.searchFields.firstMatch
        // A warm cache can resolve before the first query, so either the loading state
        // or the loaded list satisfies this — what must never happen is a silent screen.
        if loading.waitForExistence(timeout: 2) {
            XCTAssertEqual(loading.label, "Loading teams")
        } else {
            XCTAssertTrue(searchField.waitForExistence(timeout: 15), "the team list should reach a loaded state")
        }
    }
}
