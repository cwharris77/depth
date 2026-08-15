import XCTest

final class AuthUITests: XCTestCase {
    @MainActor
    func testAnonymousUserCanOpenNativeSignIn() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        let settingsButton = app.buttons["settings-button"]
        XCTAssertTrue(
            settingsButton.waitForExistence(timeout: 10),
            "settings should be reachable from the team list"
        )
        settingsButton.tap()

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
        XCTAssertTrue(app.staticTexts["settings-data-explanation"].waitForExistence(timeout: 10))

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
