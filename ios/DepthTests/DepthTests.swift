import Testing
@testable import Depth

@Test func appLaunches() {
    #expect(true)
}

@Test func teamSearchSeparatorsAppearOnlyBetweenResults() {
    #expect(TeamSearchRowPresentation.showsSeparator(after: 0, count: 2))
    #expect(!TeamSearchRowPresentation.showsSeparator(after: 1, count: 2))
    #expect(!TeamSearchRowPresentation.showsSeparator(after: 0, count: 1))
}
