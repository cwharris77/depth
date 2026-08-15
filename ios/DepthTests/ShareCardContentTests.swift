import Foundation
import Testing

@testable import Depth

// Task 8E coverage: the pure, hex/roster-only building blocks of the native share card
// (no SwiftUI/ImageRenderer dependency) — ported from lib/utils/colors.ts's
// contrastRatio/readableTextOn and lib/utils/og.ts's featuredStarters. See
// lib/__tests__/contrast.test.ts and lib/__tests__/og.test.ts for the TS oracle these
// mirror, including the exact known values below.

@Test func contrastRatioIsMaximalForBlackOnWhite() {
    #expect(abs(contrastRatio("#000000", "#ffffff") - 21) < 0.5)
}

@Test func contrastRatioIsMinimalForIdenticalColors() {
    #expect(abs(contrastRatio("#69BE28", "#69BE28") - 1) < 0.0001)
}

@Test func readableTextOnPicksDarkTextOnALightBackgroundAndWhiteOnADarkOne() {
    #expect(readableTextOn("#ffffff") == "#0a0e1a")
    #expect(readableTextOn("#002244") == "#ffffff")
}

private func team(primary: String = "#000000", id: String = "test") -> Team {
    Team(
        id: id, city: "Test", name: "Team", abbrev: "TST", conference: "NFC", division: "West",
        colors: TeamColors(primary: primary, secondary: "#fff", accent: "#888", uiAccent: "#fff", onAccent: "#000"),
        logo: nil, logoDark: nil
    )
}

private func player(id: String, position: Position, number: Int, depthRank: Int = 1) -> Player {
    Player(id: id, name: id, position: position, depthRank: depthRank, number: number)
}

private func snapshot(players: [Player]) -> TeamSnapshot {
    TeamSnapshot(team: team(), players: players, specialTeams: [], uniforms: [])
}

@Test func featuredStartersPicksTheTopQBRBAndWRByDepthOrder() {
    let snap = snapshot(players: [
        player(id: "qb1", position: .qb, number: 7),
        player(id: "qb2", position: .qb, number: 19),
        player(id: "rb1", position: .rb, number: 9),
        player(id: "wr-a", position: .wr, number: 14),
        player(id: "wr-b", position: .wr, number: 11),  // lower number wins the depthRank tie
    ])

    let picks = featuredStarters(from: snap)

    #expect(picks.map(\.label) == ["QB", "RB", "WR"])
    #expect(picks.map(\.name) == ["qb1", "rb1", "wr-b"])
}

@Test func featuredStartersSkipsPositionsTheRosterLacksInsteadOfEmittingBlanks() {
    let snap = snapshot(players: [player(id: "qb1", position: .qb, number: 7)])

    #expect(featuredStarters(from: snap) == [FeaturedStarter(label: "QB", name: "qb1")])
}

@Test func featuredStartersReturnsEmptyForARosterWithNoneOfTheThreePositions() {
    let snap = snapshot(players: [player(id: "k1", position: .k, number: 3)])

    #expect(featuredStarters(from: snap).isEmpty)
}
