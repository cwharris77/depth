import Foundation

// Port of web's lib/utils/compare.ts — the pure, UI-free logic behind the two-team
// compare. Kept in Domain (not Feature) so it is unit-testable without the view and
// usable from anywhere, mirroring web's split between lib/compare.ts and
// components/CompareView.tsx.
//
// Aug 2026 feedback pass removed three features from this file along with their call
// sites: the Deepest Room teaser (getDeepestPosition/CompareTeaser/buildCompareTeaser —
// "pretty much worthless," per Cooper), the market Forecast lens
// (CompareMarketForecast/buildMarketForecast — blank for most teams most of the season
// since it needed an upcoming two-sided market line), and the Roster participation lens
// (StarterParticipationSummary/summarizeStarterParticipation — no injury data to pair
// snap share with). All three are recoverable from git history if a future spec wants to
// place them elsewhere (see the PR body for the exact commit). `CompareFreshness`/
// `compareFreshness` survive the Forecast removal — the metrics lenses' "Stale · "/
// "Updated " source line still needs them.

/// The position chip row, in display order. Mirrors web's `COMPARE_POSITIONS`
/// exactly: KR/PR/LS are editorial special-teams slots, not depth groups, so they
/// don't belong in a per-position depth comparison.
let COMPARE_POSITIONS: [Position] = [
    .qb, .rb, .fb, .wr, .te, .lt, .lg, .c, .rg, .rt,
    .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb,
    .cb, .lcb, .rcb, .nb, .s, .ss, .fs, .k, .p,
]

// MARK: - DEP-311: position → unit/room mapping

/// A football room in the two-step position picker: a grouped set of exact roster positions
/// within a single unit. DEP-298 locked "choose a room, then the exact role" over the long
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
/// and room (DEP-311 task 1). Position groups mirror web's editorial depth groupings; a value
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
        // Cooper (Aug 25): "Front" read as unclear next to "Linebackers"/"Corners"/
        // "Safeties" — renamed to the room's actual football name; id kept stable.
        CompareRoom(id: "front", name: "Defensive Line", unit: .defense, positions: [.de, .lde, .rde, .dt, .nt]),
        CompareRoom(id: "linebackers", name: "Linebackers", unit: .defense, positions: [.lb, .wlb, .lilb, .rilb, .slb]),
        CompareRoom(id: "corners", name: "Corners", unit: .defense, positions: [.cb, .lcb, .rcb, .nb]),
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
    guard let updatedAt, let date = ISO8601DateFormatter().date(from: updatedAt) else {
        return .unavailable
    }
    return now.timeIntervalSince(date) > staleAfter ? .stale : .current
}
