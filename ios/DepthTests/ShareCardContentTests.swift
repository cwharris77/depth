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
    #expect(readableTextOn("#ffffff") == "#15161a")
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

// DEP-269: the native share card renders at exactly half the web OG card's 1200×630
// raster, so its fixed metrics must each be the web route's value ÷ 2. These pin the
// constants against app/team/[id]/og-image/route.tsx so a drift is caught here rather
// than as an off-contract raster nobody audits. The deliberate non-halves (padding,
// eyebrow spacing, starter text gap) are asserted in their own test as a canary.
@Test func shareCardMetricsMirrorTheWebOgRoute() {
    #expect(ShareCardMetrics.cardWidth == 600) // web 1200
    #expect(ShareCardMetrics.cardHeight == 315) // web 630
    #expect(ShareCardMetrics.starterSpacing == 10) // web gap 20
    #expect(ShareCardMetrics.starterRadius == 9) // web 18
    #expect(ShareCardMetrics.starterPaddingHorizontal == 13) // web 26
    #expect(ShareCardMetrics.starterPaddingVertical == 9) // web 18
    #expect(ShareCardMetrics.starterLabelSize == 13) // web 26
    #expect(ShareCardMetrics.starterNameSize == 19) // web 38
    #expect(ShareCardMetrics.eyebrowBarRadius == 3) // web 6
    #expect(ShareCardMetrics.eyebrowBarSize == CGSize(width: 28, height: 6)) // web 56×12
    #expect(ShareCardMetrics.eyebrowTextSize == 15) // web 26
    #expect(ShareCardMetrics.eyebrowTracking == 4) // web 8
    #expect(ShareCardMetrics.cityTextSize == 22) // web 44
    #expect(ShareCardMetrics.cityTracking == 2) // web 4
    #expect(ShareCardMetrics.teamNameSize == 66) // web 132
}

@Test func shareCardMetricsPinShippedDivergencesFromExactWebHalves() {
    // Kept at the long-shipped native values rather than halving web's asymmetric
    // padding (76 vertical / 80 horizontal) or 20px eyebrow gap — a deliberate visual
    // no-op. If these ever change, the web route comment block in ShareCardMetrics
    // should be revisited in the same diff.
    #expect(ShareCardMetrics.cardPadding == 38)
    #expect(ShareCardMetrics.eyebrowSpacing == 12)
    #expect(ShareCardMetrics.starterTextSpacing == 2) // not a web half — web has no column gap
    // Deliberately not derived from a web CSS value at all (web uses flexbox
    // space-between); pinned purely as a contract against accidental drift.
    #expect(ShareCardMetrics.columnSpacing == 24)
}

// DEP-296: the activity sheet may crop its preview thumbnail, so the wide transfer
// raster is composed inside a square canvas with breathing room on every edge. These
// assertions keep the preview contract separate from the unchanged shared-image size.
@Test func sharePreviewCanvasFitsTheWholeCardWithSafeInsets() {
    #expect(SharePreviewMetrics.safeInset == 24)
    #expect(SharePreviewMetrics.canvasSide == 648)
    #expect(
        ShareCardMetrics.cardWidth + (SharePreviewMetrics.safeInset * 2)
            <= SharePreviewMetrics.canvasSide
    )
    #expect(
        ShareCardMetrics.cardHeight + (SharePreviewMetrics.safeInset * 2)
            <= SharePreviewMetrics.canvasSide
    )
}
