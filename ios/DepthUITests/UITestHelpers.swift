import XCTest

// Shared navigation helpers for the UI suites. Team selection moved out of the app root
// and into the switcher sheet (2026-08-15 navigation-parity spec), so every journey that
// used to "type in the root search field and tap a row" now goes through the same three
// steps — worth one helper rather than four copies (AGENTS.md mistake #17).
extension XCUIApplication {
    /// The launch chart's first tappable player slot. The unit picker exists as soon as a
    /// snapshot resolves, but a slot is the accurate "chart rendered" signal.
    private var depthChartSlot: XCUIElement {
        buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
    }

    /// Waits for the launch depth chart to actually render a tappable player slot.
    @discardableResult
    func waitForDepthChart(timeout: TimeInterval = 15) -> Bool {
        depthChartSlot.waitForExistence(timeout: timeout)
    }

    /// The same "chart rendered" signal as a single non-blocking read — the shape
    /// `tapUntil`'s condition needs (it does its own polling, so a condition that blocks
    /// for its own timeout would multiply the wait).
    var hasDepthChart: Bool { depthChartSlot.exists }

    /// Launch arg (see DepthApp.swift) that pins the launch destination to a specific
    /// team *after* the UI_TESTING_RESET_STATE clean slate. Lets a journey that only
    /// needs a real team to exercise its own feature skip the cold default-team fetch +
    /// the switcher-search prologue (`selectTeam`) entirely.
    static let uiTestingStartTeamArgPrefix = "UI_TESTING_START_TEAM="

    /// Reset-state launch + start straight into `teamId`'s chart. The collapse of the
    /// old `app.launch(); waitForDepthChart(); selectTeam(teamId, searching:…)`
    /// prologue for journeys that don't need to exercise the switcher itself.
    @discardableResult
    func launch(intoTeam teamId: String, timeout: TimeInterval = 15) -> Bool {
        launchArguments = ["UI_TESTING_RESET_STATE", "\(Self.uiTestingStartTeamArgPrefix)\(teamId)"]
        launch()
        return waitForDepthChart(timeout: timeout)
    }

    /// Opens the switcher from the navigation-bar team name, searches, and selects a
    /// team. Returns once the switcher has dismissed and the header (and chart) have
    /// re-rendered for the *newly selected* team specifically.
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
        searchField.typeTextAfterFocusing(query, in: self)

        let teamRow = buttons["team-row-\(teamId)"]
        // The switcher fetches the 32-team list from production on a fresh launch (no
        // cache with UI_TESTING_RESET_STATE), so the row can lag well past the other
        // waits on a cold run.
        XCTAssertTrue(teamRow.waitForExistence(timeout: 20), "searching \"\(query)\" should surface the \(teamId) row", file: file, line: line)
        teamRow.tap()

        XCTAssertTrue(
            otherElements["team-switcher-sheet"].waitForAbsence(timeout: 10),
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
    /// status/hittable-style predicates), so this is a short manual retry loop.
    @discardableResult
    func waitForLabel(containing substring: String, timeout: TimeInterval = 10) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if label.contains(substring) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return label.contains(substring)
    }

    /// Taps an element only if it becomes reachable (exists + hittable) within `timeout` —
    /// used for best-effort dismissals where the control may or may not be on screen (e.g.
    /// closing a sheet the previous step may not have opened). Returns whether it tapped.
    @discardableResult
    func tapIfExists(timeout: TimeInterval = 3) -> Bool {
        guard waitForExistence(timeout: timeout), isHittable else { return false }
        tap()
        return true
    }

    /// Taps a search field and types into it only once the field has actually taken
    /// keyboard focus. A bare `tap(); typeText(...)` races the sheet's presentation
    /// animation — the tap can land before the field is focusable, so `typeText`
    /// synthesizes into a field with no focus and XCUITest throws "Neither element nor
    /// any descendant has keyboard focus" (flaky under CI load wherever a search field
    /// sits inside a just-presented sheet — team switcher, compare picker).
    /// XCUIElement has no public per-element focus query, so the keyboard's existence is
    /// the proxy: it only appears once some field is actually focused.
    ///
    /// The budget is measured from *after* each `tap()` returns, and that is the whole
    /// point of the loop's shape. The first cut of this helper took one deadline before
    /// tapping, and `tap()` blocks while the app idles: on a loaded runner that call took
    /// 49s against a 10s budget (CI 2026-09-02, AccessibilityXXXL), so the deadline was
    /// already 46s stale when the keyboard was polled — exactly once, immediately after
    /// the tap — and the helper then typed into a still-unfocused field, reproducing the
    /// failure it was written to prevent. A timeout that a slow tap can spend is not a
    /// timeout. When focus never lands, fail with this message rather than typing blindly
    /// into whatever has focus instead.
    func typeTextAfterFocusing(
        _ text: String, in app: XCUIApplication, attempts: Int = 3, timeout: TimeInterval = 15,
        file: StaticString = #filePath, line: UInt = #line
    ) {
        for _ in 1...attempts {
            tap()
            let deadline = Date().addingTimeInterval(timeout)
            repeat {
                if app.keyboards.element.exists {
                    typeText(text)
                    return
                }
                RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            } while Date() < deadline
        }
        XCTFail(
            "the field never took keyboard focus, so \"\(text)\" could not be typed",
            file: file, line: line
        )
    }

    /// Taps, then polls `condition`, re-tapping (up to `attempts` times) when the tap
    /// produced no effect at all.
    ///
    /// A synthesized tap is not guaranteed to register. XCUITest sends touch-down and
    /// touch-up as separate events and waits for the app to idle around them; on a loaded
    /// CI runner that window stretches into tens of seconds (measured: 25-43s between
    /// "Synthesize event" and the following step), long enough for the press to be
    /// cancelled rather than delivered as a tap. The usual `tap()` + `waitForExistence`
    /// pair then polls an *unchanged* screen until it times out, and a longer timeout
    /// cannot help because nothing is in flight — CI 2026-09-03 tapped
    /// `page-switcher-roster`, waited 10s for `depth-chart-overflow`, and the failure
    /// hierarchy still showed SCHEDULE as the selected page. Re-sending the tap is the
    /// only thing that recovers it, so any navigation tap whose whole purpose is to bring
    /// a destination on screen goes through here instead.
    ///
    /// Note this is a *test-harness* workaround, not cover for an app bug: a real touch
    /// sequence from a finger is delivered normally, and the app has never been observed
    /// dropping a page switch outside a synthesized tap under runner load.
    @discardableResult
    func tapUntil(
        attempts: Int = 3, timeout: TimeInterval = 10, _ condition: () -> Bool
    ) -> Bool {
        for _ in 1...attempts {
            tap()
            // Same rule as `typeTextAfterFocusing` above: the deadline starts after the
            // tap, because the tap itself can consume more than the whole budget.
            let deadline = Date().addingTimeInterval(timeout)
            repeat {
                if condition() { return true }
                RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            } while Date() < deadline
        }
        return condition()
    }

    /// Polls until the element no longer exists, or `timeout` elapses. `waitForExistence`
    /// only waits for an element to *appear* — there's no built-in "wait for gone", so a
    /// dismiss check written as `XCTAssertFalse(el.waitForExistence(timeout: 3))` fails
    /// instantly whenever the element still exists at the moment of the call (mid dismiss
    /// animation) instead of giving the animation time to finish.
    @discardableResult
    func waitForAbsence(timeout: TimeInterval = 10) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while exists && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return !exists
    }
}

extension XCUIElementQuery {
    /// Polls until this query matches at least `minimum` elements, or `timeout` elapses,
    /// returning the count actually reached. `count` snapshots the accessibility tree the
    /// instant it's read — right after a sheet's rows start appearing, waiting on
    /// `firstMatch.waitForExistence` can pass while the rest of the list is still
    /// mid-render, so a `count` read on the next line can still observe fewer elements
    /// than the finished layout will settle on (the season-picker sheets' cold-run race).
    @discardableResult
    func waitForCount(atLeast minimum: Int, timeout: TimeInterval = 10) -> Int {
        let deadline = Date().addingTimeInterval(timeout)
        var current = count
        while current < minimum && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            current = count
        }
        return current
    }
}
