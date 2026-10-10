import XCTest

// Shared navigation helpers for the UI suites. Team selection lives in the switcher sheet, so
// every journey that used to "type in the root search field and tap a row" goes through the same
// three steps — worth one helper rather than four copies.
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

    /// The launch argument that makes `DepthEnvironment.repository` replay the checked-in
    /// fixture bundle instead of Supabase. A suite that must exercise the real backend (AuthUITests,
    /// PerformanceUITests' cache journeys, the bare `testAppLaunches`) simply omits it.
    static let fixtureBackendArgument = "UI_TESTING_FIXTURE_BACKEND"

    /// Marks a launch that otherwise passes no argument as a UI test. The app treats any
    /// `UI_TESTING_` argument as that signal; this one changes nothing else.
    static let liveBackendSmokeArgument = "UI_TESTING_LIVE_SMOKE"

    /// Clean slate + hermetic fixture backend — the standard launch for a journey that
    /// should not depend on a live database.
    static let hermeticLaunchArguments = ["UI_TESTING_RESET_STATE", fixtureBackendArgument]

    /// A relaunch that must *inherit* stored preferences (last-viewed team, saved overrides)
    /// rather than reset them, while still staying on the fixture backend.
    static let hermeticRelaunchArguments = [fixtureBackendArgument]

    /// Reset-state launch + start straight into `teamId`'s chart, on the hermetic fixture
    /// backend. The collapse of the old `app.launch(); waitForDepthChart(); selectTeam(…)`
    /// prologue for journeys that don't need to exercise the switcher itself.
    @discardableResult
    func launch(intoTeam teamId: String, timeout: TimeInterval = 15) -> Bool {
        launchArguments =
            Self.hermeticLaunchArguments + ["\(Self.uiTestingStartTeamArgPrefix)\(teamId)"]
        launch()
        return waitForDepthChart(timeout: timeout)
    }

    /// Opens Settings from the depth chart's account button and waits for the sheet.
    func openSettings(file: StaticString = #filePath, line: UInt = #line) {
        let accountButton = buttons["account-button"]
        XCTAssertTrue(
            accountButton.waitForExistence(timeout: 15),
            "the depth chart should expose the account button", file: file, line: line)
        XCTAssertTrue(
            accountButton.tapUntil { self.buttons["account-close-button"].exists },
            "the account button should open Settings", file: file, line: line)
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
        XCTAssertTrue(
            switcher.waitForExistence(timeout: 15),
            "the depth chart header should expose the team switcher", file: file, line: line)
        switcher.tap()

        let searchField = searchFields.firstMatch
        XCTAssertTrue(
            searchField.waitForExistence(timeout: 10),
            "the switcher sheet should offer team search", file: file, line: line)
        searchField.typeTextAfterFocusing(query, in: self)

        let teamRow = buttons["team-row-\(teamId)"]
        // `typeTextAfterFocusing` has confirmed the field holds the full query, and every
        // caller runs on the fixture backend, so the filtered row is a local render.
        XCTAssertTrue(
            teamRow.waitForExistence(timeout: 15),
            "searching \"\(query)\" should surface the \(teamId) row", file: file, line: line)
        teamRow.tap()

        XCTAssertTrue(
            otherElements["team-switcher-sheet"].waitForAbsence(timeout: 10),
            "selecting a team should dismiss the switcher", file: file, line: line
        )
        XCTAssertTrue(
            switcher.waitForLabel(containing: expectedDisplayName),
            "the switcher button should relabel for \(expectedDisplayName) once the switch completes",
            file: file, line: line
        )
        XCTAssertTrue(
            waitForDepthChart(), "the chart should render for the newly selected team", file: file,
            line: line)
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
    /// point of the loop's shape. Using one deadline for the loop would let a slow tap consume
    /// the timeout before the keyboard is polled, so the helper could type into a still-unfocused
    /// field. The deadline is created immediately after each tap and the field is checked before
    /// typing. When focus never lands, fail with this message rather than typing blindly into
    /// whatever has focus instead.
    ///
    /// Focus alone does not prove the text arrived. On a starved runner `typeText` can deliver
    /// the first keystroke and drop the rest without reporting an error: the switcher then
    /// filters on "S" (every team matches) and a wait for one team's row can never succeed.
    /// So the field's own text is the completion signal, and whatever did not land is
    /// re-entered.
    func typeTextAfterFocusing(
        _ text: String, in app: XCUIApplication, attempts: Int = 3, timeout: TimeInterval = 15,
        file: StaticString = #filePath, line: UInt = #line
    ) {
        for _ in 1...attempts {
            tap()
            let deadline = Date().addingTimeInterval(timeout)
            repeat {
                if app.keyboards.element.exists {
                    let expected = fieldText + text
                    typeText(text)
                    ensureFieldText(expected, attempts: attempts, file: file, line: line)
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

    /// A text field's typed contents. An empty field reports its placeholder as its `value`,
    /// which is read here as no text.
    private var fieldText: String {
        let current = value as? String ?? ""
        return current == placeholderValue ? "" : current
    }

    /// Waits for the focused field to hold exactly `expected`, retyping when it settles on
    /// anything else: the missing suffix when only a prefix landed, otherwise a full clear and
    /// re-entry. Each check waits from after the preceding `typeText` returns, for the same
    /// reason `typeTextAfterFocusing` measures its budget after the tap.
    private func ensureFieldText(
        _ expected: String, attempts: Int, settle: TimeInterval = 5,
        file: StaticString, line: UInt
    ) {
        for retype in 0...attempts {
            let deadline = Date().addingTimeInterval(settle)
            repeat {
                if fieldText == expected { return }
                RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            } while Date() < deadline
            guard retype < attempts else { break }
            let current = fieldText
            if current == expected { return }
            if expected.hasPrefix(current) {
                typeText(String(expected.dropFirst(current.count)))
            } else {
                typeText(
                    String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count)
                        + expected)
            }
        }
        XCTFail(
            "the field holds \"\(fieldText)\" after retyping, expected \"\(expected)\"",
            file: file, line: line
        )
    }

    /// Taps, then polls `condition`, re-tapping (up to `attempts` times) when the tap
    /// produced no effect at all.
    ///
    /// A synthesized tap is not guaranteed to register. XCUITest sends touch-down and
    /// touch-up as separate events and waits for the app to idle around them; on a loaded
    /// runner that window can stretch into tens of seconds between "Synthesize event" and the
    /// following step, long enough for the press to be
    /// cancelled rather than delivered as a tap. The usual `tap()` + `waitForExistence`
    /// pair then polls an *unchanged* screen until it times out, and a longer timeout
    /// cannot help because nothing is in flight. If `page-switcher-roster` was tapped but
    /// `depth-chart-overflow` never appeared, the failure
    /// hierarchy still showed SCHEDULE as the selected page. Re-sending the tap is the
    /// only thing that recovers it, so any navigation tap whose whole purpose is to bring
    /// a destination on screen goes through here instead.
    ///
    /// This is a *test-harness* workaround for synthesized taps under runner load; a real touch
    /// sequence from a finger is delivered normally.
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

    /// Polls until this element is hittable — after a pop, the source it returns to exists
    /// throughout but only accepts taps once the transition settles.
    func waitForHittable(timeout: TimeInterval = 10) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while !(exists && isHittable) && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return exists && isHittable
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
