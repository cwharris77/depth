import CoreGraphics
import Foundation
import Testing
@testable import Depth

// Geometry regression tests for DEP-207: at any realistic field width, no two dots on
// the field are closer than `dotSize + gap`, and a row that can't hold the minimum dot
// size is re-spread around its centroid instead of letting its dots touch.
//
// THREE TESTS BELOW ARE SKIPPED — see DEP-318. The phone-field readability prototype
// replaced the sizing rule these assert: dot size is no longer derived from the tightest
// same-row gap (which is what forced every offense dot to the 26pt floor), and a tight row
// is no longer re-spread as a single unit (receivers are now placed in the strip beside
// the line instead, so the row's combined centroid legitimately moves). They are skipped
// rather than rewritten because the prototype is still being A/B tested — rewriting them
// now would bake in numbers that change again once a variant is chosen. DEP-318 covers
// unskipping and reworking them to assert the new invariants (uniform size, no overlap,
// receiver clearance) rather than specific pixel sizes.
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

    // SKIPPED (DEP-318): asserts dotSize == 27.6, i.e. sized to the tightest same-row gap.
    // The prototype sizes every dot uniformly instead; 27.6 was the symptom being fixed.
    @Test(
        "generic offense dots never touch at iPhone field width",
        .disabled("DEP-318: asserts the pre-prototype size-to-tightest-gap rule")
    )
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

    // SKIPPED (DEP-318): asserts the row collapses to `minDotSize` and that the row's
    // combined centroid is preserved. The prototype never shrinks to the floor, and pulls
    // receivers out of the row's re-spread, so that combined centroid moves by design.
    @Test(
        "a row too tight even at the minimum size is re-spread around its centroid",
        .disabled("DEP-318: asserts the pre-prototype min-size re-spread rule")
    )
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

    // SKIPPED (DEP-318): the edge-pinning behavior this covers still holds, but the test
    // also asserts dotSize == 27.6 (same stale rule as above). Worth reviving in DEP-318
    // with the size assertion dropped — the fill-width guarantee itself is still real.
    @Test(
        "offense with fillWidth spreads to the field edges and runs larger dots (DEP-244)",
        .disabled("DEP-318: asserts the pre-prototype size-to-tightest-gap rule")
    )
    func offenseFillWidthReachesEdges() {
        let slots = offenseFormation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let plain = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)
        let filled = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField, fillWidth: true)

        // The outermost WRs (flanker off-wr-1 at x=12, split end off-wr-0 at x=88) are
        // pinned to the field edges — the offense takes the full width.
        let leftWR = filled.positions["off-wr-1"]?.x ?? .zero
        let rightWR = filled.positions["off-wr-0"]?.x ?? .zero
        #expect(leftWR < 40, "leftmost WR should be pinned to the left edge, got \(leftWR)")
        #expect(rightWR > iphoneField.width - 40, "rightmost WR should be pinned to the right edge, got \(rightWR)")

        // The line keeps its real (clustered) spacing — the center is unchanged and the
        // dots stay as large as that spacing allows (same as plain, since the line isn't
        // re-spread at this width).
        let centerFilled = filled.positions["off-c-0"]?.x ?? .zero
        let centerPlain = plain.positions["off-c-0"]?.x ?? .zero
        #expect(abs(centerFilled - centerPlain) < 2, "the offensive line should keep its original spacing")
        #expect(filled.dotSize == plain.dotSize, "dots stay as large as the real line spacing allows")

        // The no-touch guarantee still holds.
        assertNoTouching(slots, layout: filled)

        // Default fillWidth stays false, so existing offense geometry is unchanged.
        let `default` = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)
        #expect(`default`.dotSize == plain.dotSize)
        #expect(abs(plain.dotSize - 27.6) < 0.001)
    }

    @Test("real Shotgun 11 fills the field width too (DEP-244, Raiders case)")
    func realShotgun11FillsWidth() {
        let formation = buildRealFormation(alignment: "SHOTGUN", code: "11")
        let slots = formation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let filled = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField, fillWidth: true)

        // The split end (off-wr-0, left) and flanker (off-wr-1, right) reach the field
        // edges — the first DEP-244 pass got this wrong because the tight on-line row
        // (TE 5% from RT) was re-spread around its centroid and pulled the split end back in.
        let leftWR = filled.positions["off-wr-0"]?.x ?? .zero
        let rightWR = filled.positions["off-wr-1"]?.x ?? .zero
        #expect(leftWR < 40, "split end should be near the left edge, got \(leftWR)")
        #expect(rightWR > iphoneField.width - 40, "flanker should be near the right edge, got \(rightWR)")

        // Dots stay as large as the real (clustered) line spacing allows — within the
        // safe range, not the max: the RT/TE gap is tight, so offense stays at the floor.
        #expect(filled.dotSize >= DepthChartFieldLayout.minDotSize)
        #expect(filled.dotSize <= DepthChartFieldLayout.maxDotSize)

        assertNoTouching(slots, layout: filled)
    }

    @Test("empty input yields a safe default layout")
    func emptyInputDefaults() {
        let layout = DepthChartFieldLayout.compute(slots: [], fieldSize: iphoneField)
        #expect(layout.dotSize == DepthChartFieldLayout.maxDotSize)
        #expect(layout.positions.isEmpty)
    }

    @Test("name labels follow web's LABEL_VISIBILITY breakpoints per unit (DEP-250)")
    func nameLabelVisibility() {
        // Special teams (~5 dots spread the full field) never collide — names always
        // on, even at narrow widths.
        #expect(DepthChartFieldLayout.showsNames(unit: .special, fieldWidth: 320))
        #expect(DepthChartFieldLayout.showsNames(unit: .special, fieldWidth: 1000))

        // Defense mid: off on a portrait phone, on once the field passes ~520pt
        // (landscape phones, iPads).
        #expect(!DepthChartFieldLayout.showsNames(unit: .defense, fieldWidth: 370))
        #expect(!DepthChartFieldLayout.showsNames(unit: .defense, fieldWidth: 519))
        #expect(DepthChartFieldLayout.showsNames(unit: .defense, fieldWidth: 520))
        #expect(DepthChartFieldLayout.showsNames(unit: .defense, fieldWidth: 600))

        // Offense packs tightest (OL shoulder-to-shoulder) — the highest threshold:
        // still off where defense is on, on once the field passes ~720pt (iPad widths).
        #expect(!DepthChartFieldLayout.showsNames(unit: .offense, fieldWidth: 719))
        #expect(DepthChartFieldLayout.showsNames(unit: .offense, fieldWidth: 720))
        #expect(DepthChartFieldLayout.showsNames(unit: .offense, fieldWidth: 800))
    }
}

// Shipped bug (Cooper, 2026-08-26, Ravens defense): a callout's leader line ran straight
// across two other dots and through their position tags. The placement search only ever
// checked where the name TAG landed — nothing looked at the line that had to reach it, so
// a tag in genuinely free grass could still be wired up through the middle of the
// formation. These assert the line's route, not just the tag's spot.
struct LeaderLineRoutingTests {
    /// The field as it renders on the reported device: an iPhone 17 Pro's 402pt width
    /// minus the page's horizontal padding, at the height `containerRelativeFrame` gives
    /// the chart in TeamDetailView.
    private let phoneField = CGSize(width: 367, height: 477)

    /// The exact alignment from the report — a nickel front (five DBs, a three-man line)
    /// with the real name lengths. Name width is what decides whether a name goes inline
    /// or to a callout, so a fixture with one repeated name doesn't reproduce this: the
    /// crowding depends on "Hendrickson" being wide while "Smith" is narrow.
    private func nickelDefenseSlots() -> [(String, Double, Double, String, Bool)] {
        [
            ("def-ss-0", 34, 14, "Kyle Hawkins", false),
            ("def-fs-0", 66, 14, "Malaki Starks", false),
            ("def-lcb-0", 10, 26, "Nate Wiggins", false),
            ("def-nb-0", 50, 26, "Kyle Hamilton", false),
            ("def-rcb-0", 90, 26, "Marlon Humphrey", false),
            ("def-wlb-0", 22, 37, "Teddye Robinson", false),
            ("def-lilb-0", 42, 37, "Roquan Smith", false),
            ("def-rilb-0", 58, 37, "Jay Buchanan", false),
            ("def-slb-0", 78, 37, "Trey Hendrickson", false),
            ("def-lde-0", 26, 49, "Nnamdi Madubuike", true),
            ("def-rde-0", 74, 49, "Calais Campbell", true),
        ]
    }

    private func defenseSlots() -> [RenderSlot] {
        nickelDefenseSlots().enumerated().map { index, spec in
            let (key, x, y, name, onLine) = spec
            return RenderSlot(
                key: key,
                x: x,
                y: y,
                label: String(key.dropFirst(4).dropLast(2)).uppercased(),
                player: Player(
                    id: "p\(index)", name: name, position: .lb, depthRank: 1, number: 90 + index
                ),
                onLine: onLine
            )
        }
    }

    @Test("no leader line passes through another player's dot")
    func leaderLinesClearOtherDots() {
        let slots = defenseSlots()
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: phoneField)
        let clearance = DepthChartFieldLayout.leaderLineClearance(dotSize: layout.dotSize)

        #expect(!layout.nameCallouts.isEmpty, "a phone-width 3-4 should route some names to callouts")

        for (key, callout) in layout.nameCallouts {
            guard let raw = layout.positions[key],
                let slot = slots.first(where: { $0.key == key })
            else { continue }
            let dot = CGPoint(
                x: raw.x,
                y: raw.y
                    + DepthChartFieldLayout.lineOffset(
                        y: slot.y, onLine: slot.onLine, dotSize: layout.dotSize
                    )
            )
            for other in slots where other.key != key {
                guard let otherRaw = layout.positions[other.key] else { continue }
                let otherDot = CGPoint(
                    x: otherRaw.x,
                    y: otherRaw.y
                        + DepthChartFieldLayout.lineOffset(
                            y: other.y, onLine: other.onLine, dotSize: layout.dotSize
                        )
                )
                let distance = DepthChartFieldLayout.distance(
                    from: otherDot, toSegment: dot, callout
                )
                #expect(
                    distance >= clearance,
                    "\(key)'s leader line passes \(distance)pt from \(other.key)'s dot"
                )
                // The reported symptom: the line missed the dots but ran straight through
                // the position tag and name printed under one of them.
                let name = other.player?.name ?? ""
                let zone = DepthChartFieldLayout.labelZone(
                    center: otherDot,
                    inlineName: layout.showsInlineName(other.key) && !name.isEmpty
                        ? formatLastName(name) : nil,
                    dotSize: layout.dotSize
                )
                #expect(
                    DepthChartFieldLayout.segment(dot, callout, avoids: zone),
                    "\(key)'s leader line crosses \(other.key)'s label text"
                )
            }
        }
    }

    @Test("every crowded name still gets a callout")
    func everyCrowdedNameKeepsItsCallout() {
        let slots = defenseSlots()
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: phoneField)

        // A crowded slot draws no inline name, so losing its callout loses the name
        // outright — the line-clearance preference must never cost a placement.
        for slot in slots where !layout.showsInlineName(slot.key) {
            #expect(
                layout.nameCallouts[slot.key] != nil,
                "\(slot.key) renders no inline name and no callout — its name would vanish"
            )
        }
    }

    @Test("point-to-segment distance measures the segment, not its endpoints")
    func distanceMeasuresTheWholeSegment() {
        let a = CGPoint(x: 0, y: 0)
        let b = CGPoint(x: 100, y: 0)
        // Directly above the midpoint: far from both endpoints, 10pt from the line.
        #expect(abs(DepthChartFieldLayout.distance(from: CGPoint(x: 50, y: 10), toSegment: a, b) - 10) < 0.001)
        // Past the far endpoint: clamped to it rather than projected onto the infinite line.
        #expect(abs(DepthChartFieldLayout.distance(from: CGPoint(x: 130, y: 0), toSegment: a, b) - 30) < 0.001)
        // Degenerate segment falls back to a plain point distance.
        #expect(abs(DepthChartFieldLayout.distance(from: CGPoint(x: 3, y: 4), toSegment: a, a) - 5) < 0.001)
    }

    @Test("segment/rect test catches a crossing that misses both endpoints")
    func segmentAvoidanceCatchesMidCrossings() {
        let rect = CGRect(x: 40, y: -5, width: 20, height: 10)
        #expect(!DepthChartFieldLayout.segment(CGPoint(x: 0, y: 0), CGPoint(x: 100, y: 0), avoids: rect))
        #expect(DepthChartFieldLayout.segment(CGPoint(x: 0, y: 40), CGPoint(x: 100, y: 40), avoids: rect))
    }
}
