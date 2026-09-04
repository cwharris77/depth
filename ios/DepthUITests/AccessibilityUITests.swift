import XCTest

// Accessibility acceptance for design spec Milestone 3 item 30 (VoiceOver labels,
// Accessibility XXXL layouts, increased contrast). These drive the same critical path
// as DepthUITests but under the accessibility environment overrides, because that is
// where layout regressions actually show up: a fixed-width frame or a fixed-size font
// still passes a default-size run and only clips once the content size category grows.
//
// Runs against the production Supabase project (Debug/Staging/Release all point at it),
// same as every other Debug-config run.
final class AccessibilityUITests: XCTestCase {
    // Run with simctl's real content_size setting, so sheet presentations and native
    // controls are covered independently of the app's launch-argument override.
    func testSystemSizeSecondaryScreens() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills", timeout: 30))
        app.buttons["depth-chart-overflow"].tap()
        app.buttons["choose-formation"].tap()
        XCTAssertTrue(app.buttons["Close"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-formations")
        app.buttons["Close"].tap()
        app.buttons["depth-chart-overflow"].tap()
        app.buttons["choose-uniform"].tap()
        XCTAssertTrue(app.buttons["Close"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-uniform-picker")
        app.buttons["Close"].tap()

        app.tabBars.buttons["Compare"].tap()
        XCTAssertTrue(app.buttons["compare-slot-a"].waitForExistence(timeout: 20))
        for (slot, query, team) in [("a", "Bills", "bills"), ("b", "Dolphins", "dolphins")] {
            reveal(app.buttons["compare-slot-\(slot)"], in: app)
            app.buttons["compare-slot-\(slot)"].tap()
            XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 10))
            app.searchFields.firstMatch.typeTextAfterFocusing(query, in: app)
            app.buttons["team-row-\(team)"].tap()
        }
        attachScreenshot(app, named: "system-compare-teams")
        reveal(app.buttons["compare-tab-position"], in: app)
        app.buttons["compare-tab-position"].tap()
        attachScreenshot(app, named: "system-compare-position")
        for _ in 0..<3 { app.swipeUp() }
        attachScreenshot(app, named: "system-compare-rows")
        for _ in 0..<6 { app.swipeDown() }
        reveal(app.buttons["compare-tab-matchup"], in: app)
        app.buttons["compare-tab-matchup"].tap()
        for _ in 0..<3 { app.swipeUp() }
        attachScreenshot(app, named: "system-compare-metrics")

        app.tabBars.buttons["Uniforms"].tap()
        XCTAssertTrue(app.buttons["uniforms-team-bills"].waitForExistence(timeout: 20))
        app.buttons["uniforms-team-bills"].tap()
        attachScreenshot(app, named: "system-uniform-team")
        let kit = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'uniform-kit-row-'")).firstMatch
        XCTAssertTrue(kit.waitForExistence(timeout: 10))
        kit.tap()
        XCTAssertTrue(app.buttons["Close"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-kit")
        reveal(app.buttons["uniform-kit-open-depth-chart"], in: app)
        attachScreenshot(app, named: "system-kit-action")
        app.buttons["Close"].tap()
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.buttons["uniforms-filter-button"].tap()
        XCTAssertTrue(app.buttons["filter-reset"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-filters")
        reveal(app.buttons["filter-apply"], in: app)
        attachScreenshot(app, named: "system-filter-action")
        app.buttons["filter-apply"].tap()

        app.buttons["account-button"].tap()
        XCTAssertTrue(app.buttons["account-close-button"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-settings")
        reveal(app.buttons["Sign In"], in: app)
        app.buttons["Sign In"].tap()
        XCTAssertTrue(app.textFields["auth-email"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-sign-in")
        app.buttons.matching(identifier: "Close").element(boundBy: app.buttons.matching(identifier: "Close").count - 1).tap()
        for _ in 0..<5 { app.swipeDown() }
        let tour = app.buttons["settings-take-the-tour"]
        reveal(tour, in: app)
        tour.tap()
        XCTAssertTrue(app.buttons["Skip"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-welcome")
        reveal(app.buttons["Take the Tour"], in: app)
        app.buttons["Take the Tour"].tap()
        XCTAssertTrue(app.buttons["coachmark-next"].waitForExistence(timeout: 10))
        attachScreenshot(app, named: "system-coachmark")
        reveal(app.buttons["coachmark-next"], in: app)
        app.buttons["coachmark-next"].tap()
        attachScreenshot(app, named: "system-coachmark-next")
        app.buttons["coachmark-skip"].tap()
    }

    private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<12 where !element.isHittable { app.swipeUp() }
        XCTAssertTrue(element.isHittable, "control must be reachable: \(element.identifier)")
    }

    func testVitalsReflowAtAccessibilitySizes() throws {
        continueAfterFailure = false
        for size in ["accessibility1", "accessibility3", "accessibility5"] {
            let app = launchApp(dynamicTypeSize: size)
            XCTAssertTrue(app.waitForDepthChart(timeout: 30))
            let profile = app.scrollViews["player-profile-content"]
            XCTAssertTrue(app.buttons["player-slot-off-qb-0"].tapUntil { profile.exists })
            var previousBottom: CGFloat?
            for name in ["age", "experience", "height", "weight"] {
                let vital = app.descendants(matching: .any)["player-vital-\(name)"]
                XCTAssertTrue(vital.waitForExistence(timeout: 10))
                // Accessibility bounds hug the text, not its full-width layout cell.
                // Separate vertical ranges distinguish a stack from compressed columns.
                if let previousBottom { XCTAssertGreaterThanOrEqual(vital.frame.minY, previousBottom) }
                previousBottom = vital.frame.maxY
            }
            reveal(app.descendants(matching: .any)["player-vital-weight"], in: app)
            attachScreenshot(app, named: "\(size)-vitals-reflow")
            let reorder = app.buttons["player-profile-depth-reorder-toggle"]
            reveal(reorder, in: app)
            reorder.tap()
            let editRow = app.descendants(matching: .any).matching(
                NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
            ).firstMatch
            XCTAssertTrue(editRow.waitForExistence(timeout: 10))
            reveal(editRow, in: app)
            attachScreenshot(app, named: "\(size)-depth-editing")
            XCTAssertTrue(app.buttons["Close"].isHittable)
            app.terminate()
        }
    }

    // DEP-415: retain screenshots at intermediate steps as well as AX5. Existence
    // alone cannot detect truncated labels; these captures are reviewed alongside
    // the control-reachability assertions, before and after layout changes.
    func testDynamicTypeScreenInventory() throws {
        continueAfterFailure = false
        for size in ["large", "accessibility1", "accessibility3", "accessibility5"] {
            let app = launchApp(dynamicTypeSize: size)
            XCTAssertTrue(app.waitForDepthChart(timeout: 30))
            attachScreenshot(app, named: "\(size)-field")
            let profile = app.scrollViews["player-profile-content"]
            XCTAssertTrue(app.buttons["player-slot-off-qb-0"].tapUntil { profile.exists })
            XCTAssertTrue(profile.waitForExistence(timeout: 10))
            attachScreenshot(app, named: "\(size)-player-header")
            for index in 1...3 {
                profile.swipeUp()
                attachScreenshot(app, named: "\(size)-player-scroll-\(index)")
            }
            XCTAssertTrue(app.buttons["Close"].isHittable)
            app.buttons["Close"].tap()
            for page in ["schedule", "stats"] {
                app.buttons["page-switcher-\(page)"].tap()
                XCTAssertTrue(app.descendants(matching: .any)["\(page)-content"].waitForExistence(timeout: 20))
                attachScreenshot(app, named: "\(size)-\(page)")
                app.swipeUp()
                attachScreenshot(app, named: "\(size)-\(page)-scroll")
            }
            app.buttons["account-button"].tap()
            XCTAssertTrue(app.buttons["account-close-button"].waitForExistence(timeout: 10))
            attachScreenshot(app, named: "\(size)-settings")
            app.swipeUp()
            attachScreenshot(app, named: "\(size)-settings-scroll")
            app.buttons["account-close-button"].tap()
            app.tabBars.buttons["Compare"].tap()
            XCTAssertTrue(app.buttons["compare-slot-a"].waitForExistence(timeout: 20))
            attachScreenshot(app, named: "\(size)-compare")
            app.buttons["compare-slot-a"].tap()
            XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 10))
            attachScreenshot(app, named: "\(size)-team-picker")
            app.buttons["Close"].tap()
            app.tabBars.buttons["Uniforms"].tap()
            XCTAssertTrue(app.buttons["uniforms-filter-button"].waitForExistence(timeout: 20))
            attachScreenshot(app, named: "\(size)-uniforms")
            app.buttons["uniforms-view-era"].tap()
            attachScreenshot(app, named: "\(size)-uniforms-era")
            app.buttons["uniforms-filter-button"].tap()
            XCTAssertTrue(app.buttons["filter-reset"].waitForExistence(timeout: 10))
            attachScreenshot(app, named: "\(size)-filters")
            app.swipeUp()
            attachScreenshot(app, named: "\(size)-filters-scroll")
            app.terminate()
        }
    }

    // Drives ContentView's UI_TESTING_DYNAMIC_TYPE override rather than
    // `-UIPreferredContentSizeCategoryName`, which is silently inert here — see the
    // comment on `ContentView.uiTestingDynamicTypeSize`.
    private func launchApp(
        dynamicTypeSize: String? = nil,
        reduceMotion: Bool = false
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        if let dynamicTypeSize {
            app.launchArguments += ["UI_TESTING_DYNAMIC_TYPE", dynamicTypeSize]
        }
        if reduceMotion {
            app.launchArguments.append("UI_TESTING_REDUCE_MOTION")
        }
        app.launch()
        return app
    }

    /// Height of a team row inside the team switcher sheet, used as the proof that a
    /// Dynamic Type override actually landed. Without this the accessibility assertions
    /// below could all pass at default size and prove nothing. The app now launches
    /// directly into a depth chart (2026-08-15 navigation-parity spec) rather than a root
    /// team list, so this opens the switcher and searches — it only needs the row to
    /// exist, not to actually select a team.
    private func firstTeamRowHeight(_ app: XCUIApplication) -> CGFloat {
        XCTAssertTrue(app.waitForDepthChart(timeout: 15), "the app should launch straight into a depth chart")
        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the depth chart header should expose the team switcher")
        switcher.tap()

        let row = app.buttons["team-row-bills"]
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 15), "the switcher sheet should offer team search")
        searchField.typeTextAfterFocusing("Bills", in: app)
        XCTAssertTrue(row.waitForExistence(timeout: 10), "Bills row should exist")
        return row.frame.height
    }

    /// The app launches into the default team's chart; this switches to Bills via the
    /// header switcher sheet rather than searching from a root list.
    private func openBillsDepthChart(_ app: XCUIApplication) {
        XCTAssertTrue(app.waitForDepthChart(timeout: 15), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")
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

    // The accessible formation list must retain the same player-sheet journey.
    func testCriticalPathRemainsUsableAtAccessibilityXXXL() throws {
        let app = launchApp(dynamicTypeSize: "accessibility5")
        openBillsDepthChart(app)

        let unitTab = app.buttons["unit-tab-offense"]
        XCTAssertTrue(unitTab.waitForExistence(timeout: 10), "unit tab bar should render at Accessibility XXXL")

        let playerSlot = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
        XCTAssertTrue(playerSlot.waitForExistence(timeout: 10), "a filled slot should still render at Accessibility XXXL")
        XCTAssertTrue(playerSlot.isHittable, "depth-chart slots must stay tappable at Accessibility XXXL")
        XCTAssertGreaterThanOrEqual(
            playerSlot.frame.height, 44,
            "slot tap targets must not fall below the 44-point minimum"
        )
        let profile = app.scrollViews["player-profile-content"]
        XCTAssertTrue(playerSlot.tapUntil { profile.exists })
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

    func testEditModeRemainsUsableWithReduceMotion() throws {
        let app = launchApp(reduceMotion: true)
        openBillsDepthChart(app)

        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10))
        overflow.tap()

        let edit = app.buttons["edit-depth-order"]
        XCTAssertTrue(edit.waitForExistence(timeout: 5))
        edit.tap()

        let editing = app.buttons["depth-chart-editing-active"]
        XCTAssertTrue(editing.waitForExistence(timeout: 5))
        XCTAssertEqual(editing.value as? String, "Motion reduced")

        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10))
        quarterback.tap()
        XCTAssertTrue(
            app.descendants(matching: .any).matching(
                NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
            ).firstMatch.waitForExistence(timeout: 10),
            "Reduce Motion must not disable editing or reordering"
        )

        app.buttons["Close"].tap()
        attachScreenshot(app, named: "depth-chart-editing-reduce-motion")
    }

    // Assertions can prove elements exist and stay hittable; only an image shows whether
    // the layout still reads. Attached so a CI run carries its own evidence.
    private func attachScreenshot(_ app: XCUIApplication, named name: String) {
        // Allow selection and sheet transitions to settle before visual comparison.
        Thread.sleep(forTimeInterval: 0.5)
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    // Regression guard for the stat table's spoken reading: a row combined from its raw
    // cells announces bare numbers, so every value must arrive paired with its column's
    // spoken name (PlayerStatsAccessibility.rowLabel).
    //
    // This suite runs against production Supabase, and the depth chart resolves *whichever*
    // player the DB currently pins to a slot (DEP-329). That resolution can be a season-less
    // backup or a just-signed player before ESPN's ingest has a row for them, so the old
    // "the starting QB always has rows" assert hard-failed on real data mid-season. This
    // instead walks the roster for the first player that actually has a season-stat row, and
    // only skips if the whole chart yields none — it still asserts the real spoken-label
    // contract whenever production has any stats at all.
    func testSeasonStatRowsAnnounceColumnNamesWithTheirValues() throws {
        let app = launchApp()
        openBillsDepthChart(app)

        guard let seasonRow = firstSeasonStatRow(in: app) else {
            throw XCTSkip(
                "no Bills player in the current production depth chart has season-stat rows — "
                    + "skipping the spoken-label contract rather than hard-failing on which "
                    + "player the QB slot happens to resolve to (DEP-329)"
            )
        }

        // Which columns appear depends on whichever position surfaced first, so assert the
        // shape rather than a specific stat: every segment after the season/team must be a
        // sentence-case spoken name plus its value. The compact on-screen headers are
        // all-caps abbreviations, so a segment with no lowercase letter means a raw header
        // (or a bare number) leaked into the spoken label. The team segment is optional and
        // is a single token ("BUF"); every stat segment is "<name> <value>", so a space is
        // what separates the two.
        assertSpokenLabelContract(seasonRow.label)
    }

    /// Asserts the stat-table spoken-label shape of a season row: every comma-separated
    /// segment after the season must pair a sentence-case spoken column name with a value,
    /// exactly as `PlayerStatsAccessibility.rowLabel` builds it.
    private func assertSpokenLabelContract(
        _ label: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let statSegments = label.components(separatedBy: ", ").dropFirst().filter { $0.contains(" ") }
        XCTAssertFalse(statSegments.isEmpty, "a season row should announce at least one stat: \(label)", file: file, line: line)
        for segment in statSegments {
            XCTAssertNotNil(
                segment.rangeOfCharacter(from: .lowercaseLetters),
                "\"\(segment)\" is not a spoken column name — full label: \(label)",
                file: file, line: line
            )
            XCTAssertNotNil(
                segment.rangeOfCharacter(from: .decimalDigits.union(CharacterSet(charactersIn: "—"))),
                "\"\(segment)\" announces a column name with no value — full label: \(label)",
                file: file, line: line
            )
        }
    }

    /// Taps every filled, reachable player slot across the depth chart's three unit tabs
    /// and returns the first season-stat row found, or nil when no reachable player yields
    /// one. This is the "tolerant of the data actually being absent" guarantee: which
    /// specific player the chart resolves into each slot is not a contract, but the
    /// spoken-label shape of a real row is.
    private func firstSeasonStatRow(
        in app: XCUIApplication,
        rowTimeout: TimeInterval = 8
    ) -> XCUIElement? {
        for unit in ["offense", "defense", "special"] {
            let tab = app.buttons["unit-tab-\(unit)"]
            guard tab.waitForExistence(timeout: 5), tab.isHittable else { continue }
            tab.tap()

            let slots = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'"))
            for index in 0..<slots.count {
                let slot = slots.element(boundBy: index)
                guard slot.exists, slot.isHittable else { continue }
                slot.tap()

                let stats = app.otherElements["player-profile-stats"]
                guard stats.waitForExistence(timeout: rowTimeout) else {
                    app.buttons["Close"].tapIfExists()
                    continue
                }
                let seasonRow = stats.otherElements
                    .matching(NSPredicate(format: "label CONTAINS ' season, '"))
                    .firstMatch
                if seasonRow.waitForExistence(timeout: rowTimeout) {
                    return seasonRow
                }
                // No row for this player: back out to the chart and try the next slot.
                app.buttons["Close"].tapIfExists()
            }
        }
        return nil
    }

    // The loading list hides its placeholder rows from VoiceOver; without a label on the
    // container the whole screen would announce nothing while teams load. The team list
    // now lives inside the switcher sheet rather than at the app root.
    func testTeamListAnnouncesItsLoadingState() throws {
        let app = launchApp()
        XCTAssertTrue(app.waitForDepthChart(timeout: 15), "the app should launch straight into a depth chart")
        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the depth chart header should expose the team switcher")
        switcher.tap()

        let loading = app.otherElements["team-list-loading"]
        let searchField = app.searchFields.firstMatch
        // A warm cache can resolve before the first query, so either the loading state
        // or the loaded list satisfies this — what must never happen is a silent screen.
        if loading.waitForExistence(timeout: 2) {
            XCTAssertEqual(loading.label, "Loading teams")
        } else {
            XCTAssertTrue(searchField.waitForExistence(timeout: 15), "the switcher sheet should reach a loaded state")
        }
    }
}
