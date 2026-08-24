import XCTest

final class AuthUITests: XCTestCase {
    @MainActor
    func testAnonymousUserCanOpenNativeSignIn() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        // DEP-252: Account moved out of the tab bar into a nav-bar trailing icon that
        // opens the settings content as a sheet. This journey deliberately waits on the
        // account affordance itself rather than a live roster response; Settings remains
        // reachable when the public-data request is slow or offline. 15s budgets
        // throughout (house standard, see AccessibilityUITests): the first launch on a
        // cold CI simulator warms up slowly and each sheet presentation below adds
        // animation + idle-wait seconds on top of per-query snapshot cost — 2026-08-23/24
        // runs lost here at both sheet boundaries with every query crawling 2-10s.
        let accountButton = app.buttons["account-button"]
        XCTAssertTrue(accountButton.waitForExistence(timeout: 15), "Account should be reachable from the nav bar")
        accountButton.tap()

        let appName = app.staticTexts["settings-about-name"]
        XCTAssertTrue(appName.waitForExistence(timeout: 15), "About should show the app display name")
        XCTAssertTrue(
            appName.label.contains("The Sticks"),
            "About should use the current customer-facing brand"
        )
        let version = app.staticTexts["settings-about-version"]
        XCTAssertTrue(version.waitForExistence(timeout: 15), "About should show the app version")
        XCTAssertFalse(
            version.label.contains("("),
            "About should hide the internal build number from customers"
        )
        XCTAssertTrue(
            app.staticTexts["settings-about-disclaimer"].waitForExistence(timeout: 15),
            "About should show the non-affiliation disclaimer"
        )
        XCTAssertTrue(
            app.buttons["settings-about-privacy"].waitForExistence(timeout: 15),
            "About should link to the privacy policy (DEP-160 — reachable from within the app)"
        )

        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(
            signInButton.waitForExistence(timeout: 15),
            "anonymous settings should offer native sign-in"
        )
        signInButton.tap()

        XCTAssertTrue(
            app.textFields["auth-email"].waitForExistence(timeout: 15),
            "sign-in should present the native email OTP flow"
        )
        XCTAssertTrue(app.buttons["auth-send-code"].waitForExistence(timeout: 15))
    }
}
