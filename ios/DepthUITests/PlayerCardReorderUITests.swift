import XCTest

// DEP-226: the player card's Position Depth section owns its reorder UI — Reorder/Done
// toggle, one-time hint, CUSTOM tag + Reset once a custom order exists, and
// drag-to-reorder rows. All writes go through the DEP-219 local-first override cache, so
// the order survives a relaunch with no account. Runs against the production Supabase
// project (Debug/Staging/Release all point at it) like every other Debug-config UI test.
final class PlayerCardReorderUITests: XCTestCase {
    func testPlayerCardReorderPersistsAcrossRelaunch() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10), "the Bills field should render its QB")
        quarterback.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))

        // Fresh install: the one-time hint accompanies the Reorder toggle, and the
        // toggle is still a Reorder pill (no CUSTOM state yet).
        let hint = app.staticTexts["player-profile-depth-hint"]
        XCTAssertTrue(hint.waitForExistence(timeout: 5), "a fresh install should show the reorder hint")

        let reorderToggle = app.buttons["player-profile-depth-reorder-toggle"]
        XCTAssertTrue(reorderToggle.waitForExistence(timeout: 5))
        for _ in 0..<3 where !reorderToggle.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(reorderToggle.isHittable, "the Reorder toggle should be reachable")
        XCTAssertEqual(reorderToggle.label, "Reorder")
        XCTAssertFalse(app.buttons["player-profile-depth-reset"].exists, "no Reset before a custom order exists")
        reorderToggle.tap()

        // Edit mode: hint dismissed, grip-led drag rows replace the tap rows.
        XCTAssertFalse(hint.exists, "entering edit mode should dismiss the hint")
        let rows = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
        )
        XCTAssertGreaterThanOrEqual(rows.count, 2, "edit mode should show at least two reorder rows")

        // Drag the first row onto the last: the long-press pick-up then slow drag reorders
        // one slot at a time; holding at the end makes the last crossing register before the
        // lift. The Done pill commits once. The position becomes CUSTOM.
        let first = rows.firstMatch
        let lastIndex = rows.count - 1
        let last = rows.element(boundBy: lastIndex)
        let draggedRowID = first.identifier
        attachScreenshot(app, named: "05-reorder-edit-mode")
        first.press(
            forDuration: 0.6,
            thenDragTo: last,
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )
        XCTAssertEqual(
            rows.element(boundBy: lastIndex).identifier,
            draggedRowID,
            "a slow drag to the final slot should leave the dragged player there deterministically"
        )

        let done = app.buttons["player-profile-depth-reorder-toggle"]
        XCTAssertEqual(done.label, "Done")
        done.tap()
        XCTAssertTrue(
            app.staticTexts["player-profile-depth-custom"].waitForExistence(timeout: 5),
            "reordering should mark the position CUSTOM"
        )
        attachScreenshot(app, named: "06-reorder-custom-state")
        XCTAssertTrue(
            app.buttons["player-profile-depth-reset"].waitForExistence(timeout: 5),
            "a custom order should expose Reset"
        )

        // Relaunch without the reset argument: the override + seen-hint flag must come
        // back from the local cache.
        app.buttons["Close"].tap()
        app.terminate()
        app.launchArguments = []
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "relaunch should open a chart directly")

        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 10))
        if !switcher.label.contains("Buffalo Bills") {
            app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")
        }

        let qbAfterRelaunch = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(qbAfterRelaunch.waitForExistence(timeout: 10))
        qbAfterRelaunch.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))

        // The reorder is read back (CUSTOM + Reset still there, hint not re-shown).
        XCTAssertFalse(
            app.staticTexts["player-profile-depth-hint"].exists,
            "the hint is one-time; it should not reappear after relaunch"
        )
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
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart())
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10))
        quarterback.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))

        // Build a custom order, then Reset it.
        let reorderToggle = app.buttons["player-profile-depth-reorder-toggle"]
        XCTAssertTrue(reorderToggle.waitForExistence(timeout: 5))
        for _ in 0..<3 where !reorderToggle.isHittable {
            app.swipeUp()
        }
        reorderToggle.tap()
        let rows = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
        )
        XCTAssertGreaterThanOrEqual(rows.count, 2)
        rows.firstMatch.press(
            forDuration: 0.6,
            thenDragTo: rows.element(boundBy: rows.count - 1),
            withVelocity: .slow,
            thenHoldForDuration: 0.5
        )
        app.buttons["player-profile-depth-reorder-toggle"].tap()

        let reset = app.buttons["player-profile-depth-reset"]
        XCTAssertTrue(reset.waitForExistence(timeout: 5))
        reset.tap()

        XCTAssertFalse(
            app.staticTexts["player-profile-depth-custom"].exists,
            "Reset should clear the CUSTOM tag"
        )
        XCTAssertFalse(
            app.buttons["player-profile-depth-reset"].exists,
            "Reset should drop itself once there is no custom order"
        )
    }

    // DEP-231: the app-level Edit Depth Chart toggle (web's globalEditMode) opens any
    // player card already in reorder mode — no per-card Reorder tap. Toggling off restores
    // plain tap-to-switch rows, and the per-card Reorder pill returns.
    func testGlobalEditModeToggleShowsDragHandlesImmediately() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

        // Enable the app-level toggle from the overflow menu.
        let overflow = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflow.waitForExistence(timeout: 10))
        overflow.tap()
        let editToggle = app.buttons["edit-depth-order"]
        XCTAssertTrue(editToggle.waitForExistence(timeout: 5))
        editToggle.tap()

        // The menu dismisses; open a filled position slot.
        let quarterback = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(quarterback.waitForExistence(timeout: 10))
        quarterback.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))

        // Already reordering: grip-led rows present with no per-card Reorder tap, and the
        // per-card pill is hidden as redundant.
        let reorderRows = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
        )
        XCTAssertTrue(
            reorderRows.firstMatch.waitForExistence(timeout: 5),
            "global edit mode should show drag rows immediately"
        )
        XCTAssertFalse(
            app.buttons["player-profile-depth-reorder-toggle"].exists,
            "the per-card Reorder pill is redundant while the global toggle is on"
        )
        app.buttons["Close"].tap()

        // Disable the toggle and reopen the card: plain tap-to-switch rows, per-card
        // Reorder pill back.
        let overflowAgain = app.buttons["depth-chart-overflow"]
        XCTAssertTrue(overflowAgain.waitForExistence(timeout: 5))
        overflowAgain.tap()
        let editToggleAgain = app.buttons["edit-depth-order"]
        XCTAssertTrue(editToggleAgain.waitForExistence(timeout: 5))
        editToggleAgain.tap()

        let qbAgain = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(qbAgain.waitForExistence(timeout: 10))
        qbAgain.tap()
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))
        XCTAssertFalse(
            reorderRows.firstMatch.exists,
            "toggling global edit off should restore plain tap-to-switch rows"
        )
        XCTAssertTrue(
            app.buttons["player-profile-depth-reorder-toggle"].waitForExistence(timeout: 5),
            "the per-card Reorder pill returns once global mode is off"
        )
    }

    // DEP-291: projecting a saved player order must keep the team's formation data.
    // Otherwise the field silently falls back to its generic layout and the overflow
    // menu loses the active Formations row as soon as a drag commits.
    func testPlayerReorderPreservesActiveFormation() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart())
        app.selectTeam("bills", searching: "Bills", expectedDisplayName: "Buffalo Bills")

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
        XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 5))

        let rows = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'player-profile-depth-reorder-row-'")
        )
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

    private func attachScreenshot(_ app: XCUIApplication, named name: String) {
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
