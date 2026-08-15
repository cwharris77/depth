import Foundation

// Mirrors lib/utils/roster/roster.ts — pure roster queries with no dependency on team
// identity, so they work from just a Roster (players + specialTeams).

func getPlayer(in roster: Roster, id: String) -> Player? {
    roster.players.first { $0.id == id }
}

/// Deterministic order: depthRank first, then jersey number as a stable tiebreak
/// (or `order`, when a user override set one). Mirrors byDepthOrder exactly, including
/// operator precedence: the tiebreak only runs when depthRank ties.
func byDepthOrder(_ a: Player, _ b: Player) -> Bool {
    if a.depthRank != b.depthRank {
        return a.depthRank < b.depthRank
    }
    return (a.order ?? a.number) < (b.order ?? b.number)
}

func getPlayers(in roster: Roster, at position: Position) -> [Player] {
    roster.players.filter { $0.position == position }.sorted(by: byDepthOrder)
}
