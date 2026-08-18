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
    /// team. Returns once the switcher has dismissed and the header (and chart) have
    /// re-rendered for the *newly selected* team specifically.
    ///
    /// `expectedDisplayName` is the team's "<City> <Name>" as it appears in
    /// `TeamDetailView.navigationTitleText` / the `team-switcher-button` accessibility
    /// label (e.g. "Buffalo Bills"). Selecting a team is now a sheet dismiss over the
    /// *previous* team's still-mounted chart rather than a fresh push, so waiting for
    /// "some chart element exists" (`waitForDepthChart()`) can be satisfied instantly by
    /// the outgoing team's own UI — it doesn't prove the new team is on screen. Waiting
    /// for the switcher button's label to contain the new team's name is what proves that.
    func selectTeam(
        _ teamId: String, searching query: String, expectedDisplayName: String,
        file: StaticString = #filePath, line: UInt = #line
    ) {
        let switcher = buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the depth chart header should expose the team switcher", file: file, line: line)
        switcher.tap()

        let searchField = searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "the switcher sheet should offer team search", file: file, line: line)
        searchField.tap()
        searchField.typeText(query)

        let teamRow = buttons["team-row-\(teamId)"]
        // The switcher fetches the 32-team list from production on a fresh launch (no
        // cache with UI_TESTING_RESET_STATE), so the row can lag well past the other
        // waits on a cold run.
        XCTAssertTrue(teamRow.waitForExistence(timeout: 20), "searching \"\(query)\" should surface the \(teamId) row", file: file, line: line)
        teamRow.tap()

        XCTAssertFalse(
            otherElements["team-switcher-sheet"].waitForExistence(timeout: 3),
            "selecting a team should dismiss the switcher", file: file, line: line
        )
        XCTAssertTrue(
            switcher.waitForLabel(containing: expectedDisplayName),
            "the switcher button should relabel for \(expectedDisplayName) once the switch completes", file: file, line: line
        )
        XCTAssertTrue(waitForDepthChart(), "the chart should render for the newly selected team", file: file, line: line)
    }
}

extension XCUIElement {
    /// Polls `label` until it contains `substring` or `timeout` elapses. XCUITest has no
    /// built-in "wait until a property changes" API for plain string properties (only for
    /// existence/hittable-style predicates), so this is a short manual retry loop.
    @discardableResult
    func waitForLabel(containing substring: String, timeout: TimeInterval = 10) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if label.contains(substring) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return label.contains(substring)
    }
}
