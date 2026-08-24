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

@Test func depthChartEditModeTogglesAndContextExitEndsEditing() {
    var mode = DepthChartEditMode()

    #expect(!mode.isActive)
    mode.toggle()
    #expect(mode.isActive)
    mode.toggle()
    #expect(!mode.isActive)

    mode.toggle()
    mode.exitForContextChange()
    #expect(!mode.isActive)
}

@Test func playerDotWiggleRunsOnlyDuringEditingWithoutReduceMotion() {
    #expect(PlayerDotWigglePolicy.motion(isEditing: false, reduceMotion: false, index: 0) == nil)
    #expect(PlayerDotWigglePolicy.motion(isEditing: true, reduceMotion: true, index: 0) == nil)

    let first = PlayerDotWigglePolicy.motion(isEditing: true, reduceMotion: false, index: 0)
    let second = PlayerDotWigglePolicy.motion(isEditing: true, reduceMotion: false, index: 1)

    #expect(first != nil)
    #expect(second != nil)
    #expect(first?.delay != second?.delay)
}
