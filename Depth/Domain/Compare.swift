import Foundation

// Port of web's lib/utils/compare.ts — the pure, UI-free logic behind the two-team
// compare. Kept in Domain (not Feature) so it is unit-testable without the view and
// usable from anywhere, mirroring web's split between web/lib/compare.ts and
// web/components/CompareView.tsx.
//
// This domain model contains only the comparison data currently supported by the feature.
// `CompareFreshness` and `compareFreshness` remain shared because the metrics lenses use the
// same timestamp for their stale-data indicator.

/// The position chip row, in display order. Mirrors web's `COMPARE_POSITIONS`
/// exactly: KR/PR/LS are editorial special-teams slots, not depth groups, so they
/// don't belong in a per-position depth comparison.
let COMPARE_POSITIONS: [Position] = [
    .qb, .rb, .fb, .wr, .te, .lt, .lg, .c, .rg, .rt,
    .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb,
    .cb, .lcb, .rcb, .nb, .s, .ss, .fs, .k, .p,
]

// MARK: - Position → unit/room mapping

/// A football room in the two-step position picker: a grouped set of exact roster positions
/// within a single unit. "Choose a room, then the exact role" is used over the long
/// horizontal chip row; this is the pure model behind that interaction. Every room belongs to
/// exactly one unit and owns its display name and its positions in `COMPARE_POSITIONS` order,
/// so the picker can lay out around aligned grids instead of a scroll strip.
struct CompareRoom: Hashable, Identifiable {
    /// Stable identifier used to key the picker's grid and the selected-room comparison.
    let id: String
    /// Display name, e.g. "Linebackers".
    let name: String
    let unit: Unit
    /// The exact roster positions in this room, in `COMPARE_POSITIONS` display order.
    let positions: [Position]
}

/// The pure, exhaustive catalog mapping every `COMPARE_POSITIONS` value to exactly one unit
/// and room. Position groups mirror web's editorial depth groupings; a value
/// missing from `rooms` or duplicated across two rooms is a maintenance error caught by
/// `compareMatchupMapIsExhaustive`. ESPECIALLY does NOT carry `LS`/`KR`/`PR`, which are not
/// depth groups (same editorial reason `COMPARE_POSITIONS` omits them).
enum CompareMatchRooms {
    static let rooms: [CompareRoom] = [
        // Offense (QB / RB / FB / WR / TE / LT / LG / C / RG / RT)
        CompareRoom(id: "quarterback", name: "Quarterback", unit: .offense, positions: [.qb]),
        CompareRoom(id: "backfield", name: "Backfield", unit: .offense, positions: [.rb, .fb]),
        CompareRoom(id: "receivers", name: "Receivers", unit: .offense, positions: [.wr, .te]),
        CompareRoom(id: "line", name: "Line", unit: .offense, positions: [.lt, .lg, .c, .rg, .rt]),
        // Defense (17 positions)
        CompareRoom(
            id: "front", name: "Defensive Line", unit: .defense,
            positions: [.de, .lde, .rde, .dt, .nt]),
        CompareRoom(
            id: "linebackers", name: "Linebackers", unit: .defense,
            positions: [.lb, .wlb, .lilb, .rilb, .slb]),
        CompareRoom(
            id: "corners", name: "Corners", unit: .defense, positions: [.cb, .lcb, .rcb, .nb]),
        CompareRoom(id: "safeties", name: "Safeties", unit: .defense, positions: [.s, .ss, .fs]),
        // Special Teams (2 specialists)
        CompareRoom(id: "specialists", name: "Specialists", unit: .special, positions: [.k, .p]),
    ]

    /// The rooms belonging to a unit, in display order.
    static func rooms(in unit: Unit) -> [CompareRoom] {
        rooms.filter { $0.unit == unit }
    }

    /// The single room a position maps to, or nil if the position isn't a compare position.
    static func room(of position: Position) -> CompareRoom? {
        rooms.first { $0.positions.contains(position) }
    }
}

// MARK: - Generic tags in sided roles

/// The generic tag each sided compare role also lists. A roster can tag a lineman `OT` or
/// `G` with no side; Compare has no generic tackle or guard role, so those players appear
/// under both sided roles of their family, after every exact-tag player.
let compareFamilyFold: [Position: Position] = [.lt: .ot, .rt: .ot, .lg: .g, .rg: .g]

/// A compare role's players: the exact tag in depth order, then the role's generic family
/// in depth order, each athlete once.
func comparePlayers(in roster: Roster, at position: Position) -> [Player] {
    let exact = getPlayers(in: roster, at: position)
    guard let family = compareFamilyFold[position] else { return exact }
    let listed = Set(exact.map(\.id))
    return exact + getPlayers(in: roster, at: family).filter { !listed.contains($0.id) }
}

// MARK: - Evidence freshness

/// Whether a piece of evidence (a metrics row, a market line) is recent enough to trust
/// at face value. Shared by every lens that stamps a source line with a date.
enum CompareFreshness: Equatable {
    case current
    case stale
    case unavailable
}

func compareFreshness(
    updatedAt: String?,
    now: Date,
    staleAfter: TimeInterval = 24 * 60 * 60
) -> CompareFreshness {
    guard let updatedAt, let date = Timestamp.parseISO8601(updatedAt) else {
        return .unavailable
    }
    return now.timeIntervalSince(date) > staleAfter ? .stale : .current
}
