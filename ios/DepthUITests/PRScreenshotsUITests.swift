import XCTest

// Agent-triggered depth-chart surface capture for "check the PR build" on iOS — the
// native analog of /pr-screenshots on web. An agent (or Cooper) runs this with a
// SCREENSHOT_TARGETS launch argument naming which screens to capture as decision-support
// PNGs (e.g. `field,uniform` after a tokenization/radius change like DEP-260), then the
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
    private let teamDisplayName = "Buffalo Bills"

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCaptureRequestedScreens() throws {
        let requested = Self.requestedTargets()

        let app = XCUIApplication()
        // Same clean-slate launch as the other deterministic UI journeys so every
        // capture starts from the same anonymous, no-restored-team state.
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        // The app launches straight into a default team's depth chart
        // (2026-08-15 navigation-parity spec); drive it to the stable Bills chart so
        // captures are deterministic.
        XCTAssertTrue(app.waitForDepthChart(), "app should launch straight into a depth chart")
        app.selectTeam(
            teamId, searching: teamQuery, expectedDisplayName: teamDisplayName,
            file: #filePath, line: #line
        )

        // `field` — the depth chart field surface itself (yard lines, end zones, LOS,
        // hash marks, grass gradient). The field is the chart; capture it after the team
        // re-renders its slots.
        if requested.contains("field") {
            XCTAssertTrue(app.waitForDepthChart(), "the Bills chart should render after team selection")
            attachScreenshot(name: "field")
        }

        // `uniform` — the uniform picker sheet. DEP-260 changes the thumbnail corner
        // radius (8→12), so capture the sheet containing the thumbnails.
        if requested.contains("uniform") {
            let chooseUniform = app.buttons["choose-uniform"]
            XCTAssertTrue(chooseUniform.waitForExistence(timeout: 15), "the chart toolbar should expose the uniform picker")
            chooseUniform.tap()
            XCTAssertTrue(app.otherElements["uniform-picker-sheet"].waitForExistence(timeout: 10), "the uniform picker sheet should present")
            attachScreenshot(name: "uniform")
            // Dismiss so later captures aren't covered by the sheet.
            let close = app.buttons["Close"]
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
            XCTFail("No recognized PR screenshot target requested — pass SCREENSHOT_TARGETS=field,uniform,player")
        }
    }

    /// Resolves the requested screenshot targets from, in order: the
    /// `SCREENSHOT_TARGETS` process-environment variable (the reliable path through
    /// `xcodebuild test`, which propagates the caller's env to the test runner) then a
    /// `SCREENSHOT_TARGETS=` launch argument. Unknown tokens are ignored; empty/missing
    /// input falls back to the documented default `field` so a fresh run never silently
    /// captures nothing.
    private static func requestedTargets() -> Set<String> {
        let args = ProcessInfo.processInfo.arguments
        let raw: String
        if let arg = args.first(where: { $0.hasPrefix("SCREENSHOT_TARGETS=") }) {
            raw = String(arg.dropFirst("SCREENSHOT_TARGETS=".count))
        } else {
            raw = ProcessInfo.processInfo.environment["SCREENSHOT_TARGETS"] ?? ""
        }
        let valid: Set<String> = ["field", "uniform", "player"]
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
}
