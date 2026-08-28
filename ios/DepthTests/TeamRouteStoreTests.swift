import Testing
@testable import Depth

// TeamRouteStore is the cross-tab handoff for the uniform archive's kit sheet →
// depth chart jump (DEP-329 added the uniform id alongside the pre-existing team id).
// `consume()` is the one piece of behavior this fix actually depends on: it must
// return both pending values exactly once and clear both, so a re-render can't
// re-apply a stale request and a second consume can't resurrect one.

@Test @MainActor func consumeReturnsNilsWhenNothingRequested() {
    let store = TeamRouteStore()
    let result = store.consume()
    #expect(result.teamId == nil)
    #expect(result.uniformId == nil)
}

@Test @MainActor func requestWithoutUniformIdConsumesTeamIdOnly() {
    let store = TeamRouteStore()
    store.request(teamId: "bills")
    let result = store.consume()
    #expect(result.teamId == "bills")
    #expect(result.uniformId == nil)
}

@Test @MainActor func requestWithUniformIdConsumesBoth() {
    let store = TeamRouteStore()
    store.request(teamId: "bills", uniformId: "bills-home-2024")
    let result = store.consume()
    #expect(result.teamId == "bills")
    #expect(result.uniformId == "bills-home-2024")
}

@Test @MainActor func consumeClearsBothFieldsSoASecondConsumeIsEmpty() {
    let store = TeamRouteStore()
    store.request(teamId: "bills", uniformId: "bills-home-2024")
    _ = store.consume()
    let second = store.consume()
    #expect(second.teamId == nil)
    #expect(second.uniformId == nil)
}

@Test @MainActor func aSecondRequestOverwritesAPendingUnconsumedOne() {
    let store = TeamRouteStore()
    store.request(teamId: "bills", uniformId: "bills-home-2024")
    store.request(teamId: "seahawks")
    let result = store.consume()
    #expect(result.teamId == "seahawks")
    #expect(result.uniformId == nil)
}
