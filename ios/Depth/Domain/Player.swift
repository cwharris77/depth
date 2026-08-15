import Foundation

// Mirrors the subset of lib/types.ts's Player that formation resolution touches
// (id/position/depthRank/number/order). Bio/stat/photo fields join this struct when the
// data layer (T4) maps real DTOs — adding them now would be speculative.
struct Player: Codable, Hashable {
    let id: String
    let position: Position
    /// Always 1, 2, or 3 in real data (TS's `1 | 2 | 3` literal union) — kept as Int
    /// here since byDepthOrder does plain arithmetic on it.
    let depthRank: Int
    let number: Int
    /// Set only on players reordered by a user depth override — see lib/utils/depth-
    /// chart/depth-overrides.ts. Undefined (nil) keeps the default jersey-number tiebreak.
    let order: Int?

    init(id: String, position: Position, depthRank: Int, number: Int, order: Int? = nil) {
        self.id = id
        self.position = position
        self.depthRank = depthRank
        self.number = number
        self.order = order
    }
}

// Mirrors lib/types.ts's SpecialSlot. Returners (KR/PR) are editorial cross-position
// picks carried as explicit player references, not derived from Position.
struct SpecialSlot: Codable {
    let id: String
    let playerId: String?
    let x: Double
    let y: Double
    let label: String
}

// A minimal roster shape (mirrors TS's TeamRosterSeed) — just enough for formation
// resolution. Team identity/colors join when the data layer needs them.
struct Roster {
    let players: [Player]
    let specialTeams: [SpecialSlot]

    init(players: [Player], specialTeams: [SpecialSlot] = []) {
        self.players = players
        self.specialTeams = specialTeams
    }
}
