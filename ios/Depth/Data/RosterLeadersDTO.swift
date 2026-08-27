import Foundation

// Projection rows for the roster-leaders read (mirrors web's getRosterLeaders in
// lib/roster-source.db.ts): the team's current players (id -> name) and their REG
// player_stats rows for one season, merged in memory by RosterLeadersMapper — never a
// user-input-built PostgREST filter (invariant 8).
struct RosterLeaderPlayerDTO: Decodable {
    let id: String
    let name: String
}

struct RosterLeaderStatsDTO: Decodable {
    let playerId: String
    let season: Int
    let completions: Int?
    let attempts: Int?
    let passingYards: Int?
    let passingTds: Int?
    let carries: Int?
    let rushingYards: Int?
    let rushingTds: Int?
    let receptions: Int?
    let receivingYards: Int?
    let receivingTds: Int?

    enum CodingKeys: String, CodingKey {
        case season, completions, attempts, carries, receptions
        case playerId = "player_id"
        case passingYards = "passing_yards"
        case passingTds = "passing_tds"
        case rushingYards = "rushing_yards"
        case rushingTds = "rushing_tds"
        case receivingYards = "receiving_yards"
        case receivingTds = "receiving_tds"
    }
}
