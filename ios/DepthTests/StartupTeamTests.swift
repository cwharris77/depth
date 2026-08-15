import Testing
@testable import Depth

// Startup resolution is the one piece of launch behavior with a branch worth testing
// (spec's Testing section: "lastTeamId valid → that team; missing → default;
// stale/unknown id → default", malformed case included).
@Test func resolvesToDefaultWhenNoLastTeam() {
    #expect(StartupTeam.resolve(lastTeamId: nil) == StartupTeam.defaultTeamId)
}

@Test func resolvesToLastTeamWhenSetAndUnvalidated() {
    #expect(StartupTeam.resolve(lastTeamId: "bills") == "bills")
}

@Test func resolvesToLastTeamWhenPresentInTheLiveList() {
    #expect(StartupTeam.resolve(lastTeamId: "bills", validIds: ["bills", "seahawks"]) == "bills")
}

@Test func fallsBackToDefaultWhenLastTeamIsNoLongerALiveTeam() {
    #expect(StartupTeam.resolve(lastTeamId: "oilers", validIds: ["bills", "seahawks"]) == "seahawks")
}

@Test func fallsBackToDefaultOnBlankOrWhitespacePreference() {
    #expect(StartupTeam.resolve(lastTeamId: "") == StartupTeam.defaultTeamId)
    #expect(StartupTeam.resolve(lastTeamId: "   ") == StartupTeam.defaultTeamId)
}

@Test func trimsSurroundingWhitespaceBeforeMatching() {
    #expect(StartupTeam.resolve(lastTeamId: " bills ", validIds: ["bills"]) == "bills")
}

@Test func anEmptyLiveListStillYieldsTheDefaultRatherThanAStaleId() {
    #expect(StartupTeam.resolve(lastTeamId: "bills", validIds: []) == StartupTeam.defaultTeamId)
}

@Test func nativeDefaultMatchesTheWebDefaultTeamId() {
    // lib/teams/index.ts's DEFAULT_TEAM_ID — both clients must open the same team for a
    // first-time visitor (spec's Architecture section).
    #expect(StartupTeam.defaultTeamId == "seahawks")
}
