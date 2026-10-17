import XCTest

// The Super Bowl round card's spoken result on the hermetic fixture backend. The trophy itself
// is hidden from VoiceOver, so a won title is the only card whose label ends in "champions".
final class SuperBowlResultUITests: XCTestCase {
    private func superBowlCard(
        team: String, season: Int, motionArguments: [String] = ["UI_TESTING_REDUCE_MOTION"]
    ) -> XCUIElement {
        let app = XCUIApplication()
        app.launchArguments =
            XCUIApplication.hermeticLaunchArguments + [
                "\(XCUIApplication.uiTestingStartTeamArgPrefix)\(team)"
            ] + motionArguments
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(timeout: 30))
        app.buttons["page-switcher-schedule"].tap()
        let trigger = app.buttons["schedule-season-trigger"]
        XCTAssertTrue(trigger.waitForExistence(timeout: 20))
        trigger.tap()
        let seasonButton = app.buttons["schedule-season-\(season)"]
        XCTAssertTrue(seasonButton.waitForExistence(timeout: 10))
        seasonButton.tap()
        let playoffs = app.buttons["schedule-phase-playoffs"]
        XCTAssertTrue(playoffs.waitForExistence(timeout: 10))
        playoffs.tap()
        // The ladder's content identifier wins over each card's own, so the card is found by its
        // combined label, which starts with the round title and carries the score after a comma.
        let card = app.staticTexts.matching(
            NSPredicate(format: "label BEGINSWITH 'SUPER BOWL' AND label CONTAINS ','")
        ).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 20))
        return card
    }

    func testWonSuperBowlAnnouncesChampions() {
        continueAfterFailure = false
        let card = superBowlCard(team: "seahawks", season: 2025)
        XCTAssertEqual(card.label, "SUPER BOWL LX, vs NE, W 29-13, FEB 8, champions")
    }

    func testLostSuperBowlDoesNotAnnounceChampions() {
        continueAfterFailure = false
        let card = superBowlCard(team: "bills", season: 2024)
        XCTAssertTrue(card.label.contains("vs PHI"))
        XCTAssertTrue(card.label.contains("L 22-40"))
        XCTAssertFalse(card.label.contains("champions"))
    }

    // The first-view celebration (gradient sweep, confetti, haptic) leaves the same spoken card.
    func testFirstViewCelebrationKeepsTheChampionsLabel() {
        continueAfterFailure = false
        let card = superBowlCard(
            team: "seahawks", season: 2025, motionArguments: ["UI_TESTING_REPLAY_CELEBRATION"])
        let deadline = Date().addingTimeInterval(15)
        while !card.label.hasSuffix("champions") && Date() < deadline {
            Thread.sleep(forTimeInterval: 0.5)
        }
        XCTAssertEqual(card.label, "SUPER BOWL LX, vs NE, W 29-13, FEB 8, champions")
    }
}
