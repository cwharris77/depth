import XCTest

// Shared navigation helpers for the UI suites. Team selection moved out of the app root
// and into the switcher sheet (2026-08-15 navigation-parity spec), so every journey that
// used to "type in the root search field and tap a row" now goes through the same three
// steps — worth one helper rather than four copies (AGENTS.md mistake #17).
extension XCUIApplication {
    /// Waits for the launch depth chart to actually render a tappable player slot.
    /// The unit picker exists as soon as a snapshot resolves, but a slot is the accurate
    /// "chart rendered" signal.
    @discardableResult
    func waitForDepthChart(timeout: TimeInterval = 15) -> Bool {
        buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'"))
            .firstMatch
            .waitForExistence(timeout: timeout)
    }

    /// Opens the switcher from the navigation-bar team name, searches, and selects a
    /// team. Returns once the switcher has dismissed and the chart has re-rendered.
    func selectTeam(_ teamId: String, searching query: String, file: StaticString = #filePath, line: UInt = #line) {
        let switcher = buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the depth chart header should expose the team switcher", file: file, line: line)
        switcher.tap()

        let searchField = searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "the switcher sheet should offer team search", file: file, line: line)
        searchField.tap()
        searchField.typeText(query)

        let teamRow = buttons["team-row-\(teamId)"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 10), "searching \"\(query)\" should surface the \(teamId) row", file: file, line: line)
        teamRow.tap()

        XCTAssertFalse(
            otherElements["team-switcher-sheet"].waitForExistence(timeout: 3),
            "selecting a team should dismiss the switcher", file: file, line: line
        )
        XCTAssertTrue(waitForDepthChart(), "the chart should render for the newly selected team", file: file, line: line)
    }
}
