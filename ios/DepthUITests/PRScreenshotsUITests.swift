import XCTest

// Agent-triggered depth-chart surface capture for "check the PR build" on iOS — the
// native analog of /pr-screenshots on web. An agent (or Cooper) runs this with a
// SCREENSHOT_TARGETS launch argument naming which screens to capture as decision-support
// PNGs (e.g. `field,field-footer,formations` after an attribution layout change), then the
// caller exports the .xcresult attachments and views them — without the agent needing a
// booted Simulator or (on GitHub Actions) any local RAM.
//
// Not part of the default `xcodebuild test` run — excluded via project.yml's scheme
// `skippedTests` exactly like AppStoreScreenshotsUITests. Run explicitly:
//
//   xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
//     -destination 'platform=iOS Simulator,id=<sim-udid>' \
//     -only-testing:DepthUITests/PRScreenshotsUITests \
//     -resultBundlePath /tmp/pr-ios-screenshots.xcresult test
//
// See docs/ios-pr-screenshots.md for the full local workflow and the GitHub Actions
// workflow (`.github/workflows/ios-pr-screenshots.yml`) that packages this into a PR
// comment/artifact.
final class PRScreenshotsUITests: XCTestCase {
    // Same stable fixture team the App Store screenshot sequence walks (see
    // docs/ios-appstore-screenshots.md). Screenshots land on a deterministic team's
    // chart so before/after diffs are meaningful across runs.
    private let teamId = "bills"
    private let teamQuery = "Bills"

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCaptureRequestedScreens() throws {
        let requested = Self.requestedTargets()

        let app = XCUIApplication()
        // Capture targets need a stable chart, not team-switcher coverage. Start on the
        // fixture team via the current deterministic launch path so screenshot runs do
        // not depend on a search field being present after reset (DEP-487).
        XCTAssertTrue(app.launch(intoTeam: teamId), "the Bills chart should launch directly")

        // `field` — the depth chart field surface itself (yard lines, end zones, LOS,
        // hash marks, grass gradient). The field is the chart; capture it after the team
        // re-renders its slots.
        if requested.contains("field") {
            XCTAssertTrue(app.waitForDepthChart(), "the Bills chart should render after direct launch")
            attachScreenshot(name: "field")
        }

        // `formations` — the formations picker scrolled to its final row, proving the
        // attribution follows every formation instead of hovering over the sheet.
        if requested.contains("formations") {
            let overflow = app.buttons["depth-chart-overflow"]
            XCTAssertTrue(overflow.waitForExistence(timeout: 15), "team detail should expose the overflow menu")
            overflow.tap()
            let chooseFormation = app.buttons["choose-formation"]
            XCTAssertTrue(chooseFormation.waitForExistence(timeout: 15), "the overflow menu should expose formations")
            chooseFormation.tap()

            let attribution = app.staticTexts["formations-attribution"]
            for _ in 0..<12 where !isVisible(attribution, in: app) {
                app.swipeUp()
            }
            XCTAssertTrue(isVisible(attribution, in: app), "the attribution should follow every formation row")
            attachScreenshot(name: "formations")

            let done = app.buttons["Done"]
            if done.waitForExistence(timeout: 5) { done.tap() }
        }

        // `field-footer` — the team page scrolled just below the field, showing the
        // attribution in the content stack rather than pinned to the viewport.
        if requested.contains("field-footer") {
            let attribution = app.staticTexts["field-attribution"]
            for _ in 0..<4 where !isVisible(attribution, in: app) {
                app.swipeUp()
            }
            XCTAssertTrue(isVisible(attribution, in: app), "the attribution should appear beneath the field")
            attachScreenshot(name: "field-footer")
        }

        // `teams` — a flat team-search result so separator changes can be reviewed in
        // the surface they affect instead of inferred from an unrelated field capture.
        if requested.contains("teams") {
            let switcher = app.buttons["team-switcher-button"]
            XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the header should expose the team switcher")
            switcher.tap()
            let searchField = app.searchFields.firstMatch
            XCTAssertTrue(searchField.waitForExistence(timeout: 10), "the switcher should offer team search")
            searchField.typeTextAfterFocusing(teamQuery, in: app)
            XCTAssertTrue(app.buttons["team-row-\(teamId)"].waitForExistence(timeout: 20), "team search should surface the Bills row")
            attachScreenshot(name: "teams")
        }

        // `uniform` — the uniform picker sheet. DEP-260 changes the thumbnail corner
        // radius (8→12), so capture the sheet containing the thumbnails. "Choose
        // Uniform" lives inside the ••• overflow menu (DEP-230), so open it first.
        if requested.contains("uniform") {
            let overflow = app.buttons["depth-chart-overflow"]
            XCTAssertTrue(overflow.waitForExistence(timeout: 15), "team detail should expose the overflow menu")
            overflow.tap()
            let chooseUniform = app.buttons["choose-uniform"]
            XCTAssertTrue(chooseUniform.waitForExistence(timeout: 15), "the overflow menu should expose the uniform picker")
            chooseUniform.tap()
            XCTAssertTrue(app.otherElements["uniform-picker-sheet"].waitForExistence(timeout: 10), "the uniform picker sheet should present")
            attachScreenshot(name: "uniform")
            // Dismiss so later captures aren't covered by the sheet.
            let close = app.buttons["Close"]
            if close.waitForExistence(timeout: 5) { close.tap() }
        }

        // `settings` — the Settings sheet in its signed-out state (the only state
        // reachable from the anonymous UI_TESTING_RESET_STATE clean slate every other
        // capture in this file uses).
        if requested.contains("settings") {
            let accountButton = app.buttons["account-button"]
            XCTAssertTrue(accountButton.waitForExistence(timeout: 15), "the header should expose the account button")
            accountButton.tap()
            XCTAssertTrue(app.buttons["Sign In"].waitForExistence(timeout: 15), "the Settings sheet should present its sign-in prompt")
            attachScreenshot(name: "settings")
            let close = app.buttons["account-close-button"]
            if close.waitForExistence(timeout: 5) { close.tap() }
        }

        // `player` — a player detail sheet (opened from a filled depth-chart slot).
        if requested.contains("player") {
            let playerSlot = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
            XCTAssertTrue(playerSlot.waitForExistence(timeout: 15), "at least one filled depth-chart slot should be tappable")
            playerSlot.tap()
            XCTAssertTrue(app.scrollViews["player-profile-content"].waitForExistence(timeout: 10), "player detail should present")
            attachScreenshot(name: "player")
            let close = app.buttons["Close"]
            if close.waitForExistence(timeout: 5) { close.tap() }
        }

        if requested.isEmpty {
            // `field` is the documented default (PRScreenshotsUITests.requestedTargets
            // returns ["field"] for empty/missing input), so this is unreachable — kept
            // as a defensive tripwire in case the default ever changes.
            XCTFail("No recognized PR screenshot target requested — pass SCREENSHOT_TARGETS=field,field-footer,formations,teams,uniform,player")
        }
    }

    /// Resolves the requested screenshot targets from the `SCREENSHOT_TARGETS` scheme
    /// TestAction environment variable (the transport that reliably reaches the runner —
    /// see project.yml's Depth-PRScreenshots note) or a `SCREENSHOT_TARGETS=` launch
    /// argument. Unknown tokens are ignored; empty/missing input falls back to the
    /// documented default `field` so a fresh run never silently captures nothing.
    private static func requestedTargets() -> Set<String> {
        let args = ProcessInfo.processInfo.arguments
        let raw: String
        if let arg = args.first(where: { $0.hasPrefix("SCREENSHOT_TARGETS=") }) {
            raw = String(arg.dropFirst("SCREENSHOT_TARGETS=".count))
        } else {
            raw = ProcessInfo.processInfo.environment["SCREENSHOT_TARGETS"] ?? ""
        }
        let valid: Set<String> = ["field", "field-footer", "formations", "teams", "uniform", "player", "settings"]
        let tokens = raw.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        let requested = Set(tokens).intersection(valid)
        // `field` is the documented default (empty/missing env, or no valid token →
        // field) so a bare `/ios-screenshots` or a runner that fails to forward
        // SCREENSHOT_TARGETS never silently captures nothing.
        if requested.isEmpty { return ["field"] }
        return requested
    }

    /// Same full-framebuffer capture as AppStoreScreenshotsUITests.attachScreenshot —
    /// `XCUIScreen.main.screenshot()` captures the simulator's physical framebuffer at
    /// native resolution (no bezel), guaranteed to match the rendered surface.
    private func attachScreenshot(name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func isVisible(_ element: XCUIElement, in app: XCUIApplication) -> Bool {
        element.exists
            && !element.frame.isEmpty
            && element.frame.intersects(app.windows.firstMatch.frame)
    }
}
