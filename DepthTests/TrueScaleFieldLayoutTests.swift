import CoreGraphics
import Foundation
import Testing
@testable import Depth

// Regression tests for the offense's true-scale mode (field-scale design, turn 2): the
// alignment convention keeps charted side and order, the pan never shows past the surface,
// and every hidden player is reachable through an edge chip.
struct TrueScaleFieldLayoutTests {
    private let phoneWindow = CGSize(width: 333, height: 640)

    private func player(_ number: Int, _ name: String) -> Player {
        Player(id: "p\(number)", name: name, position: .wr, depthRank: 1, number: number)
    }

    private func slot(_ key: String, _ label: String, _ x: Double, _ y: Double, onLine: Bool, _ number: Int) -> RenderSlot {
        RenderSlot(key: key, x: x, y: y, label: label, player: player(number, "Player \(number)"), onLine: onLine)
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
        let drawnYards = (qb.center.y - layout.lineOfScrimmageY) / TrueScaleFieldLayout.pointsPerYard
        #expect(abs(drawnYards - 18.0 / 3.8) < 0.001)
    }

    @Test func panNeverShowsPastTheSurface() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let far = layout.clampPan(CGPoint(x: 10_000, y: -10_000), viewport: phoneWindow)
        #expect(far.x == 0)
        #expect(far.y == phoneWindow.height - layout.contentSize.height)
        let home = layout.initialPan(viewport: phoneWindow)
        #expect(!layout.isOffCentre(pan: home, viewport: phoneWindow))
        #expect(abs(layout.windowOffsetYards(pan: home, viewport: phoneWindow)) < 0.01)
    }

    @Test func everyHiddenPlayerHasAChipAndChipsDoNotStack() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let pan = layout.initialPan(viewport: phoneWindow)
        let hidden = layout.dots.filter { !layout.isVisible($0, pan: pan, viewport: phoneWindow) }
        let chips = layout.edgeChips(pan: pan, viewport: phoneWindow)
        // Receivers at ±17 and 9 yd are off a 333pt window; the in-line TE stays on the field.
        #expect(Set(hidden.map(\.key)) == ["wr0", "wr1", "wr2"])
        #expect(Set(chips.compactMap { $0.dot?.key }) == Set(hidden.map(\.key)))
        for side in [TrueScaleFieldLayout.EdgeChip.Side.leading, .trailing] {
            let ys = chips.filter { $0.side == side }.map(\.y)
            #expect(zip(ys, ys.dropFirst()).allSatisfy { $1 - $0 >= TrueScaleFieldLayout.chipSpacing })
        }
        // Centring on a chip's player brings him into view.
        for chip in chips {
            let target = layout.centeringPan(on: chip.target, viewport: phoneWindow)
            #expect(layout.isVisible(chip.target, pan: target, viewport: phoneWindow))
        }
    }

    @Test func chipsOverflowIntoPlusN() {
        let wide = (0..<7).map { i in slot("wr\(i)", "WR", 5 + Double(i), 51 + Double(i) * 4, onLine: false, 10 + i) }
        let layout = TrueScaleFieldLayout(slots: wide)
        let chips = layout.edgeChips(pan: CGPoint(x: -layout.contentSize.width + phoneWindow.width, y: 0), viewport: phoneWindow)
        let leading = chips.filter { $0.side == .leading }
        #expect(leading.count == TrueScaleFieldLayout.maxChipsPerSide)
        #expect(leading.last?.dot == nil)
        #expect(leading.last?.overflowCount == 7 - (TrueScaleFieldLayout.maxChipsPerSide - 1))
    }

    @Test func readoutDescribesRealAlignment() {
        let layout = TrueScaleFieldLayout(slots: shotgunEleven)
        let rb = layout.dots.first { $0.key == "rb0" }!
        #expect(TrueScaleFieldLayout.alignmentDescription(for: rb) == "1.2 yd right of the ball · 5.3 yd off the line")
        let lt = layout.dots.first { $0.key == "lt" }!
        #expect(TrueScaleFieldLayout.alignmentDescription(for: lt) == "2.6 yd left of the ball · on the line")
        #expect(layout.personnelSummary == "3WR 1TE")
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
