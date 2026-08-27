import Testing
@testable import Depth

// Swift port of lib/__tests__/roster-leaders.test.ts's cases for the pure
// `rosterLeaders` (Domain/RosterLeaders.swift) — the same inputs/expectations as web's
// oracle, so a future edit that drifts from web fails here first.

private func stats(
    season: Int,
    completions: Int? = nil, attempts: Int? = nil, passingYards: Int? = nil, passingTds: Int? = nil,
    carries: Int? = nil, rushingYards: Int? = nil, rushingTds: Int? = nil,
    receptions: Int? = nil, receivingYards: Int? = nil, receivingTds: Int? = nil,
    defTacklesSolo: Int? = nil
) -> PlayerSeasonStats {
    PlayerSeasonStats(
        season: season, seasonType: .regular, teamAbbrev: nil, games: 17,
        completions: completions, attempts: attempts, passingYards: passingYards, passingTds: passingTds,
        passingInterceptions: nil, carries: carries, rushingYards: rushingYards, rushingTds: rushingTds,
        receptions: receptions, targets: nil, receivingYards: receivingYards, receivingTds: receivingTds,
        defTacklesSolo: defTacklesSolo, defSacks: nil, defInterceptions: nil, fgMade: nil, fgAtt: nil
    )
}

private func entry(_ playerId: String, _ name: String, _ stats: PlayerSeasonStats) -> LeaderEntry {
    LeaderEntry(playerId: playerId, name: name, stats: stats)
}

@Test func rosterLeadersReturnsNilForNoEntries() {
    #expect(selectRosterLeaders([]) == nil)
}

@Test func rosterLeadersPicksTopPasserRusherReceiverAndFormatsEachLine() {
    let result = selectRosterLeaders([
        entry("qb1", "S. Darnold", stats(season: 2026, completions: 312, attempts: 478, passingYards: 3624, passingTds: 26)),
        entry("qb2", "S. Howell", stats(season: 2026, completions: 40, attempts: 70, passingYards: 500)),
        entry("rb1", "K. Walker III", stats(season: 2026, carries: 223, rushingYards: 1041, rushingTds: 9)),
        entry("wr1", "J. Smith-Njigba", stats(season: 2026, receptions: 104, receivingYards: 1382, receivingTds: 8)),
    ])

    #expect(
        result
            == RosterLeaders(
                season: 2026,
                passing: Leader(playerId: "qb1", name: "S. Darnold", line: "312/478 · 3,624 yds · 26 TD"),
                rushing: Leader(playerId: "rb1", name: "K. Walker III", line: "223 car · 1,041 yds · 9 TD"),
                receiving: Leader(playerId: "wr1", name: "J. Smith-Njigba", line: "104 rec · 1,382 yds · 8 TD")
            )
    )
}

@Test func rosterLeadersUsesOnlyTheLatestSeasonWhenEntriesSpanMultipleSeasons() {
    let result = selectRosterLeaders([
        entry("qb1", "Old Guy", stats(season: 2024, completions: 400, attempts: 600, passingYards: 5000)),
        entry("qb2", "New Guy", stats(season: 2026, completions: 300, attempts: 450, passingYards: 3200, passingTds: 22)),
    ])

    #expect(result?.season == 2026)
    #expect(result?.passing == Leader(playerId: "qb2", name: "New Guy", line: "300/450 · 3,200 yds · 22 TD"))
}

@Test func rosterLeadersLeavesACategoryNilWhenNoOneHasPositiveYardsInIt() {
    let result = selectRosterLeaders([entry("lb1", "Linebacker", stats(season: 2026, defTacklesSolo: 90))])

    #expect(result == RosterLeaders(season: 2026, passing: nil, rushing: nil, receiving: nil))
}

@Test func rosterLeadersBreaksTiesByKeepingTheFirstEntryWithTheMaxYards() {
    let result = selectRosterLeaders([
        entry("rb1", "First", stats(season: 2026, carries: 200, rushingYards: 1000, rushingTds: 8)),
        entry("rb2", "Second", stats(season: 2026, carries: 210, rushingYards: 1000, rushingTds: 10)),
    ])

    #expect(result?.rushing?.playerId == "rb1")
}
