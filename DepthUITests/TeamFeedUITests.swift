import XCTest

// The team feed and the routes into it. All run on the fixture backend, whose
// events per team reach each kind of destination.
@MainActor
final class TeamFeedUITests: XCTestCase {
    private let flagOn = ["-featureFlag.proactiveNotifications", "YES"]
    override func setUp() {
        continueAfterFailure = false
    }

    private func launch(_ extra: [String] = [], flag: Bool = true) -> XCUIApplication {
        let app = XCUIApplication()
        let team =
            extra.contains(where: { $0.hasPrefix("UI_TESTING_START_TEAM=") })
            ? [] : ["UI_TESTING_START_TEAM=bills"]
        app.launchArguments =
            XCUIApplication.hermeticLaunchArguments + team
            + (flag ? flagOn : ["-featureFlag.proactiveNotifications", "NO"]) + extra
        app.launch()
        return app
    }

    func testTheFeedButtonIsAbsentWhileTheFeatureIsOff() {
        let app = launch(
            [
                "UI_TESTING_ROUTE_TEAM=bills", "UI_TESTING_ROUTE_EVENT=fixture-event-starter",
            ], flag: false)
        XCTAssertTrue(app.waitForDepthChart())
        XCTAssertFalse(app.buttons["team-feed-button"].exists)
        XCTAssertFalse(app.descendants(matching: .any)["team-event-card"].exists)
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 0)
    }

    func testTurningTheFlagOffRemovesAnOpenEvent() {
        let app = launch([
            "UI_TESTING_ROUTE_TEAM=bills", "UI_TESTING_ROUTE_EVENT=fixture-event-starter",
        ])
        XCTAssertTrue(
            app.descendants(matching: .any)["team-event-card"].waitForExistence(timeout: 15))
        app.openSettings()
        let flags = app.buttons["settings-feature-flags"]
        for _ in 0..<8 where !flags.isHittable { app.swipeUp() }
        XCTAssertTrue(flags.isHittable)
        flags.tap()
        let toggle = app.switches["feature-flag-proactiveNotifications"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        toggle.tap()
        app.buttons["feature-flags-close"].tap()
        app.buttons["Close"].tap()
        XCTAssertTrue(app.waitForDepthChart())
        XCTAssertFalse(app.buttons["team-feed-button"].exists)
        XCTAssertFalse(app.descendants(matching: .any)["team-event-card"].exists)
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 0)
    }

    func testTheFeedListsTheTeamsEvents() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-row-fixture-event-starter"]
                .waitForExistence(timeout: 10))
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-row-fixture-event-historic"].exists)
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-row-fixture-event-departed"].exists)
        keepScreenshot(app, name: "team-feed")
        let captions = app.staticTexts.matching(
            NSPredicate(format: "label BEGINSWITH 'ESPN transactions · '"))
        XCTAssertEqual(captions.count, 1, "the source is shown together with its date")
    }

    func testAStarterChangeRowOpensTheChartWithThePlayerMarked() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        let row = app.buttons["team-feed-row-fixture-event-starter"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5)).tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-event-card"].waitForExistence(timeout: 10))
        let marked = app.buttons.matching(NSPredicate(format: "value == 'New starter'"))
        XCTAssertEqual(marked.count, 1)
        keepScreenshot(app, name: "starter-event-field")
        app.buttons["team-event-card-dismiss"].tap()
        XCTAssertFalse(app.descendants(matching: .any)["team-event-card"].exists)
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 0)
    }

    func testAPlayerEventRowOpensTheProfileWithTheEventOnTop() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        let row = app.buttons["team-feed-row-fixture-event-historic"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["player-profile-full-content"]
                .waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["team-event-card"].exists)
        keepScreenshot(app, name: "event-player-profile")
    }

    func testAnEventForADepartedPlayerIsNotAButton() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-row-fixture-event-departed"]
                .waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["team-feed-row-fixture-event-departed"].exists)
    }

    func testAColdLaunchForOneEventOpensItsDestination() {
        let app = launch([
            "UI_TESTING_ROUTE_TEAM=bills", "UI_TESTING_ROUTE_EVENT=fixture-event-starter",
        ])
        XCTAssertTrue(
            app.buttons["team-switcher-button"].waitForLabel(containing: "Buffalo Bills"))
        XCTAssertTrue(
            app.descendants(matching: .any)["team-event-card"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 1)
    }

    func testAColdNotificationResumesAfterTheTeamLoadIsRetried() {
        let app = launch([
            "UI_TESTING_TEAM_OFFLINE_ONCE", "UI_TESTING_ROUTE_TEAM=bills",
            "UI_TESTING_ROUTE_EVENT=fixture-event-starter",
        ])
        XCTAssertTrue(app.buttons["Retry"].waitForExistence(timeout: 15))
        app.buttons["Retry"].tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-event-card"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 1)
    }

    func testAColdLaunchForAnEventThatIsGoneOpensTheFeed() {
        let app = launch([
            "UI_TESTING_ROUTE_TEAM=bills", "UI_TESTING_ROUTE_EVENT=no-such-event",
        ])
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-list"].waitForExistence(timeout: 15))
    }

    func testAColdLaunchForSeveralEventsOpensTheFeed() {
        let app = launch(["UI_TESTING_ROUTE_TEAM=bills", "UI_TESTING_ROUTE_FEED"])
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-list"].waitForExistence(timeout: 15))
    }

    func testTheNavBarFitsTheLongestFixtureTeamNameAndBothButtons() {
        let app = launch(["UI_TESTING_START_TEAM=seahawks"])
        XCTAssertTrue(app.waitForDepthChart())
        let pill = app.buttons["team-switcher-button"]
        XCTAssertTrue(pill.label.contains("Seattle Seahawks"))
        let feed = app.buttons["team-feed-button"]
        let account = app.buttons["account-button"]
        keepScreenshot(app, name: "long-team-navbar")
        XCTAssertTrue(feed.isHittable)
        XCTAssertTrue(account.isHittable)
        // CGRect subtraction can report an exact 44-point edge just below 44.
        XCTAssertGreaterThanOrEqual(feed.frame.width, 44 - 0.001)
        XCTAssertGreaterThanOrEqual(feed.frame.height, 44 - 0.001)
        XCTAssertFalse(pill.frame.intersects(feed.frame))
        XCTAssertFalse(feed.frame.intersects(account.frame))
        XCTAssertGreaterThanOrEqual(pill.frame.minX, 0)
        XCTAssertLessThanOrEqual(account.frame.maxX, app.frame.maxX)
        feed.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-list"].waitForExistence(timeout: 10))
    }

    func testTheBellIsMarkedUntilTheFeedIsOpened() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        let bell = app.buttons["team-feed-button"]
        let unread = NSPredicate(format: "value == %@", "New")
        expectation(for: unread, evaluatedWith: bell)
        waitForExpectations(timeout: 10)
        bell.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5)).tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-list"].waitForExistence(timeout: 10))
        app.buttons["Close"].tap()
        expectation(for: NSPredicate(format: "value == %@", ""), evaluatedWith: bell)
        waitForExpectations(timeout: 10)
    }

    func testTheTeamSwitcherAcceptsBothEdgesOfItsVerticalPadding() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        let pill = app.buttons["team-switcher-button"]
        for edge in [0.05, 0.95] {
            pill.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: edge)).tap()
            XCTAssertTrue(app.staticTexts["Teams"].waitForExistence(timeout: 10))
            app.buttons["Close"].tap()
            XCTAssertTrue(pill.waitForExistence(timeout: 10))
        }
    }

    func testTheMarkStaysClearedAfterARelaunch() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-list"].waitForExistence(timeout: 10))
        app.terminate()
        app.launchArguments = XCUIApplication.hermeticRelaunchArguments + flagOn
        app.launch()
        XCTAssertTrue(app.waitForDepthChart())
        let bell = app.buttons["team-feed-button"]
        XCTAssertTrue(bell.waitForExistence(timeout: 10))
        expectation(for: NSPredicate(format: "value == %@", ""), evaluatedWith: bell)
        waitForExpectations(timeout: 10)
    }

    private func keepScreenshot(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testAFeedEventReturnsFromHistoricalSeasonToTheLiveField() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["depth-chart-overflow"].tap()
        app.buttons["history-destination"].tap()
        let season = app.buttons["history-season-2025"]
        XCTAssertTrue(season.waitForExistence(timeout: 10))
        season.tap()
        XCTAssertTrue(app.buttons["roster-history-season-trigger"].waitForExistence(timeout: 15))
        app.buttons["team-feed-button"].tap()
        let row = app.buttons["team-feed-row-fixture-event-starter"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-event-card"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 1)
    }

    func testTheEmptyFeedShowsItsMessage() {
        let app = launch(["UI_TESTING_FEED_EMPTY"])
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-empty"].waitForExistence(timeout: 10))
        keepScreenshot(app, name: "empty-team-feed")
    }
    func testTheOfflineFeedOffersRetry() {
        let app = launch(["UI_TESTING_FEED_OFFLINE"])
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        XCTAssertTrue(app.buttons["team-feed-retry"].waitForExistence(timeout: 10))
        app.buttons["team-feed-retry"].tap()
        XCTAssertTrue(app.buttons["team-feed-retry"].waitForExistence(timeout: 10))
    }
    func testARecordChaseShowsProgressOnThePlayer() {
        let app = launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.buttons["team-feed-button"].tap()
        let row = app.buttons["team-feed-row-fixture-event-chase"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["player-profile-full-content"].waitForExistence(
                timeout: 10))
        XCTAssertTrue(app.progressIndicators["Progress toward the record"].exists)
        keepScreenshot(app, name: "record-chase-profile")
    }

    func testADefensiveStarterIsRingedOnTheLine() {
        let app = launch([
            "UI_TESTING_ROUTE_TEAM=bills", "UI_TESTING_ROUTE_EVENT=fixture-event-defense",
        ])
        XCTAssertTrue(
            app.descendants(matching: .any)["team-event-card"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "value == 'New starter'")).count, 1)
        keepScreenshot(app, name: "defense-starter-event")
    }
    func testTheFeedIsReachableAtAccessibilityTextSize() {
        let app = launch([
            "UI_TESTING_DYNAMIC_TYPE", "accessibility5", "UI_TESTING_START_TEAM=seahawks",
        ])
        XCTAssertTrue(app.waitForDepthChart())
        XCTAssertTrue(app.buttons["team-feed-button"].isHittable)
        XCTAssertTrue(app.buttons["account-button"].isHittable)
        keepScreenshot(app, name: "accessibility-navbar")
        app.buttons["team-feed-button"].tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["team-feed-list"].waitForExistence(timeout: 10))
    }
}
