import CoreGraphics
import Foundation
import Testing
@testable import Depth

// Regression tests for true-scale mode (field-scale design, turn 2; defense: DEP-572): the
// alignment convention keeps charted side and order, the pan never shows past the surface,
// and every hidden player is reachable through an edge chip. The defense cases mirror the
// offense ones — same assertions, mirrored about the line of scrimmage.
struct TrueScaleFieldLayoutTests {
    private let phoneWindow = TrueScaleFieldLayout.Window(
        size: CGSize(width: 342, height: 874), topInset: 114, bottomInset: 34)

    private func player(_ number: Int, _ name: String) -> Player {
        Player(id: "p\(number)", name: name, position: .wr, depthRank: 1, number: number)
    }

    private func slot(
        _ key: String, _ label: String, _ x: Double, _ y: Double, onLine: Bool, _ number: Int
    ) -> RenderSlot {
        RenderSlot(
            key: key, x: x, y: y, label: label, player: player(number, "Player \(number)"),
            onLine: onLine)
    }

    /// Seattle's most-used offense from the design: shotgun 11 personnel.
    private var shotgunEleven: [RenderSlot] {
        [
            slot("lt", "LT", 34, 51, onLine: true, 67),
            slot("lg", "LG", 42, 51, onLine: true, 76),
            slot("c", "C", 50, 51, onLine: true, 61),
            slot("rg", "RG", 58, 51, onLine: true, 75),
            slot("rt", "RT", 66, 51, onLine: true, 72),
            slot("wr0", "WR", 10, 51, onLine: true, 11),
            slot("wr1", "WR", 90, 54, onLine: false, 15),
            slot("wr2", "WR", 26, 54, onLine: false, 82),
            slot("te0", "TE", 71, 51, onLine: true, 88),
            slot("rb0", "RB", 58, 70, onLine: false, 26),
            slot("qb0", "QB", 50, 68, onLine: false, 14),
        ]
    }

    @Test func realAlignmentKeepsChartedSideAndOrder() {
        let x = TrueScaleFieldLayout.realLateralYards(slots: shotgunEleven)
        #expect(x["c"] == 0 && x["qb0"] == 0)
        #expect(x["rt"]! - x["lt"]! == 5.2)
        #expect(x["te0"]! > x["rt"]!)
        #expect(x["wr0"] == -17 && x["wr2"] == -9)
        #expect(x["wr1"] == 17)
        #expect(x["rb0"]! > 0)
    }

    @Test func receiverLaddersNeverInvertOrder() {
        for count in 1...5 {
            let ladder = TrueScaleFieldLayout.RealX.receiverLadder(count: count)
            #expect(ladder.count >= count)
            #expect(zip(ladder, ladder.dropFirst()).allSatisfy { $0 > $1 })
        }
    }

    @Test func stackedTightEndsDoNotOverlap() {
        let slots = [
            slot("te0", "TE", 71, 51, onLine: true, 88),
            slot("te1", "TE", 76, 54, onLine: false, 85),
        ]
        let x = TrueScaleFieldLayout.realLateralYards(slots: slots)
        #expect(x["te1"]! > x["te0"]!)
    }

    @Test func depthIsTrueScale() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let qb = layout.dots.first { $0.key == "qb0" }!
        let drawnYards =
            (qb.center.y - layout.lineOfScrimmageY) / TrueScaleFieldLayout.pointsPerYard
        #expect(abs(drawnYards - 18.0 / 3.8) < 0.001)
    }

    @Test func panNeverShowsPastTheSurface() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let far = layout.clampPan(CGPoint(x: 10_000, y: -10_000), window: phoneWindow)
        #expect(far.x == 0)
        #expect(far.y == phoneWindow.size.height - layout.contentSize.height)
        let home = layout.initialPan(window: phoneWindow)
        #expect(!layout.isOffCentre(pan: home, window: phoneWindow))
        // Opens with the ball centred and the line below the floating header.
        #expect(abs(home.x + layout.contentSize.width / 2 - phoneWindow.size.width / 2) < 0.01)
        #expect(home.y + layout.lineOfScrimmageY > phoneWindow.topInset)
    }

    @Test func everyHiddenPlayerHasAChipAndChipsDoNotStack() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let pan = layout.initialPan(window: phoneWindow)
        let hidden = layout.dots.filter { !layout.isVisible($0, pan: pan, window: phoneWindow) }
        let chips = layout.edgeChips(pan: pan, window: phoneWindow)
        // Receivers at ±17 and 9 yd are off a 333pt window; the in-line TE stays on the field.
        #expect(Set(hidden.map(\.key)) == ["wr0", "wr1", "wr2"])
        #expect(Set(chips.compactMap { $0.dot?.key }) == Set(hidden.map(\.key)))
        for side in [TrueScaleFieldLayout.EdgeChip.Side.leading, .trailing] {
            let ys = chips.filter { $0.side == side }.map(\.y)
            #expect(
                zip(ys, ys.dropFirst()).allSatisfy { $1 - $0 >= TrueScaleFieldLayout.chipSpacing })
            // Chips never tuck under the floating header.
            #expect(ys.allSatisfy { $0 >= phoneWindow.topInset })
        }
        // Centring on a chip's player brings him into view.
        for chip in chips {
            let target = layout.centeringPan(on: chip.target, window: phoneWindow)
            #expect(layout.isVisible(chip.target, pan: target, window: phoneWindow))
        }
    }

    @Test func chipsOverflowIntoPlusN() {
        let wide = (0..<7).map { i in
            slot("wr\(i)", "WR", 5 + Double(i), 51 + Double(i) * 4, onLine: false, 10 + i)
        }
        let layout = TrueScaleFieldLayout(slots: wide)
        let chips = layout.edgeChips(
            pan: CGPoint(x: -layout.contentSize.width + phoneWindow.size.width, y: 0),
            window: phoneWindow)
        let leading = chips.filter { $0.side == .leading }
        #expect(leading.count == TrueScaleFieldLayout.maxChipsPerSide)
        #expect(leading.last?.dot == nil)
        #expect(leading.last?.overflowCount == 7 - (TrueScaleFieldLayout.maxChipsPerSide - 1))
    }

    @Test func calloutSaysOnOrOffTheLine() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let rb = layout.dots.first { $0.key == "rb0" }!
        #expect(TrueScaleFieldLayout.lineStatus(for: rb) == "Off the line")
        let lt = layout.dots.first { $0.key == "lt" }!
        #expect(TrueScaleFieldLayout.lineStatus(for: lt) == "On the line")
        #expect(layout.personnelSummary == "3WR 1TE")
    }

    // MARK: Defense (DEP-572)

    /// Seattle's most-used defense: nickel 4-2-5, as `buildRealDefenseFormation("4-2-5")`
    /// charts it — four down linemen spread 24–76, two backers at 26/74, and the base
    /// four DBs plus a nickel back on the ball.
    private var nickelFourTwoFive: [RenderSlot] {
        [
            slot("lde", "LDE", 24, 45, onLine: true, 91),
            slot("dt0", "DT", 41.33, 45, onLine: true, 98),
            slot("dt1", "DT", 58.67, 45, onLine: true, 95),
            slot("rde", "RDE", 76, 45, onLine: true, 55),
            slot("lb0", "LB", 26, 33, onLine: false, 54),
            slot("lb1", "LB", 74, 33, onLine: false, 58),
            slot("lcb", "LCB", 10, 26, onLine: false, 21),
            slot("rcb", "RCB", 90, 26, onLine: false, 27),
            slot("ss", "SS", 34, 14, onLine: false, 33),
            slot("fs", "FS", 66, 14, onLine: false, 3),
            slot("nb", "NB", 50, 28, onLine: false, 20),
        ]
    }

    @Test func defenseAlignmentKeepsChartedSideAndOrder() {
        let x = TrueScaleFieldLayout.realLateralYards(slots: nickelFourTwoFive, unit: .defense)
        // Front: 5-techniques outside 3-techniques, each on its charted side.
        #expect(x["lde"] == -3.5 && x["rde"] == 3.5)
        #expect(x["dt0"] == -1.5 && x["dt1"] == 1.5)
        // Two backers, one a side, both inside the ends they play behind.
        #expect(x["lb0"] == -2 && x["lb1"] == 2)
        #expect(abs(x["lb0"]!) < abs(x["lde"]!))
        // Corners land on the receiver ladder's boundary rung; safeties split at ±6.
        #expect(x["lcb"] == -17 && x["rcb"] == 17)
        #expect(x["ss"] == -6 && x["fs"] == 6)
        // The nickel back is charted dead-centre, so he takes the slot at 9 rather than
        // stacking on the ball.
        #expect(abs(x["nb"]!) == 9)
    }

    @Test func defenseBackerLaddersNeverInvertOrder() {
        for count in 1...4 {
            let ladder = TrueScaleFieldLayout.RealDefenseX.backerLadder(count: count)
            #expect(ladder.count == count)
            #expect(zip(ladder, ladder.dropFirst()).allSatisfy { $0 < $1 })
        }
    }

    @Test func defenseDepthIsTrueScaleAndGrowsUpScreen() {
        let layout = TrueScaleFieldLayout(slots: nickelFourTwoFive, unit: .defense)
        func dot(_ key: String) -> TrueScaleFieldLayout.Dot { layout.dots.first { $0.key == key }! }
        // Depth is reported as yards off the line on the defense's own side — positive,
        // like a running back's, and at the same 3.8 charted units per yard.
        #expect(abs(dot("fs").depthYards - 36.0 / 3.8) < 0.001)
        #expect(dot("fs").depthYards > dot("lcb").depthYards)
        #expect(dot("lcb").depthYards > dot("lb0").depthYards)
        #expect(dot("lb0").depthYards > dot("lde").depthYards)
        #expect(dot("lde").depthYards > 0)
        // ...and it is drawn ABOVE the line, the mirror of the offense's backfield.
        #expect(dot("fs").center.y < dot("lde").center.y)
        #expect(dot("lde").center.y < layout.lineOfScrimmageY)
        // Every defender fits on the surface drawn for him.
        #expect(
            layout.dots.allSatisfy { $0.center.y >= 0 && $0.center.y <= layout.contentSize.height })
    }

    @Test func defensePanNeverShowsPastTheSurface() {
        let layout = TrueScaleFieldLayout(slots: nickelFourTwoFive, unit: .defense)
        let far = layout.clampPan(CGPoint(x: 10_000, y: 10_000), window: phoneWindow)
        #expect(far.x == 0 && far.y == 0)
        let home = layout.initialPan(window: phoneWindow)
        #expect(!layout.isOffCentre(pan: home, window: phoneWindow))
        #expect(abs(home.x + layout.contentSize.width / 2 - phoneWindow.size.width / 2) < 0.01)
        // The line opens low, leaving the secondary the room above it, and the deepest
        // safety still clears the floating header.
        let losY = home.y + layout.lineOfScrimmageY
        #expect(losY > phoneWindow.size.height / 2)
        #expect(losY < phoneWindow.size.height - phoneWindow.bottomInset)
        let deepest = layout.dots.min { $0.center.y < $1.center.y }!
        #expect(deepest.center.y + home.y >= phoneWindow.topInset)
    }

    @Test func defenseWidePlayersGetChipsThatReachThem() {
        let layout = TrueScaleFieldLayout(slots: nickelFourTwoFive, unit: .defense)
        let pan = layout.initialPan(window: phoneWindow)
        let hidden = layout.dots.filter { !layout.isVisible($0, pan: pan, window: phoneWindow) }
        let chips = layout.edgeChips(pan: pan, window: phoneWindow)
        // A 342pt window is under 8 yd wide at 1:1, so the front and the backers open on
        // screen and everyone aligned wider than ±3.9 yd — the corners, the split safeties
        // and the nickel back — opens as a chip. That is the point of the mode, not a
        // fallback: the secondary really is that far outside the box.
        #expect(Set(hidden.map(\.key)) == ["lcb", "rcb", "ss", "fs", "nb"])
        #expect(Set(chips.compactMap { $0.dot?.key }) == Set(hidden.map(\.key)))
        for side in [TrueScaleFieldLayout.EdgeChip.Side.leading, .trailing] {
            let ys = chips.filter { $0.side == side }.map(\.y)
            #expect(
                zip(ys, ys.dropFirst()).allSatisfy { $1 - $0 >= TrueScaleFieldLayout.chipSpacing })
            #expect(ys.allSatisfy { $0 >= phoneWindow.topInset })
        }
        // Centring on a chip's player brings him into view.
        for chip in chips {
            let target = layout.centeringPan(on: chip.target, window: phoneWindow)
            #expect(layout.isVisible(chip.target, pan: target, window: phoneWindow))
        }
    }

    @Test func defenseHeaderAndCalloutReadForDefense() {
        let layout = TrueScaleFieldLayout(slots: nickelFourTwoFive, unit: .defense)
        #expect(layout.personnelSummary == "4-2-5")
        let lde = layout.dots.first { $0.key == "lde" }!
        #expect(TrueScaleFieldLayout.lineStatus(for: lde) == "On the line")
        let lb = layout.dots.first { $0.key == "lb0" }!
        #expect(TrueScaleFieldLayout.lineStatus(for: lb) == "Off the line")
        let formation = TeamFormation(
            season: 2025, rank: 0, unit: .defense, alignment: "Nickel", personnel: "4-2-5", pct: 62)
        #expect(TrueScaleFieldView.formationTitle(formation, unit: .defense) == "Nickel 4-2-5")
    }

    /// The historical path: a season with no formation rows renders `baseDefense`, and the
    /// header falls back to the plain personnel count instead of a formation name. The UI
    /// fixture bundle carries only the current season, so this is the only cover this path
    /// has — it reads `baseDefense`'s own charted coordinates rather than a hand-made set.
    @Test func historicalBaseDefenseOpensWithAPlainTextHeader() {
        let slots = baseDefense.enumerated().map { i, s in
            slot(s.id, s.label, s.x, s.y, onLine: s.onLine, 50 + i)
        }
        let layout = TrueScaleFieldLayout(slots: slots, unit: .defense)
        #expect(layout.personnelSummary == "3-4-4")
        let x = TrueScaleFieldLayout.realLateralYards(slots: slots, unit: .defense)
        // A 3-4 front: ends at the 5-technique, the nose head-up on the ball.
        #expect(x["def-lde-0"] == -3.5 && x["def-rde-0"] == 3.5)
        #expect(x["def-nt-0"] == 0)
        // Inside backers inside the outside backers, each on its charted side.
        #expect(x["def-lilb-0"] == -2 && x["def-rilb-0"] == 2)
        #expect(x["def-wlb-0"] == -4.5 && x["def-slb-0"] == 4.5)
        #expect(x["def-lcb-0"] == -17 && x["def-rcb-0"] == 17)
        #expect(x["def-ss-0"] == -6 && x["def-fs-0"] == 6)
        // Everyone fits on the surface, and the opening framing is on-centre.
        #expect(
            layout.dots.allSatisfy { $0.center.y >= 0 && $0.center.y <= layout.contentSize.height })
        #expect(
            !layout.isOffCentre(pan: layout.initialPan(window: phoneWindow), window: phoneWindow))
    }

    @Test func numeralsPointAtTheNearerGoal() {
        let numerals = TrueScaleFieldLayout(slots: shotgunEleven).furniture.numerals
        #expect(Set(numerals.map(\.text)) == ["30", "40", "50"])
        #expect(numerals.filter { $0.text == "50" }.allSatisfy { $0.arrowOnPositiveSide == nil })
        // Own 40: nearer goal is down-screen. Left column (+x is down) arrows on +x.
        let forty = numerals.filter { $0.text == "40" }
        #expect(forty.first { $0.degrees == 90 }?.arrowOnPositiveSide == true)
        #expect(forty.first { $0.degrees == -90 }?.arrowOnPositiveSide == false)
    }
}
