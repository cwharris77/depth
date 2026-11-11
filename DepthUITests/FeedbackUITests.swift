import XCTest

final class FeedbackUITests: XCTestCase {
    @MainActor

    func testSignedOutFanCanPrepareFeedback() {
        let app = XCUIApplication()
        app.launchArguments =
            XCUIApplication.hermeticLaunchArguments
            + ["-featureFlag.feedbackReports", "YES"]
        app.launch()
        app.openSettings()
        app.buttons["Send Feedback"].tap()

        let message = app.descendants(matching: .any)["feedback-message"]
        XCTAssertTrue(message.waitForExistence(timeout: 10))
        message.tap()
        message.typeText("I found my team.")
        let openDraft = app.buttons["Open Email Draft"]
        if !openDraft.isHittable { app.swipeUp() }
        XCTAssertTrue(openDraft.isEnabled)
    }
}
