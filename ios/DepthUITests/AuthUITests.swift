import XCTest

final class AuthUITests: XCTestCase {
    @MainActor
    func testAnonymousUserCanOpenNativeSignIn() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")

        // DEP-252: Account moved out of the tab bar into a nav-bar trailing icon that
        // opens the settings content as a sheet.
        let accountButton = app.buttons["account-button"]
        XCTAssertTrue(accountButton.waitForExistence(timeout: 10), "Account should be reachable from the nav bar")
        accountButton.tap()

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
            app.buttons["settings-about-privacy"].waitForExistence(timeout: 10),
            "About should link to the privacy policy (DEP-160 — reachable from within the app)"
        )

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
