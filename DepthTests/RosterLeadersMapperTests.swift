import Testing
@testable import Depth

// RosterLeadersMapper merges the two roster-leaders projections (players, player_stats)
// into LeaderEntry by player_id, resolving names from the separate players read.

private func playerDTO(
    id: String, name: String, position: String, status: String? = nil
) -> PlayerDTO {
    PlayerDTO(
        id: id, teamId: "seahawks", name: name, number: 30, position: position, status: status,
        age: 22, college: "Notre Dame", experience: 0, height: "5' 11\"", weight: 203, bio: nil,
        photoUrl: nil)
}

@Test func rosterLeadersMapperResolvesNamesFromThePlayersProjection() {
    let players = [
        playerDTO(id: "qb1", name: "S. Darnold", position: "QB"),
        playerDTO(id: "rb1", name: "K. Walker III", position: "RB"),
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

/// A leader off the depth chart (injured, so absent from the team snapshot) still carries
/// the player its row opens.
@Test func rosterLeadersMapperAttachesThePlayerForAnOffChartLeader() {
    let entries = RosterLeadersMapper.map(
        players: [playerDTO(id: "rb2", name: "J. Price", position: "RB", status: "injured")],
        stats: [
            RosterLeaderStatsDTO(
                playerId: "rb2", season: 2026, completions: nil, attempts: nil,
                passingYards: nil, passingTds: nil, carries: 40, rushingYards: 210,
                rushingTds: 2, receptions: nil, receivingYards: nil, receivingTds: nil
            )
        ]
    )

    let player = entries.first?.player
    #expect(player?.id == "rb2")
    #expect(player?.status == .injured)
    #expect(selectRosterLeaders(entries)?.rushing?.player == player)
}
