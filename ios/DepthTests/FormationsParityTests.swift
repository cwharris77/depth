import Testing
@testable import Depth

// Parity tests against fixtures/domain/*.json, generated from the TS oracle
// (lib/utils/depth-chart/formations.ts, lib/utils/roster/roster.ts). Every case here
// must match exactly — this is the "Swift/TypeScript parity" bar from T3.

private struct FixturePlayer: Decodable {
    let id: String
    let position: Position
    let depthRank: Int
    let number: Int
    let order: Int?

    var domain: Player { Player(id: id, position: position, depthRank: depthRank, number: number, order: order) }
}

private struct FixtureSpecialSlot: Decodable {
    let id: String
    let playerId: String?
    let x: Double
    let y: Double
    let label: String

    var domain: SpecialSlot { SpecialSlot(id: id, playerId: playerId, x: x, y: y, label: label) }
}

private struct FixtureRoster: Decodable {
    let players: [FixturePlayer]
    let specialTeams: [FixtureSpecialSlot]

    var domain: Roster { Roster(players: players.map(\.domain), specialTeams: specialTeams.map(\.domain)) }
}

private struct FixtureFormationSlot: Decodable {
    let id: String
    let position: Position
    let index: Int
    let group: PositionGroup?
    let preferredPosition: Position?
    let x: Double
    let y: Double
    let label: String
    let onLine: Bool

    var domain: FormationSlot {
        FormationSlot(
            id: id, position: position, index: index, group: group, preferredPosition: preferredPosition,
            x: x, y: y, label: label, onLine: onLine
        )
    }
}

private struct FixtureResolvedSlot: Decodable {
    let key: String
    let x: Double
    let y: Double
    let label: String
    let onLine: Bool?
    let playerId: String?
}

// --- depth-order.json ---------------------------------------------------------------

private struct DepthOrderCase: Decodable {
    let description: String
    let players: [FixturePlayer]
    let position: Position
    let expectedIds: [String]
}

@Test func depthOrderParity() throws {
    let cases = try loadFixture("depth-order", as: [DepthOrderCase].self)
    for c in cases {
        let roster = Roster(players: c.players.map(\.domain))
        let actual = getPlayers(in: roster, at: c.position).map(\.id)
        #expect(actual == c.expectedIds, "\(c.description)")
    }
}

// --- real-offense-formation.json -----------------------------------------------------

private struct OffenseFormationCase: Decodable {
    let description: String
    let alignment: String
    let personnelCode: String
    let expectedSlots: [FixtureFormationSlot]
    let isFallback: Bool
}

@Test func realOffenseFormationParity() throws {
    let cases = try loadFixture("real-offense-formation", as: [OffenseFormationCase].self)
    for c in cases {
        let actual = buildRealFormation(alignment: c.alignment, code: c.personnelCode)
        #expect(actual == c.expectedSlots.map(\.domain), "\(c.description)")
        #expect((actual == offenseFormation) == c.isFallback, "\(c.description) — fallback flag")
    }
}

// --- real-defense-formation.json -----------------------------------------------------

private struct DefenseFormationCase: Decodable {
    let description: String
    let code: String
    let expectedSlots: [FixtureFormationSlot]
    let isFallback: Bool
}

@Test func realDefenseFormationParity() throws {
    let cases = try loadFixture("real-defense-formation", as: [DefenseFormationCase].self)
    for c in cases {
        let actual = buildRealDefenseFormation(c.code)
        #expect(actual == c.expectedSlots.map(\.domain), "\(c.description)")
        #expect((actual == baseDefense) == c.isFallback, "\(c.description) — fallback flag")
    }
}

@Test func realDefenseFormationFallsBackWhenDBCountExceedsSlotCapacity() {
    #expect(buildRealDefenseFormation("1-1-9") == baseDefense)
}

// --- resolve-unit.json ----------------------------------------------------------------

private struct ResolveUnitCase: Decodable {
    let description: String
    let unit: Unit
    let roster: FixtureRoster
    let realFormation: [FixtureFormationSlot]?
    let resolved: [FixtureResolvedSlot]
}

@Test func resolveUnitParity() throws {
    let cases = try loadFixture("resolve-unit", as: [ResolveUnitCase].self)
    for c in cases {
        let actual = resolveUnit(
            roster: c.roster.domain, unit: c.unit,
            realFormation: c.realFormation?.map(\.domain)
        )
        #expect(actual.count == c.resolved.count, "\(c.description) — slot count")
        for (a, e) in zip(actual, c.resolved) {
            #expect(a.key == e.key, "\(c.description) — key")
            #expect(a.x == e.x && a.y == e.y, "\(c.description) — coords")
            #expect(a.label == e.label, "\(c.description) — label")
            #expect(a.onLine == e.onLine, "\(c.description) — onLine")
            #expect(a.player?.id == e.playerId, "\(c.description) — playerId")
        }
    }
}

// --- alignment-label.json -------------------------------------------------------------

private struct AlignmentLabelCase: Decodable {
    let alignment: String
    let expectedLabel: String
}

@Test func alignmentLabelParity() throws {
    let cases = try loadFixture("alignment-label", as: [AlignmentLabelCase].self)
    for c in cases {
        #expect(alignmentLabel(c.alignment) == c.expectedLabel)
    }
}

// --- topFormation / formationSlots (DEP-221) ---------------------------------------
// Not parity fixtures — these helpers are native-only (web computes the top formation in
// the useFormations hook, not shared pure functions). These unit tests pin the default-pick
// and from-selected-formation contracts the field relies on.

private func formation(
    _ unit: Unit, _ rank: Int, alignment: String = "SHOTGUN", personnel: String = "11", pct: Int = 50
) -> TeamFormation {
    TeamFormation(season: 2025, rank: rank, unit: unit, alignment: alignment, personnel: personnel, pct: pct)
}

@Test func topFormationPicksTheUnitsLowestRank() {
    let formations = [
        formation(.offense, 2, alignment: "UNDER CENTER", personnel: "21", pct: 30),
        formation(.offense, 1, personnel: "11", pct: 60),
        formation(.defense, 1, alignment: "Nickel", personnel: "4-2-5", pct: 55),
    ]
    #expect(topFormation(for: .offense, formations: formations)?.personnel == "11")
    #expect(topFormation(for: .defense, formations: formations)?.personnel == "4-2-5")
}

@Test func topFormationReturnsNilForEmptyOrWrongUnit() {
    #expect(topFormation(for: .offense, formations: []) == nil)
    #expect(topFormation(for: .offense, formations: [formation(.defense, 1)]) == nil)
}

@Test func formationSlotsBuildsTheUnitsRealLayout() {
    let offense = formation(.offense, 1, personnel: "11")
    let slots = formationSlots(for: .offense, formation: offense)
    #expect(slots?.count == 11)
    #expect(slots?.first?.id == "off-lt-0")
    #expect(slots?.contains { $0.position == .wr } == true)

    // A defense formation builds a real 11-man front, not the generic 3-4 base.
    let defense = formation(.defense, 1, personnel: "4-2-5")
    #expect(formationSlots(for: .defense, formation: defense)?.count == 11)

    // Special teams has no real-formation slots.
    #expect(formationSlots(for: .special, formation: offense) == nil)
}
