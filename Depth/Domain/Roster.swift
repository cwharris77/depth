import Foundation

// Mirrors web/lib/utils/roster/roster.ts — pure roster queries with no dependency on team
// identity, so they work from just a Roster (players + specialTeams + depthChart).

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

/// The roster's seats, falling back to one seat per player when there is no depth chart.
///
/// The fallback is what keeps historical seasons working: roster_history has no
/// depth_chart_entries, so a 2001 roster derives its seats from Player.position and
/// Player.depthRank and preserves the historical one-seat-per-player behavior when seats
/// are absent.
/// Mirrors seatsOf.
func seatsOf(_ roster: Roster) -> [DepthSeat] {
    if let depthChart = roster.depthChart { return depthChart }
    return roster.players.map {
        DepthSeat(position: $0.position, depthRank: $0.depthRank, playerId: $0.id)
    }
}

/// Resolves seats to players, projecting each seat's position and rank onto the athlete
/// who fills it.
///
/// The projection is the point: one athlete can hold two seats (a swing tackle at LT2 and
/// RT1), so the `position`/`depthRank` a caller sees must come from the seat, not from the
/// single canonical pair on the player row. Seats whose player is absent from the roster
/// are skipped rather than faked. Mirrors playersInSeats.
func playersInSeats(in roster: Roster, matching matches: (Position) -> Bool) -> [Player] {
    // Last occurrence wins, matching TS's `new Map(...)`. The mapper already guarantees
    // one row per athlete, so this only decides a tie that cannot occur today -- but the
    // two implementations have to agree by construction, not by luck.
    var byId: [String: Player] = [:]
    for player in roster.players {
        byId[player.id] = player
    }
    var seated: [Player] = []
    for seat in seatsOf(roster) {
        guard matches(seat.position), let player = byId[seat.playerId] else { continue }
        seated.append(player.seated(at: seat.position, depthRank: seat.depthRank))
    }
    return seated.sorted(by: byDepthOrder)
}

func getPlayers(in roster: Roster, at position: Position) -> [Player] {
    playersInSeats(in: roster) { $0 == position }
}
