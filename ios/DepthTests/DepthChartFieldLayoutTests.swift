import CoreGraphics
import Foundation
import Testing
@testable import Depth

// Geometry regression tests for DEP-207: at any realistic field width, no two dots on
// the field are closer than `dotSize + gap`, and a row that can't hold the minimum dot
// size is re-spread around its centroid instead of letting its dots touch.
struct DepthChartFieldLayoutTests {
    // The field on a typical iPhone: screen width minus horizontal padding, height set
    // by `.containerRelativeFrame(.vertical)` in TeamDetailView.
    private let iphoneField = CGSize(width: 370, height: 650)

    private func slot(_ key: String, _ x: Double, _ y: Double) -> RenderSlot {
        RenderSlot(key: key, x: x, y: y, label: key, player: nil, onLine: nil)
    }

    /// Asserts no two dots anywhere on the field are closer than `dotSize + gap` —
    /// stronger than the same-row guarantee and exactly DEP-207's "dots never touch".
    private func assertNoTouching(
        _ slots: [RenderSlot], layout: DepthChartFieldLayout,
        sourceLocation: SourceLocation = #_sourceLocation
    ) {
        for (i, a) in slots.enumerated() {
            for b in slots.dropFirst(i + 1) {
                let pa = layout.positions[a.key] ?? .zero
                let pb = layout.positions[b.key] ?? .zero
                let distance = hypot(pa.x - pb.x, pa.y - pb.y)
                #expect(distance + 0.001 >= layout.dotSize + DepthChartFieldLayout.gap, "\(a.key) and \(b.key) are too close: \(distance)pt", sourceLocation: sourceLocation)
            }
        }
    }

    @Test("generic offense dots never touch at iPhone field width")
    func offenseDotsNeverTouch() {
        let slots = offenseFormation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)

        // The shoulder-to-shoulder OL (8% apart) is the tightest pair: 8% of 370 = 29.6,
        // minus the 2pt gap → 27.6pt dots.
        #expect(abs(layout.dotSize - 27.6) < 0.001)
        assertNoTouching(slots, layout: layout)
    }

    @Test("base defense dots never touch and cap at the max size")
    func defenseDotsCapAtMax() {
        let slots = baseDefense.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)

        // The LB row (16% apart) is the tightest pair: 16% of 370 = 59.2 → clamped to 36.
        #expect(layout.dotSize == DepthChartFieldLayout.maxDotSize)
        assertNoTouching(slots, layout: layout)
    }

    @Test("special teams dots never touch and cap at the max size")
    func specialTeamsDotsCapAtMax() {
        // Real special-teams layout shared by every team (lib/teams/_build.ts).
        let slots = [
            slot("st-kr", 30, 18), slot("st-pr", 70, 18), slot("st-ls", 50, 68),
            slot("st-k", 38, 80), slot("st-p", 62, 80),
        ]
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)

        // K/P at y=80 are 24% apart → 88.8pt, clamped to 36.
        #expect(layout.dotSize == DepthChartFieldLayout.maxDotSize)
        assertNoTouching(slots, layout: layout)
    }

    @Test("a row too tight even at the minimum size is re-spread around its centroid")
    func tightRowIsReSpread() {
        // 300pt field → the OL's 8% gap is 24pt, below the 26pt minimum + 2pt gap.
        let size = CGSize(width: 300, height: 650)
        let slots = offenseFormation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)

        #expect(layout.dotSize == DepthChartFieldLayout.minDotSize)
        assertNoTouching(slots, layout: layout)

        // The OL row's centroid must be preserved through the re-spread.
        let rows = DepthChartFieldLayout.rows(in: slots)
        var olKeys: [String] = []
        for row in rows where row.contains(where: { $0.key == "off-c-0" }) {
            olKeys = row.map { $0.key }
            break
        }
        #expect(!olKeys.isEmpty, "the OL row should be present")
        let originalCentroid = olKeys.map { key in slots.first(where: { $0.key == key })!.x }
            .reduce(0, +) / Double(olKeys.count)
        let reSpreadCentroid = olKeys.map { key in layout.positions[key]!.x / size.width * 100 }
            .reduce(0, +) / CGFloat(olKeys.count)
        #expect(abs(originalCentroid - Double(reSpreadCentroid)) < 0.5)
    }

    @Test("dot size stays in the safe range across plausible field widths")
    func dotSizeStaysInRange() {
        for width in stride(from: 300.0, through: 430.0, by: 10.0) {
            let size = CGSize(width: width, height: 650)
            let slots = offenseFormation.map {
                RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
            }
            let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)
            #expect(layout.dotSize >= DepthChartFieldLayout.minDotSize)
            #expect(layout.dotSize <= DepthChartFieldLayout.maxDotSize)
            assertNoTouching(slots, layout: layout)
        }
    }

    @Test("offense with fillWidth spreads to the field edges and runs larger dots (DEP-244)")
    func offenseFillWidthReachesEdges() {
        let slots = offenseFormation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let plain = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)
        let filled = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField, fillWidth: true)

        // The outermost WR (off-wr-0 at x=88 / off-wr-2 at x=12 in the generic offense)
        // should now sit a small margin in from the field edges rather than 12% in.
        let wrKeys = slots.map(\.key).filter { $0.hasPrefix("off-wr") }
        let edgeXs = wrKeys.compactMap { filled.positions[$0]?.x }.sorted()
        let minEdge = edgeXs.first!
        let maxEdge = edgeXs.last!
        #expect(minEdge < 40, "leftmost WR should be pulled toward the left edge, got \(minEdge)")
        #expect(maxEdge > iphoneField.width - 40, "rightmost WR should be pulled toward the right edge, got \(maxEdge)")

        // Stretching widens the OL gaps, so the dot size grows too — visibly bigger.
        #expect(filled.dotSize > plain.dotSize, "fillWidth should enlarge offensive dots")

        // The no-touch guarantee still holds.
        assertNoTouching(slots, layout: filled)

        // Default fillWidth stays false, so existing offense geometry is unchanged.
        let `default` = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)
        #expect(`default`.dotSize == plain.dotSize)
        #expect(abs(plain.dotSize - 27.6) < 0.001)
    }

    @Test("empty input yields a safe default layout")
    func emptyInputDefaults() {
        let layout = DepthChartFieldLayout.compute(slots: [], fieldSize: iphoneField)
        #expect(layout.dotSize == DepthChartFieldLayout.maxDotSize)
        #expect(layout.positions.isEmpty)
    }
}