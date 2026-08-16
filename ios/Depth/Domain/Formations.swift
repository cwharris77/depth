import Foundation

// Direct Swift port of lib/utils/depth-chart/formations.ts. The TS file is the oracle —
// this must match it exactly, verified by the shared fixtures under fixtures/domain/
// (DepthTests/FormationsParityTests.swift). Keep in lockstep: when formations.ts
// changes, regenerate fixtures (`npx tsx fixtures/generate.mts` in the depth repo) and
// port the same change here.

// Maps a granular Position to the broad group nflverse's count-only personnel data can
// resolve against. A total map (every Position has an entry, even if nil) so adding a
// Position without updating this is caught by exhaustive-switch style review, matching
// the TS Record's compile-time enforcement.
private let positionGroupMap: [Position: PositionGroup?] = [
    .qb: nil, .rb: .rb, .fb: .rb, .wr: nil, .te: nil,
    .lt: nil, .lg: nil, .c: nil, .rg: nil, .rt: nil,
    .de: .dl, .lde: .dl, .rde: .dl, .dt: .dl, .nt: .dl,
    .lb: .lb, .wlb: .lb, .lilb: .lb, .rilb: .lb, .slb: .lb,
    .cb: .cb, .lcb: .cb, .rcb: .cb, .nb: .cb,
    .s: .s, .ss: .s, .fs: .s,
    .k: nil, .p: nil, .ls: nil, .kr: nil, .pr: nil,
]

private func positionGroup(_ position: Position) -> PositionGroup? {
    positionGroupMap[position] ?? nil
}

private func players(in roster: Roster, group: PositionGroup) -> [Player] {
    roster.players.filter { positionGroup($0.position) == group }.sorted(by: byDepthOrder)
}

/// Assigns players to a set of same-group slots: a slot with `preferredPosition` claims
/// the best-ranked player carrying that exact tag first; every remaining slot (no
/// preference, or no player carries it) is filled in original slot order from whatever's
/// left of the depth-ordered pool. Mirrors assignPositionGroup exactly.
private func assignPositionGroup(pool: [Player], slots: [FormationSlot]) -> [Player?] {
    var remaining = pool
    var result = [Player?](repeating: nil, count: slots.count)
    var fallbackIndices: [Int] = []

    for (i, slot) in slots.enumerated() {
        guard let preferred = slot.preferredPosition else {
            fallbackIndices.append(i)
            continue
        }
        guard let matchIdx = remaining.firstIndex(where: { $0.position == preferred }) else {
            fallbackIndices.append(i)
            continue
        }
        result[i] = remaining[matchIdx]
        remaining.remove(at: matchIdx)
    }

    for i in fallbackIndices {
        if remaining.isEmpty { continue }
        result[i] = remaining.removeFirst()
    }

    return result
}

/// Resolves every group-based slot in a formation, one group at a time, so a slot in the
/// 'S' group and a slot in the 'CB' group don't compete for the same pool. Mirrors
/// resolveGroupedSlots exactly (iteration order over the group set follows first
/// appearance in `slots`, matching JS Set's insertion-order iteration).
private func resolveGroupedSlots(roster: Roster, slots: [FormationSlot]) -> [Player?] {
    var result = [Player?](repeating: nil, count: slots.count)
    var seenGroups: [PositionGroup] = []
    for slot in slots {
        if let g = slot.group, !seenGroups.contains(g) {
            seenGroups.append(g)
        }
    }
    for group in seenGroups {
        var indices: [Int] = []
        for (i, s) in slots.enumerated() where s.group == group {
            indices.append(i)
        }
        let pool = players(in: roster, group: group)
        let assigned = assignPositionGroup(pool: pool, slots: indices.map { slots[$0] })
        for (j, slotIdx) in indices.enumerated() {
            result[slotIdx] = assigned[j]
        }
    }
    return result
}

// --- Shared, generic formations --------------------------------------------------
// Coords are percentages: x = 0–100 across, y = 0–100 down. y=50 = line of scrimmage.

let offenseFormation: [FormationSlot] = [
    FormationSlot(id: "off-wr-0", position: .wr, index: 0, x: 88, y: 51, label: "WR", onLine: true),
    FormationSlot(id: "off-wr-1", position: .wr, index: 1, x: 12, y: 55, label: "WR", onLine: false),
    FormationSlot(id: "off-wr-2", position: .wr, index: 2, x: 24, y: 56, label: "WR", onLine: false),
    FormationSlot(id: "off-te-0", position: .te, index: 0, x: 74, y: 51, label: "TE", onLine: true),
    FormationSlot(id: "off-lt-0", position: .lt, index: 0, x: 34, y: 51, label: "LT", onLine: true),
    FormationSlot(id: "off-lg-0", position: .lg, index: 0, x: 42, y: 51, label: "LG", onLine: true),
    FormationSlot(id: "off-c-0", position: .c, index: 0, x: 50, y: 51, label: "C", onLine: true),
    FormationSlot(id: "off-rg-0", position: .rg, index: 0, x: 58, y: 51, label: "RG", onLine: true),
    FormationSlot(id: "off-rt-0", position: .rt, index: 0, x: 66, y: 51, label: "RT", onLine: true),
    FormationSlot(id: "off-qb-0", position: .qb, index: 0, x: 50, y: 66, label: "QB", onLine: false),
    // group: .rb + preferredPosition: .rb — prefers an exact RB tag but falls back to
    // the roster's best-ranked FB when the team has no player tagged RB at all.
    FormationSlot(
        id: "off-rb-0", position: .rb, index: 0, group: .rb, preferredPosition: .rb,
        x: 50, y: 78, label: "RB", onLine: false
    ),
]

// True 3-4 base: a 3-man front (LDE/NT/RDE) + 4 linebackers (WLB/LILB/RILB/SLB).
let baseDefense: [FormationSlot] = [
    FormationSlot(id: "def-ss-0", position: .ss, index: 0, x: 34, y: 14, label: "SS", onLine: false),
    FormationSlot(id: "def-fs-0", position: .fs, index: 0, x: 66, y: 14, label: "FS", onLine: false),
    FormationSlot(id: "def-lcb-0", position: .lcb, index: 0, x: 10, y: 26, label: "LCB", onLine: false),
    FormationSlot(id: "def-rcb-0", position: .rcb, index: 0, x: 90, y: 26, label: "RCB", onLine: false),
    FormationSlot(id: "def-wlb-0", position: .wlb, index: 0, x: 22, y: 37, label: "WLB", onLine: false),
    FormationSlot(id: "def-lilb-0", position: .lilb, index: 0, x: 42, y: 37, label: "LILB", onLine: false),
    FormationSlot(id: "def-rilb-0", position: .rilb, index: 0, x: 58, y: 37, label: "RILB", onLine: false),
    FormationSlot(id: "def-slb-0", position: .slb, index: 0, x: 78, y: 37, label: "SLB", onLine: false),
    FormationSlot(id: "def-lde-0", position: .lde, index: 0, x: 26, y: 49, label: "LDE", onLine: true),
    FormationSlot(id: "def-nt-0", position: .nt, index: 0, x: 50, y: 49, label: "NT", onLine: true),
    FormationSlot(id: "def-rde-0", position: .rde, index: 0, x: 74, y: 49, label: "RDE", onLine: true),
]

/// Resolve a unit to render-ready slots for a given roster. `realFormation` lets a
/// caller swap in a real per-team layout for offense/defense — ignored for special.
/// Mirrors resolveUnit exactly.
func resolveUnit(roster: Roster, unit: Unit, realFormation: [FormationSlot]? = nil) -> [RenderSlot] {
    if unit == .special {
        return roster.specialTeams.map { slot in
            RenderSlot(
                key: slot.id, x: slot.x, y: slot.y, label: slot.label,
                player: slot.playerId.flatMap { getPlayer(in: roster, id: $0) },
                onLine: nil
            )
        }
    }

    let fallback = unit == .offense ? offenseFormation : baseDefense
    let formation = realFormation ?? fallback
    let groupedPlayers = resolveGroupedSlots(roster: roster, slots: formation)

    return formation.enumerated().map { i, slot in
        let player: Player? = slot.group != nil
            ? groupedPlayers[i]
            : getPlayers(in: roster, at: slot.position)[safe: slot.index]
        // An RB-group slot that actually resolved to a fullback reads as "FB", not "RB".
        let label = (slot.group == .rb && player?.position == .fb) ? "FB" : slot.label
        return RenderSlot(key: slot.id, x: slot.x, y: slot.y, label: label, player: player, onLine: slot.onLine)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

// --- Real per-team offensive formations -------------------------------------------

enum QbAlignment: String {
    case shotgun = "SHOTGUN"
    case underCenter = "UNDER CENTER"
    case pistol = "PISTOL"
}

private let alignmentLabels: [QbAlignment: String] = [
    .shotgun: "Shotgun",
    .underCenter: "Under center",
    .pistol: "Pistol",
]

/// Human label for a stored alignment value. Unrecognized input passes through verbatim.
func alignmentLabel(_ alignment: String) -> String {
    guard let qb = QbAlignment(rawValue: alignment) else { return alignment }
    return alignmentLabels[qb] ?? alignment
}

private let lineY: Double = 51
private let wingY: Double = 54

private let qbY: [QbAlignment: Double] = [
    .underCenter: 56,
    .pistol: 63,
    .shotgun: 68,
]

private let wrSpots: [(x: Double, y: Double, onLine: Bool)] = [
    (10, lineY, true),
    (90, wingY, false),
    (26, wingY, false),
    (74, wingY, false),
    (33, wingY, false),
]

private struct SkillSlot {
    var position: Position
    var group: PositionGroup?
    var preferredPosition: Position?
    var index: Int
    var x: Double
    var y: Double
    var onLine: Bool
    var label: String
}

private let olSlots: [SkillSlot] = [
    SkillSlot(position: .lt, index: 0, x: 34, y: lineY, onLine: true, label: "LT"),
    SkillSlot(position: .lg, index: 0, x: 42, y: lineY, onLine: true, label: "LG"),
    SkillSlot(position: .c, index: 0, x: 50, y: lineY, onLine: true, label: "C"),
    SkillSlot(position: .rg, index: 0, x: 58, y: lineY, onLine: true, label: "RG"),
    SkillSlot(position: .rt, index: 0, x: 66, y: lineY, onLine: true, label: "RT"),
]

private func slotId(_ position: Position, _ index: Int) -> String {
    "off-\(position.rawValue.lowercased())-\(index)"
}

private func isDigits03(_ s: Substring) -> Bool {
    s.count == 1 && "0123".contains(s)
}

/// Builds one team's actual offense layout from its most-used (qbAlignment,
/// personnelCode) combo. Falls back to the generic offenseFormation for a code this
/// repo can't fully place. Mirrors buildRealFormation exactly, including the onLine
/// promotion loop and the 2nd-TE placement rule.
func buildRealFormation(alignment: String, code: String) -> [FormationSlot] {
    guard code.count == 2, isDigits03(code[code.startIndex...code.startIndex]),
          isDigits03(code[code.index(after: code.startIndex)...])
    else { return offenseFormation }

    let chars = Array(code)
    let rb = Int(String(chars[0]))!
    let te = Int(String(chars[1]))!
    let wr = 5 - rb - te
    if wr < 0 || rb > 2 { return offenseFormation }

    let wrSlots: [SkillSlot] = (0..<wr).map { i in
        let spot = wrSpots[i]
        return SkillSlot(position: .wr, index: i, x: spot.x, y: spot.y, onLine: spot.onLine, label: "WR")
    }

    var teSlots: [SkillSlot] = []
    if te >= 1 {
        teSlots.append(SkillSlot(position: .te, index: 0, x: 71, y: lineY, onLine: true, label: "TE"))
    }
    if te >= 2 {
        // A 2nd in-line TE only when there's no WR to flex out wide; otherwise it wings
        // off the line next to the 1st TE.
        if wr < 1 {
            teSlots.append(SkillSlot(position: .te, index: 1, x: 29, y: lineY, onLine: true, label: "TE"))
        } else {
            teSlots.append(SkillSlot(position: .te, index: 1, x: 76, y: wingY, onLine: false, label: "TE"))
        }
    }
    if te >= 3 {
        teSlots.append(SkillSlot(position: .te, index: 2, x: 24, y: wingY, onLine: false, label: "TE"))
    }

    // Exactly 7 onLine total (5 OL + 2 skill) — promote off-line WRs, then TEs, in fill
    // order until the invariant holds.
    var skillSlots = wrSlots + teSlots
    var onLineCount = skillSlots.filter { $0.onLine }.count
    for i in skillSlots.indices {
        if onLineCount >= 2 { break }
        if !skillSlots[i].onLine {
            skillSlots[i].onLine = true
            onLineCount += 1
        }
    }

    let isShotgun = alignment == QbAlignment.shotgun.rawValue
    var rbSlots: [SkillSlot] = []
    if rb >= 1 {
        rbSlots.append(SkillSlot(
            position: .rb, group: .rb, index: 0,
            x: isShotgun ? 58 : 50, y: isShotgun ? 70 : 76, onLine: false, label: "RB"
        ))
    }
    if rb >= 2 {
        rbSlots.append(SkillSlot(position: .rb, group: .rb, index: 1, x: 42, y: 70, onLine: false, label: "RB"))
    }

    let qbSlot = SkillSlot(
        position: .qb, index: 0, x: 50,
        y: qbY[QbAlignment(rawValue: alignment) ?? .shotgun] ?? qbY[.shotgun]!,
        onLine: false, label: "QB"
    )

    return (olSlots + skillSlots + rbSlots + [qbSlot]).map { s in
        FormationSlot(
            id: slotId(s.position, s.index), position: s.position, index: s.index,
            group: s.group, preferredPosition: s.preferredPosition,
            x: s.x, y: s.y, label: s.label, onLine: s.onLine
        )
    }
}

// --- Real per-team defensive formations -------------------------------------------

private let dlY: Double = 49
private let lbY: Double = 37

private func spreadX(_ count: Int, _ minX: Double, _ maxX: Double) -> [Double] {
    if count <= 0 { return [] }
    if count == 1 { return [(minX + maxX) / 2] }
    let step = (maxX - minX) / Double(count - 1)
    return (0..<count).map { minX + step * Double($0) }
}

/// nflverse's count-only defense_personnel data can't say which specific player is the
/// nose tackle vs a 4-3 end — these slots carry a generic position + group, with
/// preferredPosition seating the exact-tagged player first where the front shape is a
/// verified real one (single-gap NT, an edge-rush pair, or the true 3-4's LDE/NT/RDE).
private func preferredDlPosition(_ dl: Int, _ i: Int) -> Position? {
    if dl == 1 { return .nt }
    if i == 0 { return .lde }
    if i == dl - 1 { return .rde }
    if dl == 3 { return .nt }
    return nil
}

private func buildDlSlots(_ dl: Int) -> [FormationSlot] {
    var deCount = 0
    var dtCount = 0
    return spreadX(dl, 24, 76).enumerated().map { i, x in
        let isEdge = dl > 1 && (i == 0 || i == dl - 1)
        let position: Position = isEdge ? .de : .dt
        let preferredPosition = preferredDlPosition(dl, i)
        let label = preferredPosition?.rawValue ?? position.rawValue
        let index: Int
        if position == .de {
            index = deCount
            deCount += 1
        } else {
            index = dtCount
            dtCount += 1
        }
        return FormationSlot(
            id: "", position: position, index: index, group: .dl, preferredPosition: preferredPosition,
            x: x, y: dlY, label: label, onLine: true
        )
    }
}

// The verified real 3-4 base (WLB/LILB/RILB/SLB, left to right) is the only LB-count
// shape the taxonomy spec confirms as a real front; other counts stay generic.
private let lbTags: [Position] = [.wlb, .lilb, .rilb, .slb]

private func buildLbSlots(_ lb: Int) -> [FormationSlot] {
    spreadX(lb, 26, 74).enumerated().map { i, x in
        let preferredPosition = lb == 4 ? lbTags[i] : nil
        return FormationSlot(
            id: "", position: .lb, index: i, group: .lb, preferredPosition: preferredPosition,
            x: x, y: lbY, label: preferredPosition?.rawValue ?? "LB", onLine: false
        )
    }
}

// Fixed spots, filled in order as the DB count grows past the base 4.
private struct DbSpot {
    let position: Position // .cb or .s (generic group-match position)
    let label: String
    let preferredPosition: Position?
    let x: Double
    let y: Double
}

private let dbSlots: [DbSpot] = [
    DbSpot(position: .cb, label: "LCB", preferredPosition: .lcb, x: 10, y: 26),
    DbSpot(position: .cb, label: "RCB", preferredPosition: .rcb, x: 90, y: 26),
    DbSpot(position: .s, label: "SS", preferredPosition: .ss, x: 34, y: 14),
    DbSpot(position: .s, label: "FS", preferredPosition: .fs, x: 66, y: 14),
    DbSpot(position: .cb, label: "NB", preferredPosition: .nb, x: 50, y: 28),
    DbSpot(position: .s, label: "S", preferredPosition: nil, x: 50, y: 10),
    DbSpot(position: .cb, label: "CB", preferredPosition: nil, x: 26, y: 30),
    DbSpot(position: .s, label: "S", preferredPosition: nil, x: 74, y: 30),
]

private func buildDbSlots(_ db: Int) -> [FormationSlot] {
    var cbCount = 0
    var sCount = 0
    return dbSlots.prefix(min(db, dbSlots.count)).map { spot in
        let index: Int
        let group: PositionGroup
        if spot.position == .cb {
            index = cbCount
            cbCount += 1
            group = .cb
        } else {
            index = sCount
            sCount += 1
            group = .s
        }
        return FormationSlot(
            id: "", position: spot.position, index: index, group: group,
            preferredPosition: spot.preferredPosition, x: spot.x, y: spot.y, label: spot.label, onLine: false
        )
    }
}

/// Builds one team's actual defensive front from its most-used "{dl}-{lb}-{db}" combo.
/// Falls back to the generic baseDefense for a code this repo can't place (wrong shape,
/// or counts that don't sum to 11). Mirrors buildRealDefenseFormation exactly.
func buildRealDefenseFormation(_ code: String) -> [FormationSlot] {
    let parts = code.split(separator: "-", omittingEmptySubsequences: false)
    guard parts.count == 3,
          let dl = Int(parts[0]), parts[0].allSatisfy({ $0.isNumber }), !parts[0].isEmpty,
          let lb = Int(parts[1]), parts[1].allSatisfy({ $0.isNumber }), !parts[1].isEmpty,
          let db = Int(parts[2]), parts[2].allSatisfy({ $0.isNumber }), !parts[2].isEmpty
    else { return baseDefense }
    guard dl + lb + db == 11 else { return baseDefense }

    let slots = buildDlSlots(dl) + buildLbSlots(lb) + buildDbSlots(db)
    return slots.map { s in
        FormationSlot(
            id: "def-\(s.position.rawValue.lowercased())-\(s.index)", position: s.position, index: s.index,
            group: s.group, preferredPosition: s.preferredPosition,
            x: s.x, y: s.y, label: s.label, onLine: s.onLine
        )
    }
}

/// Returns the unit's top (lowest-`rank`) real formation from its team's formation data —
/// the default pick, mirroring web's `topFormationFor` in lib/hooks/depth-chart/use-formations.ts.
/// nil when the unit has no formation rows (special teams always, and any historical
/// season, whose `formations` array is empty). Callers use this for the initial selection
/// and the overflow-menu meta label.
func topFormation(for unit: Unit, formations: [TeamFormation]) -> TeamFormation? {
    formations
        .filter { $0.unit == unit }
        .min(by: { $0.rank < $1.rank })
}

/// Turns one specific `TeamFormation` into its render-ready real-formation slots — what
/// lets the field show a team's actual FTN-charted alignment instead of the generic
/// synthetic layout, for a user-chosen formation as well as the default (DEP-221). nil
/// for special teams (no special-teams formation data, matching web), so `resolveUnit`
/// falls back to the generic layout.
func formationSlots(for unit: Unit, formation: TeamFormation) -> [FormationSlot]? {
    switch unit {
    case .offense:
        return buildRealFormation(alignment: formation.alignment, code: formation.personnel)
    case .defense:
        return buildRealDefenseFormation(formation.personnel)
    case .special:
        return nil
    }
}
