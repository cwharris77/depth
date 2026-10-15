import XCTest

// Deterministic App Store screenshot capture.
// Not part of the
// default `xcodebuild test` run — excluded via project.yml's scheme `skippedTests`
// because it's a slow, human-triggered release-prep tool, not a correctness gate. Run it
// via the one-command capture script (which boots a disposable 1284×2778-class simulator,
// normalizes the status bar, runs the test against the dedicated Depth-AppStoreScreenshots
// scheme — no project.yml editing needed — and exports the PNGs):
//
// scripts/capture-appstore-screenshots.sh
//
// (boots a disposable 1284×2778-class iPhone 13 Pro Max simulator, normalizes the status
// bar, runs the test against the dedicated Depth-AppStoreScreenshots scheme — no project.yml
// editing needed — and exports the PNGs). Or by hand against the dedicated scheme (the
// default Depth scheme's scheme-level `skippedTests` cannot be overridden by `-only-testing`
// at the command line):
//
// xcodebuild -project Depth.xcodeproj -scheme Depth-AppStoreScreenshots \
// -configuration Staging \
// -destination 'platform=iOS Simulator,id=<an iPhone 13 Pro Max simulator UDID>' \
// -only-testing:DepthUITests/AppStoreScreenshotsUITests \
// -resultBundlePath /tmp/depth-screenshots.xcresult test
//
// The sequence covers the primary surfaces and uses fixed teams and seasons for repeatability.
//
// The sequence covers the primary surfaces — two depth-chart fields, stats, compare, and
// uniforms — plus player profile and postseason views. The selected surfaces are deterministic:
// the search shot rendered one result row above ~70% empty black while captioned "Every
// team", and the reorder shot reused the same player card as the player-detail shot, so
// two of five slots showed what read as the same image.
//
// The set contains ten screenshots (the seven below plus schedule, uniform team detail and kit detail), including the player profile (jersey header + season
// ledger) and postseason ladder (slots 3 and 5 below). The pinned teams/season are unchanged
// apart from adding the Rams for the postseason shot.
//
// Teams are pinned rather than incidental: Seahawks (already the launch default), Broncos
// for defense, Chargers for stats, Chiefs/Eagles for compare. Pinning keeps reruns
// byte-comparable and keeps one team from dominating the listing.
@MainActor
final class AppStoreScreenshotsUITests: XCTestCase {
    func testCaptureAppStoreScreenshotSequence() throws {
        let app = XCUIApplication()
        // UI_TESTING_APPSTORE_SCREENSHOTS drives the deterministic app state (clean
        // team/unit, onboarding seen, forced sign-out). UI_TESTING_REDUCE_MOTION settles
        // the volatile UI for the duration of the mode — the same launch-argument
        // convention the accessibility suite uses — so the edit-mode dot wiggle
        // and button press-scale are still/static in every capture instead of mid-animation
        // at an arbitrary frame.
        app.launchArguments = ["UI_TESTING_APPSTORE_SCREENSHOTS", "UI_TESTING_REDUCE_MOTION"]
        app.launch()

        // 1. Offensive depth chart — the hero shot. No navigation needed: screenshot mode
        // clears `lastTeamId`, so startup falls back to StartupTeam.defaultTeamId
        // ("seahawks") on the default offense unit.
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(
            switcher.waitForExistence(timeout: 15),
            "the chart header should expose the team switcher")
        XCTAssertTrue(
            switcher.waitForLabel(containing: "Seahawks"),
            "screenshot mode should start on the default team so this shot is deterministic"
        )
        XCTAssertTrue(
            waitForFilledSlot(in: app),
            "the offense should render at least one filled slot before capture"
        )
        // Retire the first-run true-scale tip so it isn't in the hero capture.
        let tipDismiss = app.buttons["Got it"]
        if tipDismiss.waitForExistence(timeout: 5) {
            tipDismiss.tap()
        }
        // Pin the field to the Shotgun 11 look the store listing shows rather than whichever
        // formation the backend ranks first.
        let overflow = app.buttons["depth-chart-overflow"]
        if overflow.waitForExistence(timeout: 5) {
            overflow.tap()
            let formations = app.buttons["choose-formation"]
            if formations.waitForExistence(timeout: 5) {
                formations.tap()
                let shotgun = app.buttons.matching(
                    NSPredicate(format: "label == 'Shotgun 11'")
                ).firstMatch
                XCTAssertTrue(
                    shotgun.waitForExistence(timeout: 10),
                    "the formations sheet should list Shotgun 11")
                shotgun.tap()
                XCTAssertTrue(
                    app.buttons["formation-row"].waitForNonExistence(timeout: 10),
                    "the formations sheet should close after picking a formation")
            }
        }
        XCTAssertTrue(
            waitForFilledSlot(in: app),
            "the offense should render at least one filled slot before capture"
        )
        attachScreenshot(name: "01-depth-chart-offense")

        // 2. Defensive depth chart — a different team and unit, so the two field shots
        // aren't near-duplicates of each other.
        selectTeam(
            named: "Broncos", rowIdentifier: "team-row-broncos", switcher: switcher, app: app)
        let defenseTab = app.buttons["unit-tab-defense"]
        XCTAssertTrue(
            defenseTab.waitForExistence(timeout: 15), "the unit tab bar should offer Defense")
        defenseTab.tap()
        XCTAssertTrue(
            waitForFilledSlot(in: app),
            "the defense should render at least one filled slot before capture"
        )
        attachScreenshot(name: "02-depth-chart-defense")

        // 3. Player profile — the jersey-header + season-ledger destination reached by tapping a
        // filled field slot with the unit on Offense; the current team is still the Broncos
        // from the defense shot above. The starting QB is a deterministic, stat-rich
        // subject (`player-slot-off-qb-0` is the identifier AccessibilityUITests already
        // uses), so the ledger has real content rather than an empty state.
        let offenseTab = app.buttons["unit-tab-offense"]
        XCTAssertTrue(
            offenseTab.waitForExistence(timeout: 15), "the unit tab bar should offer Offense")
        offenseTab.tap()
        let qbSlot = app.buttons["player-slot-off-qb-0"]
        XCTAssertTrue(
            qbSlot.waitForExistence(timeout: 20), "the offense should expose the starting QB slot")
        qbSlot.tap()
        let profile = element(app, identifier: "player-profile-full-content")
        XCTAssertTrue(
            profile.waitForExistence(timeout: 20),
            "tapping a filled slot should push the player profile")
        attachScreenshot(name: "03-player-profile")
        let backButton = app.navigationBars.buttons["BackButton"]
        XCTAssertTrue(
            backButton.waitForExistence(timeout: 10), "the profile should offer a back button")
        backButton.tap()
        XCTAssertTrue(qbSlot.waitForExistence(timeout: 15), "back should return to the depth chart")

        // 4. Team stats.
        selectTeam(
            named: "Chargers", rowIdentifier: "team-row-chargers", switcher: switcher, app: app)
        let statsTab = app.buttons["page-switcher-stats"]
        XCTAssertTrue(
            statsTab.waitForExistence(timeout: 15), "team detail should expose a Stats page tab")
        statsTab.tap()
        XCTAssertTrue(
            element(app, identifier: "stats-content").waitForExistence(timeout: 20),
            "the stats page should render production content"
        )
        // No season pinning: before week 1 the page opens on the last season with games
        // played rather than the empty current one.
        attachScreenshot(name: "04-team-stats")

        // 5. Postseason ladder — the newest schedule surface. The Rams won a wild-card,
        // divisional and conference round in 2025, so the pinned season has a multi-round run
        // to show. Pin the completed season because the schedule page opens on the current
        // season, which is empty before week 1.
        selectTeam(
            named: "Rams", rowIdentifier: "team-row-rams", switcher: switcher, app: app)
        let scheduleTab = app.buttons["page-switcher-schedule"]
        XCTAssertTrue(
            scheduleTab.waitForExistence(timeout: 15),
            "team detail should expose a Schedule page tab")
        scheduleTab.tap()
        XCTAssertTrue(
            element(app, identifier: "schedule-content").waitForExistence(timeout: 20),
            "the schedule page should render content"
        )
        let scheduleSeasonTrigger = app.buttons["schedule-season-trigger"]
        XCTAssertTrue(
            scheduleSeasonTrigger.waitForExistence(timeout: 10),
            "the schedule should expose a season picker")
        scheduleSeasonTrigger.tap()
        let scheduleSeason = app.buttons["schedule-season-2025"]
        XCTAssertTrue(
            scheduleSeason.waitForExistence(timeout: 10),
            "the schedule season sheet should offer 2025 — bump this year once the current season has data"
        )
        scheduleSeason.tap()
        let playoffsTab = app.buttons["schedule-phase-playoffs"]
        XCTAssertTrue(
            playoffsTab.waitForExistence(timeout: 10), "the schedule should offer a Playoffs phase")
        playoffsTab.tap()
        XCTAssertTrue(
            element(app, identifier: "schedule-playoffs-content").waitForExistence(timeout: 20),
            "the Rams' 2025 postseason run should render the bracket content"
        )
        attachScreenshot(name: "05-postseason")

        // 8. Regular-season schedule for the same pinned team and season.
        let regularTab = app.buttons["schedule-phase-regular"]
        XCTAssertTrue(
            regularTab.waitForExistence(timeout: 10), "the schedule should offer a Regular phase")
        regularTab.tap()
        XCTAssertTrue(
            element(app, identifier: "schedule-content").waitForExistence(timeout: 20),
            "the regular-season schedule should render content"
        )
        attachScreenshot(name: "08-schedule-regular")

        // 6. Compare, on the "By team" (matchup) tab with both slots filled.
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 10), "the app should present a bottom tab bar")
        tabs.buttons["Compare"].tap()
        pickCompareTeam(into: "a", query: "Chiefs", rowIdentifier: "team-row-chiefs", app: app)
        pickCompareTeam(into: "b", query: "Eagles", rowIdentifier: "team-row-eagles", app: app)
        // Select the matchup segment explicitly rather than trusting the default — the
        // capture is only meaningful on "By team".
        let byTeamTab = app.buttons["compare-tab-matchup"]
        XCTAssertTrue(
            byTeamTab.waitForExistence(timeout: 10), "compare should offer the By team segment")
        byTeamTab.tap()
        XCTAssertTrue(
            element(app, identifier: "compare-content").waitForExistence(timeout: 20),
            "compare should render its comparison content once both slots are filled"
        )
        attachScreenshot(name: "06-compare")

        // 7. Uniform archive — the top-level grid, not drilled into a team.
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
        XCTAssertTrue(
            uniformTeam.waitForExistence(timeout: 20),
            "the archive should render at least one team's kits")
        attachScreenshot(name: "07-uniform-archive")

        // 9. A team's uniform detail, drilled in from the archive grid. Pinned to the Bills.
        let billsKits = app.descendants(matching: .any).matching(
            identifier: "uniforms-team-bills"
        ).firstMatch
        XCTAssertTrue(billsKits.waitForExistence(timeout: 10), "the archive should list the Bills")
        billsKits.tap()
        XCTAssertTrue(
            element(app, identifier: "uniform-team-detail").waitForExistence(timeout: 20),
            "tapping a team should push its uniform detail")
        attachScreenshot(name: "09-uniform-team-detail")

        // 10. A single kit's detail sheet for a different team (Packers), so the two uniform
        // shots don't repeat a team. The grid is lazy, so scroll until the row exists.
        app.navigationBars.buttons.firstMatch.tap()
        let packersKits = app.descendants(matching: .any).matching(
            identifier: "uniforms-team-packers"
        ).firstMatch
        var scrolls = 0
        while !packersKits.exists && scrolls < 12 {
            app.swipeUp()
            scrolls += 1
        }
        XCTAssertTrue(
            packersKits.waitForExistence(timeout: 5), "the archive should list the Packers")
        packersKits.tap()
        XCTAssertTrue(
            element(app, identifier: "uniform-team-detail").waitForExistence(timeout: 20),
            "tapping a team should push its uniform detail")
        let kitRow = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'uniform-kit-row-'")
        ).firstMatch
        XCTAssertTrue(kitRow.waitForExistence(timeout: 15), "the team detail should list its kits")
        kitRow.tap()
        XCTAssertTrue(
            element(app, identifier: "uniform-kit-sheet").waitForExistence(timeout: 15),
            "tapping a kit should open its detail sheet")
        attachScreenshot(name: "10-uniform-kit-detail")
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
        XCTAssertTrue(
            searchField.waitForExistence(timeout: 15), "the switcher sheet should offer team search"
        )
        searchField.typeTextAfterFocusing(name, in: app)

        let row = app.buttons[rowIdentifier]
        XCTAssertTrue(
            row.waitForExistence(timeout: 15),
            "searching \"\(name)\" should surface \(rowIdentifier)")
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
        XCTAssertTrue(
            slotButton.waitForExistence(timeout: 15), "the \(slot) compare slot should exist")
        slotButton.tap()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(
            searchField.waitForExistence(timeout: 10), "the picker sheet should offer team search")
        searchField.typeTextAfterFocusing(query, in: app)

        let row = app.buttons[rowIdentifier]
        XCTAssertTrue(
            row.waitForExistence(timeout: 15),
            "searching \"\(query)\" should surface \(rowIdentifier)")
        row.tap()
    }

    /// `XCUIScreen.main.screenshot()` captures the simulator's full physical framebuffer
    /// at native device resolution (no simulator bezel/chrome — that's rendered by the
    /// Simulator.app window, never part of the captured buffer) rather than
    /// `XCUIApplication.screenshot()`, which is scoped to the app's own window frame.
    /// For App Store Connect's exact-pixel-resolution requirement (1284×2778 on the
    /// iPhone 13 Pro Max this test targets — the accepted 6.5-inch display class), the
    /// full-screen API is the one that's guaranteed to match the published requirement.
    private func attachScreenshot(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
