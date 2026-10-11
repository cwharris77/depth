import Foundation
import Testing
@testable import Depth

// Roster roles: a job a player holds on top of his position (nickel back, returner). The
// position stays his own; the role adds a seat, a special-teams slot, or a tag.

private func rolesTeam() -> Team {
    Team(
        id: "seahawks", city: "Seattle", name: "Seahawks", abbrev: "SEA",
        conference: "NFC", division: "West",
        colors: TeamColors(primary: "#002244", secondary: "#69be28", accent: "#69be28"),
        logo: "https://example.com/logo.png", logoDark: "https://example.com/logo-dark.png"
    )
}

private func rolesRow(
    _ gsisId: String, _ position: String, depthRank: Int = 1, playerOrder: Int = 1,
    roles: [String: Int]? = nil
) -> HistoricalRosterRowDTO {
    HistoricalRosterRowDTO(
        season: 2022, teamId: "seahawks", gsisId: gsisId, name: gsisId, number: 1,
        position: position, college: nil, height: nil, weight: nil,
        depthRank: depthRank, playerOrder: playerOrder,
        roles: roles.map(HistoricalRoleRanks.init(ranks:))
    )
}

private func decodeRow(roles: String) throws -> HistoricalRosterRowDTO {
    let json = """
        {"season": 2022, "team_id": "seahawks", "gsis_id": "a", "name": "A", "number": 1,
         "position": "CB", "college": null, "height": null, "weight": null,
         "depth_rank": 1, "player_order": 1, "roles": \(roles)}
        """
    return try JSONDecoder().decode(HistoricalRosterRowDTO.self, from: Data(json.utf8))
}

@Test func historicalRowDecodesRoleRanks() throws {
    #expect(try decodeRow(roles: #"{"nb": 1, "kr": 2}"#).roles?.ranks == ["nb": 1, "kr": 2])
}

@Test func historicalRowDecodesWithoutRoles() throws {
    #expect(try decodeRow(roles: "null").roles == nil)
    let json = """
        {"season": 2022, "team_id": "seahawks", "gsis_id": "a", "name": "A", "number": 1,
         "position": "CB", "college": null, "height": null, "weight": null,
         "depth_rank": 1, "player_order": 1}
        """
    let row = try JSONDecoder().decode(HistoricalRosterRowDTO.self, from: Data(json.utf8))
    #expect(row.roles == nil)
}

// A role value this build cannot read costs that one role, never the row.
@Test func historicalRowIgnoresMalformedRoleValues() throws {
    #expect(
        try decodeRow(roles: #"{"nb": "first", "kr": 2, "pr": 0, "dime": 1}"#).roles?.ranks
            == ["kr": 2, "dime": 1])
    #expect(try decodeRow(roles: #"["nb"]"#).roles?.ranks == [:])
    #expect(try decodeRow(roles: #""nb""#).roles?.ranks == [:])
}

@Test func returnersFillTheKickAndPuntReturnSlots() throws {
    let snapshot = try HistoricalRosterMapper.map(
        team: rolesTeam(),
        rows: [
            rolesRow("kicker", "K"),
            rolesRow("second", "WR", playerOrder: 2, roles: ["kr": 2]),
            rolesRow("first", "RB", roles: ["kr": 1, "pr": 2]),
        ],
        includeRoles: true
    )
    let slots = Dictionary(
        uniqueKeysWithValues: snapshot.specialTeams.map { ($0.label, $0) })

    #expect(slots["KR"]?.playerId == "gsis:first@2022")
    #expect(slots["KR"]?.id == "st-kr")
    // The best-ranked holder on the roster fills the slot even when he is not ranked first.
    #expect(slots["PR"]?.playerId == "gsis:first@2022")
    #expect(slots["K"]?.playerId == "gsis:kicker@2022")
}

@Test func seasonWithoutReturnersOmitsTheReturnSlots() throws {
    let snapshot = try HistoricalRosterMapper.map(
        team: rolesTeam(), rows: [rolesRow("kicker", "K")], includeRoles: true)

    #expect(snapshot.specialTeams.map(\.label) == ["K"])
}

@Test func rolesAreIgnoredWhenNotIncluded() throws {
    let snapshot = try HistoricalRosterMapper.map(
        team: rolesTeam(),
        rows: [rolesRow("slot", "CB", roles: ["nb": 1, "kr": 1]), rolesRow("kicker", "K")]
    )

    #expect(snapshot.specialTeams.map(\.label) == ["K"])
}

private let roleIdentities = [
    Player(id: "slot", position: .cb, depthRank: 2, number: 20),
    Player(id: "corner", position: .cb, depthRank: 1, number: 21),
    Player(id: "pure", position: .nb, depthRank: 1, number: 22),
]

private let roleSeats = [
    DepthSeat(position: .cb, depthRank: 1, playerId: "corner"),
    DepthSeat(position: .cb, depthRank: 2, playerId: "slot"),
    DepthSeat(position: .nb, depthRank: 1, playerId: "slot"),
    DepthSeat(position: .nb, depthRank: 2, playerId: "pure"),
]

private func seen(_ id: String, at position: Position) throws -> Player {
    let roster = Roster(players: roleIdentities, depthChart: roleSeats)
    return try #require(getPlayers(in: roster, at: position).first { $0.id == id })
}

// Tapping the nickel dot hands over the player as that seat sees him; the profile opens
// at his own position.
@Test func nickelSeatHolderIsListedAtHisOwnPosition() throws {
    let tapped = try seen("slot", at: .nb)
    let listed = ownListing(of: tapped, identities: roleIdentities)

    #expect(tapped.position == .nb)
    #expect(listed.position == .cb)
    #expect(listed.depthRank == 2)
}

@Test func playerSeenAtHisOwnPositionIsUnchanged() throws {
    let tapped = try seen("corner", at: .cb)

    #expect(ownListing(of: tapped, identities: roleIdentities) == tapped)
}

// A player whose own listing is nickel back has no other position to fall back to.
@Test func playerListedAtNickelKeepsNickelAsHisPosition() throws {
    let tapped = try seen("pure", at: .nb)

    #expect(ownListing(of: tapped, identities: roleIdentities).position == .nb)
}

// A saved reorder rewrites the displayed players with the seats they moved through, so
// a player's own position is read from the roster as loaded.
@Test func reorderedNickelPoolStillListsTheHolderAtHisOwnPosition() throws {
    let loaded = TeamSnapshot(
        team: rolesTeam(), players: roleIdentities, specialTeams: [], uniforms: [],
        depthChart: roleSeats)
    let displayed = applyingDepthOverrides(to: loaded, orders: [.nb: ["pure", "slot"]])
    let roster = Roster(players: displayed.players, depthChart: displayed.depthChart)
    let tapped = try #require(getPlayers(in: roster, at: .nb).first { $0.id == "slot" })

    #expect(ownListing(of: tapped, identities: loaded.players).position == .cb)
}

private let ownPositions: [String: Position] = ["slot": .cb, "safety": .ss, "pure": .nb]

@Test func nickelSlotPrintsItsHoldersOwnPosition() {
    #expect(
        nickelHolderLabel(slotLabel: "NB", playerId: "slot", ownPositions: ownPositions) == "CB")
    #expect(
        nickelHolderLabel(slotLabel: "NB", playerId: "safety", ownPositions: ownPositions) == "SS")
}

@Test func onlyAFilledNickelSlotCarriesTheMark() {
    #expect(
        nickelHolderLabel(slotLabel: "LCB", playerId: "slot", ownPositions: ownPositions) == nil)
    #expect(nickelHolderLabel(slotLabel: "NB", playerId: nil, ownPositions: ownPositions) == nil)
    #expect(nickelHolderLabel(slotLabel: "NB", playerId: "gone", ownPositions: ownPositions) == nil)
    // A player listed only at nickel back keeps the slot's own label.
    #expect(nickelHolderLabel(slotLabel: "NB", playerId: "pure", ownPositions: ownPositions) == nil)
}
