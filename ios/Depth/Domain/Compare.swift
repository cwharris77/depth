import Foundation

// Port of web's lib/utils/compare.ts — the pure, UI-free logic behind the two-team
// compare. Kept in Domain (not Feature) so it is unit-testable without the view and
// usable from anywhere, mirroring web's split between lib/compare.ts and
// components/CompareView.tsx.

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
/// exactly one unit and owns its display name/detail and its positions in `COMPARE_POSITIONS`
/// order, so the picker can lay out around aligned grids instead of a scroll strip.
struct CompareRoom: Hashable, Identifiable {
    /// Stable identifier used to key the picker's grid and the selected-room comparison.
    let id: String
    /// Display name, e.g. "Linebackers".
    let name: String
    /// One-line descriptor of the room's contents, e.g. "Inside · outside".
    let detail: String
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
        CompareRoom(id: "quarterback", name: "Quarterback", detail: "Signal caller", unit: .offense, positions: [.qb]),
        CompareRoom(id: "backfield", name: "Backfield", detail: "Running · fullback", unit: .offense, positions: [.rb, .fb]),
        CompareRoom(id: "receivers", name: "Receivers", detail: "Wide · tight end", unit: .offense, positions: [.wr, .te]),
        CompareRoom(id: "line", name: "Line", detail: "Tackles · guards · center", unit: .offense, positions: [.lt, .lg, .c, .rg, .rt]),
        // Defense (17 positions)
        CompareRoom(id: "front", name: "Front", detail: "Ends · tackles · nose", unit: .defense, positions: [.de, .lde, .rde, .dt, .nt]),
        CompareRoom(id: "linebackers", name: "Linebackers", detail: "Inside · outside", unit: .defense, positions: [.lb, .wlb, .lilb, .rilb, .slb]),
        CompareRoom(id: "corners", name: "Corners", detail: "Outside · nickel", unit: .defense, positions: [.cb, .lcb, .rcb, .nb]),
        CompareRoom(id: "safeties", name: "Safeties", detail: "Free · strong", unit: .defense, positions: [.s, .ss, .fs]),
        // Special Teams (2 specialists)
        CompareRoom(id: "specialists", name: "Specialists", detail: "Kicker · punter", unit: .special, positions: [.k, .p]),
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

/// The "deepest room" teaser (web's reunification spec) needs one comparable
/// position, not the full list — picks whichever position has the most combined
/// depth across both sides (max(a, b) per position, tie → earliest position in
/// `positions` order). Pure and parallel-array-based: index i of `playersA`/
/// `playersB` corresponds to positions[i]. Mirrors web's `getDeepestPosition`.
func getDeepestPosition(
    playersA: [[Player]],
    playersB: [[Player]],
    positions: [Position]
) -> Position? {
    var best: (position: Position, depth: Int)?
    for (index, position) in positions.enumerated() {
        let depth = max(playersA[safe: index]?.count ?? 0, playersB[safe: index]?.count ?? 0)
        if depth > 0, best == nil || depth > best!.depth {
            best = (position: position, depth: depth)
        }
    }
    return best?.position
}

/// The small preview object the matchup tab renders as its discoverability row —
/// never a whole roster, just the deepest position's rank-1 players and both
/// sides' counts. Mirrors web's `buildCompareTeaser`.
struct CompareTeaser: Equatable {
    let position: Position
    let countA: Int
    let countB: Int
    let topA: Player?
    let topB: Player?
}

func buildCompareTeaser(
    playersA: [[Player]],
    playersB: [[Player]],
    positions: [Position]
) -> CompareTeaser? {
    guard let position = getDeepestPosition(playersA: playersA, playersB: playersB, positions: positions),
        let index = positions.firstIndex(of: position)
    else { return nil }
    return CompareTeaser(
        position: position,
        countA: playersA[safe: index]?.count ?? 0,
        countB: playersB[safe: index]?.count ?? 0,
        topA: playersA[safe: index]?.first,
        topB: playersB[safe: index]?.first
    )
}

// MARK: - DEP-317: auditable lens evidence

/// A market-only Forecast value derived from DEP-315's team-oriented schedule row.
/// DEP-316 declined Depth's candidate model, so this type deliberately contains no
/// proprietary probability, score, or generated reason.
struct CompareMarketForecast: Equatable {
    let favoriteTeamId: String
    let favoriteProbability: Double
    /// Conventional spread from the favorite's perspective (favorite values negative).
    let spread: Double?
    let source: String
    let updatedAt: String?
}

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

func buildMarketForecast(
    game: ScheduleGame,
    perspectiveTeamId: String
) -> CompareMarketForecast? {
    guard let market = game.market,
        let favoriteTeamId = market.favoriteTeamId,
        let perspectiveProbability = market.impliedWinProbability
    else { return nil }

    let perspectiveIsFavorite = favoriteTeamId == perspectiveTeamId
    return CompareMarketForecast(
        favoriteTeamId: favoriteTeamId,
        favoriteProbability: perspectiveIsFavorite
            ? perspectiveProbability
            : 1 - perspectiveProbability,
        spread: market.teamSpread.map { perspectiveIsFavorite ? $0 : -$0 },
        source: market.source.rawValue,
        updatedAt: market.updatedAt
    )
}

/// Roster-lens participation coverage for listed rank-one players. A snap share is
/// evidence of recent usage only; this summary never converts it into health, injury,
/// or game-status language (DEP-313/DEP-314's explicit boundary).
struct StarterParticipationSummary: Equatable {
    let totalStarters: Int
    let trackedStarters: Int
    let averageSnapShare: Double?
}

func summarizeStarterParticipation(
    snapshot: TeamSnapshot,
    recent: RecentParticipation?
) -> StarterParticipationSummary {
    let starters = snapshot.players.filter { $0.depthRank == 1 }
    guard let recent else {
        return StarterParticipationSummary(
            totalStarters: starters.count,
            trackedStarters: 0,
            averageSnapShare: nil
        )
    }

    let participationByPlayer = Dictionary(uniqueKeysWithValues: recent.players.map { ($0.playerId, $0) })
    let observedShares = starters.compactMap { player -> Double? in
        guard let participation = participationByPlayer[player.id] else { return nil }
        switch CompareMatchRooms.room(of: player.position)?.unit {
        case .offense:
            return participation.offense.percentage
        case .defense:
            return participation.defense.percentage
        case .special:
            return participation.specialTeams.percentage
        case nil:
            return [.k, .p, .ls, .kr, .pr].contains(player.position)
                ? participation.specialTeams.percentage
                : nil
        }
    }
    let average = observedShares.isEmpty
        ? nil
        : observedShares.reduce(0, +) / Double(observedShares.count)
    return StarterParticipationSummary(
        totalStarters: starters.count,
        trackedStarters: observedShares.count,
        averageSnapShare: average
    )
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
