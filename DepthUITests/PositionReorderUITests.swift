import XCTest

// DEP-226 reorder persistence, reached through the 2026-09-11 merge spec's edit-mode
// PositionReorderSheet: "Edit Depth Chart" on → tap a wiggling player → drag rows, CUSTOM
// tag, Reset. Outside edit mode the same tap pushes the player profile. All writes go
// through the DEP-219 local-first override cache, so the order survives a relaunch with no
// account. Runs on the hermetic fixture backend (UI_TESTING_FIXTURE_BACKEND).
@MainActor
final class PositionReorderUITests: XCTestCase {
    func testReorderPersistsAcrossRelaunch() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")
        openQuarterbackReorderSheet(app)

        XCTAssertFalse(app.buttons["player-profile-depth-reset"].exists, "no Reset before a custom order exists")
        let rows = reorderRows(app)
        XCTAssertGreaterThanOrEqual(rows.count, 2, "the reorder sheet should list at least two quarterbacks")
        for index in 0..<rows.count {
            XCTAssertTrue(rows.element(boundBy: index).label.contains("Quarterback, rank \(index + 1) of \(rows.count)"))
        }

        // Drag the first row onto the last: the long-press pick-up then slow drag reorders
        // one slot at a time; holding at the end makes the last crossing register before the
        // lift. Release commits once, and the position becomes CUSTOM.
        let first = rows.firstMatch
        let lastIndex = rows.count - 1
        let draggedRowID = first.identifier
        attachScreenshot(app, named: "05-reorder-edit-mode")
        first.press(
            forDuration: 0.6,
            thenDragTo: rows.element(boundBy: lastIndex),
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )
        XCTAssertEqual(
            rows.element(boundBy: lastIndex).identifier,
            draggedRowID,
            "a slow drag to the final slot should leave the dragged player there deterministically"
        )
        XCTAssertTrue(rows.element(boundBy: lastIndex).label.contains("rank \(rows.count) of \(rows.count)"))

        XCTAssertTrue(
            app.staticTexts["player-profile-depth-custom"].waitForExistence(timeout: 5),
            "reordering should mark the position CUSTOM"
        )
        attachScreenshot(app, named: "06-reorder-custom-state")
        XCTAssertTrue(
            app.buttons["player-profile-depth-reset"].waitForExistence(timeout: 5),
            "a custom order should expose Reset"
        )

        app.buttons["Close"].tap()
        // DEP-433: the app-level reset action belongs to the status row, centered.
        let resetAll = app.buttons["custom-order-reset-all"]
        XCTAssertTrue(resetAll.waitForExistence(timeout: 5), "a custom team order should expose Reset all")
        XCTAssertEqual(
            resetAll.frame.midX,
            app.windows.firstMatch.frame.midX,
            accuracy: 1,
            "Reset all should be centered within the depth chart status row"
        )
        app.terminate()
        // Relaunch inherits the saved override (no reset) but stays on the fixture backend.
        app.launchArguments = XCUIApplication.hermeticRelaunchArguments
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "relaunch should open a chart directly")

        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 10))
        if !switcher.label.contains("Buffalo Bills") {
            app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")
        }

        openQuarterbackReorderSheet(app)
        XCTAssertTrue(
            app.staticTexts["player-profile-depth-custom"].waitForExistence(timeout: 5),
            "the saved custom order should survive relaunch"
        )
        XCTAssertTrue(
            app.buttons["player-profile-depth-reset"].waitForExistence(timeout: 5),
            "Reset should survive relaunch"
        )
    }

    // DEP-226: Reset restores the position's default order and drops the override
    // (clears the local cache + mirrors a row delete to the server when signed in).
    func testResetRestoresDefaultOrderAndDropsTheOverride() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")
        openQuarterbackReorderSheet(app)

        let rows = reorderRows(app)
        XCTAssertGreaterThanOrEqual(rows.count, 2)
        rows.firstMatch.press(
            forDuration: 0.6,
            thenDragTo: rows.element(boundBy: rows.count - 1),
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )

        let reset = app.buttons["player-profile-depth-reset"]
        XCTAssertTrue(reset.waitForExistence(timeout: 5))
        reset.tap()

        XCTAssertTrue(
            app.staticTexts["player-profile-depth-custom"].waitForAbsence(timeout: 5),
            "Reset should clear the CUSTOM tag"
        )
        XCTAssertFalse(
            app.buttons["player-profile-depth-reset"].exists,
            "Reset should drop itself once there is no custom order"
        )
    }

    // DEP-542: a drag that returns the roster to its original order is equivalent to Reset.
    // Persisting that redundant array previously left the screen marked CUSTOM after close.
    func testReturningToTheDefaultOrderDropsTheCustomState() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")
        openQuarterbackReorderSheet(app)

        // The fixture backend intentionally preserves local preferences between launches.
        // Start from the raw roster order so this test proves the return-to-default path,
        // not a return to a prior test run's persisted custom order.
        let existingReset = app.buttons["player-profile-depth-reset"]
        if existingReset.exists {
            existingReset.tap()
            XCTAssertTrue(app.staticTexts["player-profile-depth-custom"].waitForAbsence(timeout: 5))
        }
        let rows = reorderRows(app)
        XCTAssertGreaterThanOrEqual(rows.count, 2)
        let originalFirstID = rows.firstMatch.identifier
        let firstBackup = rows.element(boundBy: 1)
        rows.firstMatch.press(
            forDuration: 0.6,
            thenDragTo: firstBackup,
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )
        XCTAssertTrue(
            app.staticTexts["player-profile-depth-custom"].waitForExistence(timeout: 5),
            "a reordered position should become CUSTOM before it is restored"
        )

        rows.element(boundBy: 1).press(
            forDuration: 0.6,
            thenDragTo: rows.firstMatch,
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )
        XCTAssertEqual(rows.firstMatch.identifier, originalFirstID, "the second drag should restore the default order")
        XCTAssertTrue(
            app.staticTexts["player-profile-depth-custom"].waitForAbsence(timeout: 5),
            "returning to the default order should remove the CUSTOM state immediately"
        )
        XCTAssertFalse(app.buttons["player-profile-depth-reset"].exists)

        app.buttons["Close"].tap()
        XCTAssertFalse(
            app.buttons["custom-order-reset-all"].waitForExistence(timeout: 1),
            "closing a restored position should not leave the team marked as custom"
        )
    }

    // Merge spec: edit mode is the only way into reordering. On → a field tap opens the
    // position's reorder sheet with drag rows immediately; off → the same tap pushes the
    // player profile, whose DEPTH CHART rows are read-only.
    func testEditModeTapOpensReorderSheetAndNormalTapOpensProfile() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")
        openQuarterbackReorderSheet(app)
        attachScreenshot(app, named: "position-reorder-sheet")

        XCTAssertTrue(
            reorderRows(app).firstMatch.waitForExistence(timeout: 5),
            "the reorder sheet should show drag rows immediately"
        )
        XCTAssertFalse(
            app.descendants(matching: .any)["player-profile-full-content"].exists,
            "an edit-mode tap should not push the profile"
        )
        app.buttons["Close"].tap()

        // The persistent Done editing chip is the direct exit action.
        let editingChip = app.buttons["depth-chart-editing-active"]
        editingChip.tap()
        XCTAssertTrue(editingChip.waitForAbsence(timeout: 5), "explicit exit should remove the active-mode chip")

        let qbAgain = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(qbAgain.waitForExistence(timeout: 10))
        qbAgain.tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["player-profile-full-depth"].waitForExistence(timeout: 5),
            "a normal tap should push the profile with its depth section"
        )
        XCTAssertFalse(app.scrollViews["position-reorder-sheet"].exists)
        XCTAssertFalse(reorderRows(app).firstMatch.exists, "the profile's depth rows are read-only")
    }

    func testContextChangesExitGlobalEditMode() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

        let editingChip = app.buttons["depth-chart-editing-active"]
        func enterEditing() {
            let overflow = app.buttons["depth-chart-overflow"]
            XCTAssertTrue(overflow.waitForExistence(timeout: 10))
            overflow.tap()
            let edit = app.buttons["edit-depth-order"]
            XCTAssertTrue(edit.waitForExistence(timeout: 5))
            edit.tap()
            XCTAssertTrue(editingChip.waitForExistence(timeout: 5))
        }
        func assertEditingEnded(_ context: String) {
            XCTAssertFalse(
                editingChip.waitForExistence(timeout: 1),
                "\(context) should save the current order and exit edit mode"
            )
        }

        enterEditing()
        XCTAssertTrue(
            app.buttons["unit-tab-defense"].tapUntil { app.buttons["unit-tab-defense"].isSelected },
            "the defense unit tab should become the selected unit"
        )
        assertEditingEnded("changing units")

        enterEditing()
        XCTAssertTrue(
            app.buttons["page-switcher-schedule"].tapUntil { app.otherElements["schedule-content"].exists },
            "the schedule page should render once switched from Roster"
        )
        assertEditingEnded("leaving the roster page")
        XCTAssertTrue(
            app.buttons["page-switcher-roster"].tapUntil { app.buttons["depth-chart-overflow"].exists },
            "returning to the roster page should restore the overflow menu"
        )

        enterEditing()
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(
            tabs.buttons["Compare"].tapUntil { app.scrollViews["compare-content"].exists },
            "the Compare tab should render its content"
        )
        XCTAssertTrue(
            tabs.buttons["Depth Charts"].tapUntil { app.buttons["depth-chart-overflow"].exists },
            "returning to the Depth Charts tab should restore the overflow menu"
        )
        assertEditingEnded("leaving the Depth Charts tab")

        enterEditing()
        app.selectTeam("seahawks", searching: "Seahawks", expectedDisplayName: "Seattle Seahawks")
        assertEditingEnded("switching teams")

        enterEditing()
        app.buttons["depth-chart-overflow"].tap()
        let history = app.buttons["history-destination"]
        XCTAssertTrue(history.waitForExistence(timeout: 5))
        history.tap()
        // 2025 is the past season guaranteed in both backends this suite hits — CI's
        // Staging/prod (backfilled 1999+) and local Debug (seed is current season only).
        let season = app.buttons["history-season-2025"]
        for _ in 0..<4 where !season.exists {
            app.swipeUp()
        }
        XCTAssertTrue(season.waitForExistence(timeout: 5))
        season.tap()
        // The historical roster re-fetches from production before its trigger renders
        // (same cold-CI batch as the sibling roster-history journeys).
        XCTAssertTrue(app.buttons["roster-history-season-trigger"].waitForExistence(timeout: 20))
        assertEditingEnded("entering a historical roster")
    }

    // DEP-291: projecting a saved player order must keep the team's formation data.
    // Otherwise the field silently falls back to its generic layout and the overflow
    // menu loses the active Formations row as soon as a drag commits.
    func testPlayerReorderPreservesActiveFormation() throws {
        let app = XCUIApplication()
        XCTAssertTrue(app.launch(intoTeam: "bills"), "the app should launch straight into the Bills depth chart")

        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10))
        overflow.tap()
        XCTAssertTrue(
            app.buttons["choose-formation"].waitForExistence(timeout: 5),
            "the live Bills chart should start with an active computed formation"
        )
        app.buttons["edit-depth-order"].tap()

        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10))
        quarterback.tap()
        XCTAssertTrue(app.scrollViews["position-reorder-sheet"].waitForExistence(timeout: 5))

        let rows = reorderRows(app)
        XCTAssertGreaterThanOrEqual(rows.count, 2)
        rows.firstMatch.press(
            forDuration: 0.6,
            thenDragTo: rows.element(boundBy: rows.count - 1),
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )
        app.buttons["Close"].tap()

        XCTAssertTrue(overflow.waitForExistence(timeout: 5))
        overflow.tap()
        attachScreenshot(app, named: "07-formation-after-reorder")
        XCTAssertTrue(
            app.buttons["choose-formation"].waitForExistence(timeout: 5),
            "reordering players should preserve the active computed formation"
        )
    }

    /// Turns on "Edit Depth Chart" from the overflow menu and taps the Bills QB, which in
    /// edit mode opens the position's reorder sheet rather than the player profile.
    private func openQuarterbackReorderSheet(
        _ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line
    ) {
        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10), file: file, line: line)
        overflow.tap()
        let editToggle = app.buttons["edit-depth-order"]
        XCTAssertTrue(editToggle.waitForExistence(timeout: 5), file: file, line: line)
        editToggle.tap()
        XCTAssertTrue(
            app.buttons["depth-chart-editing-active"].waitForExistence(timeout: 5),
            "edit mode should be active", file: file, line: line
        )
        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10), "the Bills field should render its QB", file: file, line: line)
        quarterback.tap()
        XCTAssertTrue(
            app.scrollViews["position-reorder-sheet"].waitForExistence(timeout: 5),
            "an edit-mode tap should open the reorder sheet", file: file, line: line
        )
    }

    private func reorderRows(_ app: XCUIApplication) -> XCUIElementQuery {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
        )
    }

    private func attachScreenshot(_ app: XCUIApplication, named name: String) {
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
