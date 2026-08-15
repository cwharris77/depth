import XCTest

final class AuthUITests: XCTestCase {
    @MainActor
    func testAnonymousUserCanOpenNativeSignIn() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")

        let accountTab = app.tabBars.buttons["Account"]
        XCTAssertTrue(accountTab.waitForExistence(timeout: 10), "Account should be reachable from the tab bar")
        accountTab.tap()

        XCTAssertTrue(
            app.staticTexts["settings-about-name"].waitForExistence(timeout: 10),
            "About should show the app display name"
        )
        XCTAssertTrue(
            app.staticTexts["settings-about-version"].waitForExistence(timeout: 10),
            "About should show version/build"
        )
        XCTAssertTrue(
            app.staticTexts["settings-about-disclaimer"].waitForExistence(timeout: 10),
            "About should show the non-affiliation disclaimer"
        )
        XCTAssertTrue(
            app.staticTexts["settings-data-saved-at"].waitForExistence(timeout: 10),
            "Data section should show a saved-on-device timestamp or its fallback"
        )

        // On a small screen (e.g. iPhone SE) the Form's Data section footnote row sits
        // below the fold and is never materialized in the accessibility tree until
        // scrolled into view — no amount of waitForExistence timeout helps an element
        // that was never rendered. Same swipe-retry shape as DepthUITests.swift's
        // season-picker scroll.
        let dataExplanation = app.staticTexts["settings-data-explanation"]
        for _ in 0..<4 where !dataExplanation.exists {
            app.swipeUp()
        }
        XCTAssertTrue(dataExplanation.waitForExistence(timeout: 10))

        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(
            signInButton.waitForExistence(timeout: 10),
            "anonymous settings should offer native sign-in"
        )
        signInButton.tap()

        XCTAssertTrue(
            app.textFields["auth-email"].waitForExistence(timeout: 10),
            "sign-in should present the native email OTP flow"
        )
        XCTAssertTrue(app.buttons["auth-send-code"].waitForExistence(timeout: 10))
    }
}
