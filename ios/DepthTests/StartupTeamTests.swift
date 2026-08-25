import Testing
@testable import Depth

// Startup resolution is the one piece of launch behavior with a branch worth testing
// (spec's Testing section: "lastTeamId valid → that team; missing → default;
// stale/unknown id → default", malformed case included). DEP-319 adds the favorite tier
// (favorite → last-viewed → default) honoring startOnFavorite.

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

// MARK: - DEP-319 favorite tier (web resolveStartupTeam parity: favorite → last → default)

@Test func favoriteBeatsLastViewedWhenStartOnFavoriteIsOn() {
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: "chiefs",
            startOnFavorite: true,
            lastTeamId: "bills",
            validIds: ["bills", "chiefs", "seahawks"]
        ) == "chiefs"
    )
}

@Test func favoriteIsIgnoredWhenStartOnFavoriteIsOff() {
    // start_on_favorite == false falls through to last-viewed like a user with no
    // favorite (web's home-team.ts: `settings?.startOnFavorite && favorite`).
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: "chiefs",
            startOnFavorite: false,
            lastTeamId: "bills",
            validIds: ["bills", "chiefs", "seahawks"]
        ) == "bills"
    )
}

@Test func startOnFavoriteDefaultsOffWithoutAFavorite() {
    // No favorite at all — the toggle is irrelevant; last-viewed still wins.
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: nil,
            startOnFavorite: true,
            lastTeamId: "bills",
            validIds: ["bills", "chiefs"]
        ) == "bills"
    )
}

@Test func favoriteFallsBackToLastViewedWhenTeamIsStale() {
    // Favorite names a team that no longer exists — corrupt/stale id degrades to
    // last-viewed, never errors (AGENTS.md invariant 6).
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: "oilers",
            startOnFavorite: true,
            lastTeamId: "bills",
            validIds: ["bills", "chiefs"]
        ) == "bills"
    )
}

@Test func favoriteIgnoredWhenValidIdsEmpty() {
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: "chiefs",
            startOnFavorite: true,
            lastTeamId: nil,
            validIds: []
        ) == StartupTeam.defaultTeamId
    )
}

@Test func favoriteTrimsWhitespaceAndIsValidated() {
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: " chiefs ",
            startOnFavorite: true,
            lastTeamId: "bills",
            validIds: ["bills", "chiefs"]
        ) == "chiefs"
    )
}

@Test func favoriteWinsOverLastViewedWithoutValidatedList() {
    // Optimistic launch path: no team list yet, favorite is set and opted in — it wins
    // immediately without waiting for the list round-trip.
    #expect(
        StartupTeam.resolve(
            favoriteTeamId: "chiefs",
            startOnFavorite: true,
            lastTeamId: "bills"
        ) == "chiefs"
    )
}
