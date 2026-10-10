import XCTest

// The notification control in Settings and the one-time prompt, on the fixture backend.
// A UI-test process never reaches the system permission dialog or registers a device, so
// these cover the app's own surfaces only.
@MainActor
final class NotificationSettingsUITests: XCTestCase {
    private static let promptArgument = "UI_TESTING_BIG_MOMENT_PROMPT"

    override func setUp() {
        continueAfterFailure = false
    }

    private func launch(
        flagOn: Bool, resettingState: Bool = true, extraArguments: [String] = []
    ) -> XCUIApplication {
        let app = XCUIApplication()
        let base =
            resettingState
            ? XCUIApplication.hermeticLaunchArguments + ["UI_TESTING_START_TEAM=bills"]
            : XCUIApplication.hermeticRelaunchArguments
        app.launchArguments =
            base + extraArguments + ["-featureFlag.proactiveNotifications", flagOn ? "YES" : "NO"]
        app.launch()
        return app
    }

    private func attachScreenshot(_ app: XCUIApplication, named name: String) {
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testNotificationControlOffersThreeValuesAndKeepsTheChoice() throws {
        let app = launch(flagOn: true, extraArguments: ["UI_TESTING_NOTIFICATIONS_AUTHORIZED"])
        XCTAssertTrue(app.waitForDepthChart())
        app.openSettings()

        let tier = app.buttons["settings-notifications-tier"]
        let team = app.buttons["settings-notifications-team"]
        XCTAssertTrue(tier.waitForExistence(timeout: 10))
        XCTAssertTrue(tier.label.contains("Big moments"), "got \"\(tier.label)\"")
        // Until a team is chosen the control shows the one that would be adopted.
        XCTAssertTrue(team.waitForLabel(containing: "Buffalo Bills"), "got \"\(team.label)\"")
        XCTAssertGreaterThanOrEqual(tier.frame.height, 44)
        XCTAssertGreaterThanOrEqual(team.frame.height, 44)
        attachScreenshot(app, named: "settings-notifications-big-moments")

        tier.tap()
        for title in ["Big moments", "Everything", "Off"] {
            XCTAssertTrue(app.buttons[title].waitForExistence(timeout: 5), title)
        }
        app.buttons["Off"].tap()
        XCTAssertTrue(tier.waitForLabel(containing: "Off"), "got \"\(tier.label)\"")
        XCTAssertTrue(team.waitForAbsence(timeout: 5), "Off has no team to choose")

        // The row has to accept a tap anywhere it is drawn, so tap in the gutter between
        // the card's edge and the row's icon, where there is no text or glyph.
        let card = app.buttons["settings-notifications-system-settings"].frame
        XCTAssertEqual(tier.frame.minX, card.minX, accuracy: 1, "the row should span the card")
        XCTAssertEqual(tier.frame.maxX, card.maxX, accuracy: 1, "the row should span the card")
        tier.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5))
            .withOffset(CGVector(dx: 4, dy: 0)).tap()
        XCTAssertTrue(app.buttons["Everything"].waitForExistence(timeout: 5))
        app.buttons["Everything"].tap()
        XCTAssertTrue(tier.waitForLabel(containing: "Everything"), "got \"\(tier.label)\"")
        XCTAssertTrue(team.waitForExistence(timeout: 5))

        team.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 0.5))
            .withOffset(CGVector(dx: -4, dy: 0)).tap()
        XCTAssertTrue(app.buttons["Chicago Bears"].waitForExistence(timeout: 5))
        app.buttons["Chicago Bears"].tap()
        XCTAssertTrue(team.waitForLabel(containing: "Chicago Bears"), "got \"\(team.label)\"")

        let systemSettings = app.buttons["settings-notifications-system-settings"]
        XCTAssertTrue(systemSettings.exists)
        XCTAssertGreaterThanOrEqual(systemSettings.frame.height, 44)
        XCTAssertFalse(
            app.staticTexts["settings-notifications-denied"].exists,
            "an allowed device should not be told notifications are off")
        attachScreenshot(app, named: "settings-notifications-everything")

        // The choice outlives the sheet and the process.
        app.terminate()
        let relaunched = launch(
            flagOn: true, resettingState: false,
            extraArguments: ["UI_TESTING_NOTIFICATIONS_AUTHORIZED"])
        XCTAssertTrue(relaunched.waitForDepthChart())
        relaunched.openSettings()
        let restoredTier = relaunched.buttons["settings-notifications-tier"]
        XCTAssertTrue(restoredTier.waitForExistence(timeout: 10))
        XCTAssertTrue(restoredTier.label.contains("Everything"), "got \"\(restoredTier.label)\"")
        XCTAssertTrue(
            relaunched.buttons["settings-notifications-team"]
                .waitForLabel(containing: "Chicago Bears"))
    }

    func testNotificationControlIsHiddenWhenTheFlagIsOff() throws {
        // Even a launch that asks for the prompt gets neither it nor the control.
        let app = launch(flagOn: false, extraArguments: [Self.promptArgument])
        XCTAssertTrue(app.waitForDepthChart())
        XCTAssertFalse(app.buttons["big-moment-prompt-accept"].waitForExistence(timeout: 3))
        app.openSettings()
        XCTAssertTrue(app.buttons["settings-take-the-tour"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["settings-notifications-tier"].exists)
        XCTAssertFalse(app.buttons["settings-notifications-system-settings"].exists)
    }

    func testAnUnansweredPermissionReadsOffUntilATierIsPicked() throws {
        // No authorized argument: the permission question has never been answered.
        let app = launch(flagOn: true)
        XCTAssertTrue(app.waitForDepthChart())
        app.openSettings()

        let tier = app.buttons["settings-notifications-tier"]
        let team = app.buttons["settings-notifications-team"]
        XCTAssertTrue(tier.waitForExistence(timeout: 10))
        XCTAssertTrue(tier.label.contains("Off"), "got \"\(tier.label)\"")
        XCTAssertFalse(tier.label.contains("Big moments"), "got \"\(tier.label)\"")
        XCTAssertFalse(team.exists, "nothing is on, so there is no team to choose")
        let summary = app.staticTexts["settings-notifications-summary"]
        XCTAssertEqual(summary.label, "Choose what you want to hear about your team.")
        attachScreenshot(app, named: "settings-notifications-unanswered")

        // Picking a tier asks for permission. In a UI test nothing grants it, so the
        // row lands on the chosen tier with the note that the system has it switched off.
        tier.tap()
        XCTAssertTrue(app.buttons["Big moments"].waitForExistence(timeout: 5))
        app.buttons["Big moments"].tap()
        XCTAssertTrue(tier.waitForLabel(containing: "Big moments"), "got \"\(tier.label)\"")
        XCTAssertTrue(app.staticTexts["settings-notifications-denied"].waitForExistence(timeout: 5))
        XCTAssertTrue(team.waitForLabel(containing: "Buffalo Bills"), "got \"\(team.label)\"")
        XCTAssertTrue(app.buttons["account-close-button"].isHittable)
        attachScreenshot(app, named: "settings-notifications-denied")
    }

    private func waitForPrompt(in app: XCUIApplication) -> XCUIElement {
        let accept = app.buttons["big-moment-prompt-accept"]
        XCTAssertTrue(accept.waitForExistence(timeout: 20), "the prompt should appear")
        XCTAssertTrue(
            app.descendants(matching: .any)["big-moment-prompt-event"].exists,
            "the prompt should show the event it is about")
        return accept
    }

    func testDecliningTheBigMomentPromptDismissesItForGood() throws {
        let app = launch(flagOn: true, extraArguments: [Self.promptArgument])
        let accept = waitForPrompt(in: app)
        attachScreenshot(app, named: "big-moment-prompt")

        // The padded row, not just its text, must accept the tap.
        app.buttons["big-moment-prompt-decline"]
            .coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5)).tap()
        XCTAssertTrue(accept.waitForAbsence(timeout: 10), "declining should dismiss the prompt")

        app.terminate()
        let relaunched = launch(
            flagOn: true, resettingState: false, extraArguments: [Self.promptArgument])
        XCTAssertTrue(relaunched.waitForDepthChart())
        XCTAssertFalse(
            relaunched.buttons["big-moment-prompt-accept"].waitForExistence(timeout: 5),
            "an answered prompt should never come back")
    }

    func testAPromptLeftUnansweredWhenTheAppIsKilledDoesNotComeBack() throws {
        let app = launch(flagOn: true, extraArguments: [Self.promptArgument])
        _ = waitForPrompt(in: app)
        app.terminate()

        let relaunched = launch(
            flagOn: true, resettingState: false, extraArguments: [Self.promptArgument])
        XCTAssertTrue(relaunched.waitForDepthChart())
        XCTAssertFalse(
            relaunched.buttons["big-moment-prompt-accept"].waitForExistence(timeout: 5),
            "the prompt is shown once, answered or not")
    }

    func testNoPromptAppearsUnlessAJourneyAsksForIt() throws {
        // The first launch only prepares stored state: a returning user who has never
        // seen the prompt. The flag is off, so it cannot show the prompt itself.
        let prepared = launch(flagOn: false, extraArguments: [Self.promptArgument])
        XCTAssertTrue(prepared.waitForDepthChart())
        prepared.terminate()

        // Flag on, permission unanswered, but no request for the prompt.
        let app = launch(flagOn: true, resettingState: false)
        XCTAssertTrue(app.waitForDepthChart())
        XCTAssertFalse(
            app.buttons["big-moment-prompt-accept"].waitForExistence(timeout: 5),
            "a UI-test launch that did not ask for the prompt must not see it")
        app.terminate()

        // The same stored state does show it once a launch asks, so the launch above
        // was held back by the missing request and by nothing else.
        let asking = launch(
            flagOn: true, resettingState: false, extraArguments: [Self.promptArgument])
        _ = waitForPrompt(in: asking)
    }
}
