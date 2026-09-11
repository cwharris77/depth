import Foundation

// Merges the roster-leaders player and stats projections (RosterLeadersDTO) into the
// LeaderEntry list the pure `rosterLeaders` (Domain/RosterLeaders.swift) selects from.
// Mirrors web's getRosterLeaders: player_stats rows carry only a player_id, so names are
// resolved from the separate players read via an in-memory map, never a joined filter.
enum RosterLeadersMapper {
    static func map(
        players: [RosterLeaderPlayerDTO],
        stats: [RosterLeaderStatsDTO]
    ) -> [LeaderEntry] {
        let nameById = Dictionary(players.map { ($0.id, $0.name) }, uniquingKeysWith: { first, _ in first })
        return stats.map { row in
            LeaderEntry(
                playerId: row.playerId,
                name: nameById[row.playerId] ?? "",
                stats: PlayerSeasonStats(
                    season: row.season, seasonType: .regular, teamAbbrev: nil, games: nil,
                    completions: row.completions, attempts: row.attempts,
                    passingYards: row.passingYards, passingTds: row.passingTds,
                    passingInterceptions: nil, carries: row.carries, rushingYards: row.rushingYards,
                    rushingTds: row.rushingTds, receptions: row.receptions,
                    targets: nil, receivingYards: row.receivingYards, receivingTds: row.receivingTds,
                    defTacklesSolo: nil, defSacks: nil, defInterceptions: nil, fgMade: nil, fgAtt: nil,
                    defTackleAssists: nil, defTacklesForLoss: nil, defQbHits: nil,
                    defPassDefended: nil, defFumblesForced: nil, defTds: nil, defSafeties: nil,
                    fumbleRecoveries: nil, fumbleRecoveryTds: nil, puntReturns: nil,
                    puntReturnYards: nil, kickoffReturns: nil, kickoffReturnYards: nil,
                    specialTeamsTds: nil, penalties: nil, penaltyYards: nil, patMade: nil,
                    patAtt: nil, fgLong: nil, offenseSnaps: nil, offensePct: nil, defenseSnaps: nil,
                    defensePct: nil, specialTeamsSnaps: nil, specialTeamsPct: nil
                )
            )
        }
    }
}
