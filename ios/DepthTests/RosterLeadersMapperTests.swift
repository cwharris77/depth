import Testing
@testable import Depth

// RosterLeadersMapper merges the two roster-leaders projections (players, player_stats)
// into LeaderEntry by player_id, resolving names from the separate players read.

@Test func rosterLeadersMapperResolvesNamesFromThePlayersProjection() {
    let players = [
        RosterLeaderPlayerDTO(id: "qb1", name: "S. Darnold"),
        RosterLeaderPlayerDTO(id: "rb1", name: "K. Walker III"),
    ]
    let stats = [
        RosterLeaderStatsDTO(
            playerId: "qb1", season: 2026, completions: 312, attempts: 478,
            passingYards: 3624, passingTds: 26, carries: nil, rushingYards: nil,
            rushingTds: nil, receptions: nil, receivingYards: nil, receivingTds: nil
        ),
        RosterLeaderStatsDTO(
            playerId: "rb1", season: 2026, completions: nil, attempts: nil,
            passingYards: nil, passingTds: nil, carries: 223, rushingYards: 1041,
            rushingTds: 9, receptions: nil, receivingYards: nil, receivingTds: nil
        ),
    ]

    let entries = RosterLeadersMapper.map(players: players, stats: stats)

    #expect(entries.count == 2)
    #expect(entries.first { $0.playerId == "qb1" }?.name == "S. Darnold")
    #expect(entries.first { $0.playerId == "qb1" }?.stats.passingYards == 3624)
    #expect(entries.first { $0.playerId == "rb1" }?.name == "K. Walker III")
    #expect(entries.first { $0.playerId == "rb1" }?.stats.rushingYards == 1041)
}

/// A stats row for a player_id absent from the players projection (shouldn't happen,
/// FK-enforced, but the remote read is untrusted per invariant 6) degrades to an empty
/// name rather than dropping the row or crashing — same skip-don't-throw posture as
/// the rest of the repo.
@Test func rosterLeadersMapperDegradesToEmptyNameForAnUnmatchedPlayerId() {
    let entries = RosterLeadersMapper.map(
        players: [],
        stats: [
            RosterLeaderStatsDTO(
                playerId: "ghost", season: 2026, completions: nil, attempts: nil,
                passingYards: 500, passingTds: nil, carries: nil, rushingYards: nil,
                rushingTds: nil, receptions: nil, receivingYards: nil, receivingTds: nil
            )
        ]
    )

    #expect(entries.count == 1)
    #expect(entries.first?.name == "")
}
