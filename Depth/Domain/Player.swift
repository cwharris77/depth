import Foundation

// Mirrors the complete native profile projection from `players` while retaining the
// small initializer required by formation fixtures. Source absence stays represented by
// the web-equivalent empty/zero values so the profile formatter, not the mapper, owns
// the user-facing em dash fallback.
struct Player: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let position: Position
    /// Always 1, 2, or 3 in real data (TS's `1 | 2 | 3` literal union) — kept as Int
    /// here since byDepthOrder does plain arithmetic on it.
    let depthRank: Int
    let number: Int
    /// Set only on players reordered by a user depth override — see web/lib/utils/depth-
    /// chart/depth-overrides.ts. Undefined (nil) keeps the default jersey-number tiebreak.
    let order: Int?
    let status: PlayerStatus
    let age: Int
    let college: String
    let experience: Int
    let height: String
    let weight: Int
    let bio: String
    let photoUrl: String?

    init(
        id: String, name: String = "", position: Position, depthRank: Int, number: Int,
        order: Int? = nil, status: PlayerStatus = .backup, age: Int = 0, college: String = "",
        experience: Int = 0, height: String = "", weight: Int = 0, bio: String = "",
        photoUrl: String? = nil
    ) {
        self.id = id
        self.name = name
        self.position = position
        self.depthRank = depthRank
        self.number = number
        self.order = order
        self.status = status
        self.age = age
        self.college = college
        self.experience = experience
        self.height = height
        self.weight = weight
        self.bio = bio
        self.photoUrl = photoUrl
    }
}

// Mirrors web/lib/types.ts's SpecialSlot. Returners (KR/PR) are editorial cross-position
// picks carried as explicit player references, not derived from Position.
struct SpecialSlot: Codable, Equatable {
    let id: String
    let playerId: String?
    let x: Double
    let y: Double
    let label: String
}

extension Player {
    /// This athlete as seen from one seat on the depth chart.
    ///
    /// Identity stays single; `position`/`depthRank` come from the seat, so a swing tackle
    /// can appear in the LT pool ranked 2 and the RT pool ranked 1.
    func seated(at position: Position, depthRank: Int) -> Player {
        Player(
            id: id, name: name, position: position, depthRank: depthRank, number: number,
            order: order, status: status, age: age, college: college, experience: experience,
            height: height, weight: weight, bio: bio, photoUrl: photoUrl
        )
    }
}

// One seat on the depth chart: a position slot, its rank, and who fills it. Mirrors a
// `depth_chart_entries` row and TS's DepthSeat.
//
// Identity and seat are separate concerns. `Player` carries exactly one row per
// athlete; a seat says where that athlete lines up. An athlete can hold more than one --
// ESPN cross-lists a swing tackle at LT2 and RT1 -- which `Player.position` alone cannot
// express, and which is why formations used to come up a man short.
struct DepthSeat: Codable, Equatable, Hashable {
    let position: Position
    let depthRank: Int
    let playerId: String
}

// A minimal roster shape (mirrors TS's TeamRosterSeed) — just enough for formation
// resolution. Team identity/colors join when the data layer needs them.
struct Roster {
    let players: [Player]
    let specialTeams: [SpecialSlot]
    /// Where each athlete lines up. Nil means "derive one seat per player", which is what
    /// keeps historical seasons working: roster_history has no depth_chart_entries, so a
    /// 2001 roster behaves exactly as it did before seats existed. Mirrors seatsOf.
    let depthChart: [DepthSeat]?

    init(players: [Player], specialTeams: [SpecialSlot] = [], depthChart: [DepthSeat]? = nil) {
        self.players = players
        self.specialTeams = specialTeams
        self.depthChart = depthChart
    }
}
