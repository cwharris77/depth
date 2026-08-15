import Foundation

// Mirrors the subset of lib/types.ts's Player that formation resolution and the T6
// basic player-detail screen touch (id/name/position/depthRank/number/order/photoUrl).
// `name` defaults to "" so the formation-parity fixtures (which only exercise ordering,
// never display) don't need updating. Remaining bio/stat fields (age, college,
// experience, height, weight, bio) join this struct when T8 ships full player profiles
// — adding them now would be speculative ahead of that screen's real requirements.
struct Player: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let position: Position
    /// Always 1, 2, or 3 in real data (TS's `1 | 2 | 3` literal union) — kept as Int
    /// here since byDepthOrder does plain arithmetic on it.
    let depthRank: Int
    let number: Int
    /// Set only on players reordered by a user depth override — see lib/utils/depth-
    /// chart/depth-overrides.ts. Undefined (nil) keeps the default jersey-number tiebreak.
    let order: Int?
    let photoUrl: String?

    init(
        id: String, name: String = "", position: Position, depthRank: Int, number: Int,
        order: Int? = nil, photoUrl: String? = nil
    ) {
        self.id = id
        self.name = name
        self.position = position
        self.depthRank = depthRank
        self.number = number
        self.order = order
        self.photoUrl = photoUrl
    }
}

// Mirrors lib/types.ts's SpecialSlot. Returners (KR/PR) are editorial cross-position
// picks carried as explicit player references, not derived from Position.
struct SpecialSlot: Codable, Equatable {
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
