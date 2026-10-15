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

    private static let favoriteBills = "UI_TESTING_FAVORITE_TEAM=bills"

    /// A SwiftUI toggle's switch sits at its trailing edge; a tap on the label does not
    /// flip it.
    private func flip(_ toggle: XCUIElement) {
        toggle.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 0.5))
            .withOffset(CGVector(dx: -24, dy: 0)).tap()
    }

    private func waitForValue(_ element: XCUIElement, _ value: String) -> Bool {
        let predicate = NSPredicate(format: "value == %@", value)
        return XCTWaiter.wait(
            for: [XCTNSPredicateExpectation(predicate: predicate, object: element)], timeout: 10)
            == .completed
    }

    func testNotificationsFollowTheFavoriteTeamAndKeepTheChoice() throws {
        let app = launch(
            flagOn: true,
            extraArguments: ["UI_TESTING_NOTIFICATIONS_AUTHORIZED", Self.favoriteBills])
        XCTAssertTrue(app.waitForDepthChart())
        app.openSettings()

        let toggle = app.switches["settings-notifications-toggle"]
        let bigMoments = app.buttons["settings-notifications-tier-big_moments"]
        let everything = app.buttons["settings-notifications-tier-everything"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        XCTAssertTrue(toggle.label.contains("Bills"), "got \"\(toggle.label)\"")
        XCTAssertTrue(waitForValue(toggle, "1"))
        XCTAssertTrue(bigMoments.waitForExistence(timeout: 5))
        XCTAssertTrue(bigMoments.isSelected)
        XCTAssertFalse(
            app.buttons["settings-notifications-team"].exists,
            "notifications have no team of their own")
        attachScreenshot(app, named: "settings-notifications-big-moments")

        // An option has to accept a tap anywhere it is drawn, so tap inside its trailing
        // edge and then inside its leading edge, away from its text.
        everything.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 0.5))
            .withOffset(CGVector(dx: -4, dy: 0)).tap()
        XCTAssertTrue(everything.waitForSelected())
        bigMoments.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.9))
            .withOffset(CGVector(dx: 4, dy: 0)).tap()
        XCTAssertTrue(bigMoments.waitForSelected())
        everything.tap()
        XCTAssertTrue(everything.waitForSelected())
        XCTAssertGreaterThanOrEqual(everything.frame.height, 44)
        attachScreenshot(app, named: "settings-notifications-everything")

        // Off hides the choice; on brings back the level it was at.
        flip(toggle)
        XCTAssertTrue(waitForValue(toggle, "0"))
        XCTAssertTrue(everything.waitForAbsence(timeout: 5))
        XCTAssertTrue(app.staticTexts["settings-notifications-summary"].exists)
        flip(toggle)
        XCTAssertTrue(waitForValue(toggle, "1"))
        XCTAssertTrue(everything.waitForSelected())

        // A new favorite is the team notifications are about.
        let favorite = app.buttons["settings-favorite-team"]
        XCTAssertTrue(favorite.label.contains("Buffalo Bills"), "got \"\(favorite.label)\"")
        favorite.tap()
        let dolphins = app.buttons["team-row-dolphins"]
        XCTAssertTrue(dolphins.waitForExistence(timeout: 10))
        dolphins.tap()
        XCTAssertTrue(favorite.waitForLabel(containing: "Miami Dolphins"))
        XCTAssertTrue(toggle.waitForLabel(containing: "Dolphins"), "got \"\(toggle.label)\"")

        // The choices outlive the sheet and the process.
        app.terminate()
        let relaunched = launch(
            flagOn: true, resettingState: false,
            extraArguments: ["UI_TESTING_NOTIFICATIONS_AUTHORIZED"])
        relaunched.openSettings()
        let restored = relaunched.switches["settings-notifications-toggle"]
        XCTAssertTrue(restored.waitForExistence(timeout: 10))
        XCTAssertTrue(restored.waitForLabel(containing: "Dolphins"), "got \"\(restored.label)\"")
        XCTAssertTrue(
            relaunched.buttons["settings-notifications-tier-everything"].waitForSelected())
    }

    func testNotificationRowsAreHiddenWhenTheFlagIsOff() throws {
        // Even a launch that asks for the prompt gets neither it nor the rows.
        let app = launch(
            flagOn: false, extraArguments: [Self.promptArgument, Self.favoriteBills])
        XCTAssertTrue(app.waitForDepthChart())
        XCTAssertFalse(app.buttons["big-moment-prompt-accept"].waitForExistence(timeout: 3))
        app.openSettings()
        XCTAssertTrue(app.buttons["settings-take-the-tour"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.switches["settings-notifications-toggle"].exists)
        XCTAssertFalse(app.buttons["settings-notifications-choose-favorite"].exists)
        XCTAssertFalse(
            app.buttons["settings-favorite-team"].exists,
            "without the feature a favorite needs an account")
    }

    func testAnUnansweredPermissionReadsOffUntilTurnedOn() throws {
        // No authorized argument: the permission question has never been answered.
        let app = launch(flagOn: true, extraArguments: [Self.favoriteBills])
        XCTAssertTrue(app.waitForDepthChart())
        app.openSettings()

        let toggle = app.switches["settings-notifications-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        XCTAssertTrue(waitForValue(toggle, "0"))
        XCTAssertTrue(app.staticTexts["settings-notifications-summary"].exists)
        XCTAssertFalse(app.buttons["settings-notifications-tier-big_moments"].exists)
        attachScreenshot(app, named: "settings-notifications-unanswered")

        // Turning it on asks for permission. In a UI test nothing grants it, so the rows
        // give way to the one step that fixes a refused permission.
        flip(toggle)
        let systemSettings = app.buttons["settings-notifications-system-settings"]
        XCTAssertTrue(systemSettings.waitForExistence(timeout: 5))
        XCTAssertGreaterThanOrEqual(systemSettings.frame.height, 44)
        XCTAssertTrue(toggle.waitForAbsence(timeout: 5))
        XCTAssertTrue(app.buttons["account-close-button"].isHittable)
        attachScreenshot(app, named: "settings-notifications-denied")
    }

    func testWithoutAFavoriteTheRowsLeadToChoosingOne() throws {
        let app = launch(flagOn: true, extraArguments: ["UI_TESTING_NOTIFICATIONS_AUTHORIZED"])
        XCTAssertTrue(app.waitForDepthChart())
        app.openSettings()

        let choose = app.buttons["settings-notifications-choose-favorite"]
        XCTAssertTrue(choose.waitForExistence(timeout: 10))
        XCTAssertFalse(app.switches["settings-notifications-toggle"].exists)
        XCTAssertTrue(app.buttons["settings-favorite-team"].label.contains("None"))
        attachScreenshot(app, named: "settings-notifications-no-favorite")

        choose.tap()
        let bills = app.buttons["team-row-bills"]
        XCTAssertTrue(bills.waitForExistence(timeout: 10))
        bills.tap()
        let toggle = app.switches["settings-notifications-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        XCTAssertTrue(toggle.label.contains("Bills"), "got \"\(toggle.label)\"")

        // Removing the favorite leaves nothing to notify about.
        app.buttons["settings-favorite-team"].tap()
        let noFavorite = app.buttons["team-picker-no-favorite"]
        XCTAssertTrue(noFavorite.waitForExistence(timeout: 10))
        noFavorite.tap()
        XCTAssertTrue(choose.waitForExistence(timeout: 5))
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
