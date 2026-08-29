import XCTest

// Deterministic App Store screenshot capture (task-9d-screenshots-brief.md, DEP-162
// blocker). Not part of the default `xcodebuild test` run — excluded via project.yml's
// scheme `skippedTests` because it's a slow, human-triggered release-prep tool, not a
// correctness gate. Run it via the one-command capture script (which boots a disposable
// 6.9-inch simulator, normalizes the status bar, runs the test against the dedicated
// Depth-AppStoreScreenshots scheme — no project.yml editing needed — and exports the
// PNGs):
//
//   ios/scripts/capture-appstore-screenshots.sh
//
// (boots a disposable 1284×2778-class iPhone 13 Pro Max simulator, normalizes the status
// bar, runs the test against the dedicated Depth-AppStoreScreenshots scheme — no project.yml
// editing needed — and exports the PNGs). Or by hand against the dedicated scheme (the
// default Depth scheme's scheme-level `skippedTests` cannot be overridden by `-only-testing`
// at the command line):
//
//   xcodebuild -project ios/Depth.xcodeproj -scheme Depth-AppStoreScreenshots \
//     -configuration Staging \
//     -destination 'platform=iOS Simulator,id=<an iPhone 13 Pro Max simulator UDID>' \
//     -only-testing:DepthUITests/AppStoreScreenshotsUITests \
//     -resultBundlePath /tmp/depth-screenshots.xcresult test
//
// See docs/ios-appstore-screenshots.md for the full workflow.
//
// The sequence was reselected 2026-08-28 (Cooper) around the surfaces that actually sell
// the app — two depth-chart fields, stats, compare, uniforms — replacing the earlier
// team-search / player-detail / reorder / schedule set. Two of those were actively weak:
// the search shot rendered one result row above ~70% empty black while captioned "Every
// team", and the reorder shot reused the same player card as the player-detail shot, so
// two of five slots showed what read as the same image.
//
// Teams are pinned rather than incidental: Seahawks (already the launch default), Broncos
// for defense, Chargers for stats, Chiefs/Eagles for compare. Pinning keeps reruns
// byte-comparable and keeps one team from dominating the listing.
final class AppStoreScreenshotsUITests: XCTestCase {
    func testCaptureAppStoreScreenshotSequence() throws {
        let app = XCUIApplication()
        // UI_TESTING_APPSTORE_SCREENSHOTS drives the deterministic app state (clean
        // team/unit, onboarding seen, forced sign-out). UI_TESTING_REDUCE_MOTION settles
        // the volatile UI for the duration of the mode — the same launch-argument
        // convention the accessibility suite uses — so the edit-mode dot wiggle (DEP-309)
        // and button press-scale are still/static in every capture instead of mid-animation
        // at an arbitrary frame.
        app.launchArguments = ["UI_TESTING_APPSTORE_SCREENSHOTS", "UI_TESTING_REDUCE_MOTION"]
        app.launch()

        // 1. Offensive depth chart — the hero shot. No navigation needed: screenshot mode
        // clears `lastTeamId`, so startup falls back to StartupTeam.defaultTeamId
        // ("seahawks") on the default offense unit.
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the chart header should expose the team switcher")
        XCTAssertTrue(
            switcher.waitForLabel(containing: "Seahawks"),
            "screenshot mode should start on the default team so this shot is deterministic"
        )
        XCTAssertTrue(
            waitForFilledSlot(in: app),
            "the offense should render at least one filled slot before capture"
        )
        attachScreenshot(name: "01-depth-chart-offense")

        // 2. Defensive depth chart — a different team and unit, so the two field shots
        // aren't near-duplicates of each other.
        selectTeam(named: "Broncos", rowIdentifier: "team-row-broncos", switcher: switcher, app: app)
        let defenseTab = app.buttons["unit-tab-defense"]
        XCTAssertTrue(defenseTab.waitForExistence(timeout: 15), "the unit tab bar should offer Defense")
        defenseTab.tap()
        XCTAssertTrue(
            waitForFilledSlot(in: app),
            "the defense should render at least one filled slot before capture"
        )
        attachScreenshot(name: "02-depth-chart-defense")

        // 3. Team stats.
        selectTeam(named: "Chargers", rowIdentifier: "team-row-chargers", switcher: switcher, app: app)
        let statsTab = app.buttons["page-switcher-stats"]
        XCTAssertTrue(statsTab.waitForExistence(timeout: 15), "team detail should expose a Stats page tab")
        statsTab.tap()
        XCTAssertTrue(
            element(app, identifier: "stats-content").waitForExistence(timeout: 20),
            "the stats page should render production content"
        )
        // Switch to a completed season before capturing. Unlike Compare — which detects an
        // empty current season and falls back on its own (see `compare-season-fallback`) —
        // the stats page honours the current season literally, so before week 1 it renders
        // an all-zero page: 0-0 record, 0 points for, 0 against. Accurate, but it reads as
        // a broken app in a store listing.
        //
        // The year is pinned rather than derived: the picker's identifiers are
        // season-numbered, and a manually-run release tool is better off failing loudly on
        // a stale constant than silently capturing whatever season happens to sort first.
        // Bump this once the current season has real data.
        let seasonTrigger = app.buttons["stats-season-trigger"]
        XCTAssertTrue(seasonTrigger.waitForExistence(timeout: 10), "the stats page should expose a season picker")
        seasonTrigger.tap()
        let completedSeason = app.buttons["stats-season-2025"]
        XCTAssertTrue(
            completedSeason.waitForExistence(timeout: 10),
            "the season sheet should offer 2025 — bump this year once the current season has data"
        )
        completedSeason.tap()
        XCTAssertTrue(
            element(app, identifier: "stats-content").waitForExistence(timeout: 20),
            "the stats page should re-render for the selected season"
        )
        attachScreenshot(name: "03-team-stats")

        // 4. Compare, on the "By team" (matchup) tab with both slots filled.
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 10), "the app should present a bottom tab bar")
        tabs.buttons["Compare"].tap()
        pickCompareTeam(into: "a", query: "Chiefs", rowIdentifier: "team-row-chiefs", app: app)
        pickCompareTeam(into: "b", query: "Eagles", rowIdentifier: "team-row-eagles", app: app)
        // Select the matchup segment explicitly rather than trusting the default — the
        // capture is only meaningful on "By team".
        let byTeamTab = app.buttons["compare-tab-matchup"]
        XCTAssertTrue(byTeamTab.waitForExistence(timeout: 10), "compare should offer the By team segment")
        byTeamTab.tap()
        XCTAssertTrue(
            element(app, identifier: "compare-content").waitForExistence(timeout: 20),
            "compare should render its comparison content once both slots are filled"
        )
        attachScreenshot(name: "04-compare")

        // 5. Uniform archive — the top-level grid, not drilled into a team.
        tabs.buttons["Uniforms"].tap()
        XCTAssertTrue(
            app.navigationBars["Uniforms"].waitForExistence(timeout: 15),
            "the Uniforms tab should render its own navigation bar"
        )
        // The nav bar can exist before the grid has any rows, so wait for real content —
        // same reasoning as the schedule capture's week-card wait.
        let uniformTeam = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'uniforms-team-'")
        ).firstMatch
        XCTAssertTrue(uniformTeam.waitForExistence(timeout: 20), "the archive should render at least one team's kits")
        attachScreenshot(name: "05-uniform-archive")
    }

    // MARK: - Helpers

    /// Look an element up by identifier without committing to an element *type*.
    /// `stats-content` and `compare-content` both sit on ScrollViews, so querying
    /// `app.otherElements` for them silently never resolves — the query is valid, it just
    /// matches nothing, and the failure reads as "the page never rendered" rather than
    /// "you asked the wrong collection". Type-agnostic lookup also survives one of these
    /// containers changing from a ScrollView to something else.
    private func element(_ app: XCUIApplication, identifier: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    /// Any filled depth-chart slot. Used as the "the field has actually rendered players"
    /// signal before a capture — `unit-tab-*` existing only proves the chrome is up.
    private func waitForFilledSlot(in app: XCUIApplication) -> Bool {
        app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")
        ).firstMatch.waitForExistence(timeout: 20)
    }

    /// Switch the depth chart to another team through the switcher sheet. Waits for the
    /// switcher to relabel before returning: selecting a team dismisses a sheet over the
    /// already-mounted chart rather than pushing a fresh one, so waiting on slots alone
    /// proves *a* chart is up, not that it's the requested team (same reasoning as
    /// UITestHelpers' `selectTeam`).
    private func selectTeam(
        named name: String,
        rowIdentifier: String,
        switcher: XCUIElement,
        app: XCUIApplication
    ) {
        switcher.tap()
        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 15), "the switcher sheet should offer team search")
        searchField.tap()
        searchField.typeText(name)

        let row = app.buttons[rowIdentifier]
        XCTAssertTrue(row.waitForExistence(timeout: 15), "searching \"\(name)\" should surface \(rowIdentifier)")
        row.tap()
        XCTAssertTrue(
            switcher.waitForLabel(containing: name),
            "the switcher button should relabel for the \(name) once the switch completes"
        )
    }

    /// Fill one compare slot through its picker sheet. Mirrors DepthUITests' `pickTeam`,
    /// which is private to that suite.
    private func pickCompareTeam(
        into slot: String,
        query: String,
        rowIdentifier: String,
        app: XCUIApplication
    ) {
        let slotButton = app.buttons["compare-slot-\(slot)"]
        XCTAssertTrue(slotButton.waitForExistence(timeout: 15), "the \(slot) compare slot should exist")
        slotButton.tap()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "the picker sheet should offer team search")
        searchField.tap()
        searchField.typeText(query)

        let row = app.buttons[rowIdentifier]
        XCTAssertTrue(row.waitForExistence(timeout: 15), "searching \"\(query)\" should surface \(rowIdentifier)")
        row.tap()
    }

    /// `XCUIScreen.main.screenshot()` captures the simulator's full physical framebuffer
    /// at native device resolution (no simulator bezel/chrome — that's rendered by the
    /// Simulator.app window, never part of the captured buffer) rather than
    /// `XCUIApplication.screenshot()`, which is scoped to the app's own window frame.
    /// For App Store Connect's exact-pixel-resolution requirement (1284×2778 on the
    /// iPhone 13 Pro Max this test targets — the accepted 6.5-inch display class), the
    /// full-screen API is the one that's guaranteed to match the published spec.
    private func attachScreenshot(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
