import Testing
@testable import Depth

// CompareRouteStore is the cross-tab handoff for the schedule page's game-card tap →
// Compare tab jump (DEP-405). `consume()` is the one piece of behavior the tab switch
// depends on: it must return the pending matchup exactly once and clear it, so a re-render
// or a re-appearance can't re-apply a stale request and a second consume can't resurrect one.

@Test @MainActor func compareRouteStoreConsumeReturnsNilWhenNothingRequested() {
    let store = CompareRouteStore()
    #expect(store.consume() == nil)
}

@Test @MainActor func compareRouteStoreRequestConsumesBothTeamIds() {
    let store = CompareRouteStore()
    store.request(teamAId: "bills", teamBId: "seahawks")
    let request = store.consume()
    #expect(request?.teamAId == "bills")
    #expect(request?.teamBId == "seahawks")
}

@Test @MainActor func compareRouteStoreConsumeClearsTheRequestSoASecondConsumeIsEmpty() {
    let store = CompareRouteStore()
    store.request(teamAId: "bills", teamBId: "seahawks")
    _ = store.consume()
    #expect(store.consume() == nil)
}

@Test @MainActor func compareRouteStoreSecondRequestOverwritesAPendingUnconsumedOne() {
    let store = CompareRouteStore()
    store.request(teamAId: "bills", teamBId: "seahawks")
    store.request(teamAId: "rams", teamBId: "eagles")
    let request = store.consume()
    #expect(request?.teamAId == "rams")
    #expect(request?.teamBId == "eagles")
}
