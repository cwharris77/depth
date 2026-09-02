import CoreGraphics
import Foundation
import Testing
@testable import Depth

// Geometry regression tests for DEP-207/DEP-318. They assert the field's durable
// legibility guarantees — uniform readable dots, collision clearance, receiver separation,
// and honest on/off-line depth — without pinning the tuning constants to duplicate literals.
struct DepthChartFieldLayoutTests {
    // The field on a typical iPhone: screen width minus horizontal padding, height set
    // by `frame(maxHeight: .infinity)` in TeamDetailView (it flexes to the remaining
    // space below the page chrome, above the tab bar).
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
                let pa = renderedPoint(for: a, layout: layout)
                let pb = renderedPoint(for: b, layout: layout)
                let distance = hypot(pa.x - pb.x, pa.y - pb.y)
                #expect(distance + 0.001 >= layout.dotSize + DepthChartFieldLayout.gap, "\(a.key) and \(b.key) are too close: \(distance)pt", sourceLocation: sourceLocation)
            }
        }
    }

    private func renderedPoint(for slot: RenderSlot, layout: DepthChartFieldLayout) -> CGPoint {
        let point = layout.positions[slot.key] ?? .zero
        return CGPoint(
            x: point.x,
            y: point.y
                + DepthChartFieldLayout.lineOffset(
                    y: slot.y, onLine: slot.onLine, dotSize: layout.dotSize
                )
        )
    }

    /// Asserts no off-line slot ever renders on the wrong side of the on-line row — the
    /// LOS-crossing shape `resolvingLabelOverlaps` shipped once: an unclamped vertical push
    /// chained through a column of slots stacked at the same x (a 3-3-5's nickel back,
    /// middle linebacker, and nose tackle all sit at x=50) compounded across iterations far
    /// enough to render a linebacker past the defensive line, on the offense's side of the
    /// line of scrimmage. Caught live in the simulator on the Jets' real personnel, not by
    /// the geometry test suite, since every existing test only asserted "no overlap," never
    /// "still the correct side of the line" — this closes that gap.
    private func assertNoLineCrossing(
        _ slots: [RenderSlot], layout: DepthChartFieldLayout,
        context: String = "",
        sourceLocation: SourceLocation = #_sourceLocation
    ) {
        guard let lineY = slots.first(where: { $0.onLine == true })
            .map({ renderedPoint(for: $0, layout: layout).y })
        else { return }
        for slot in slots where slot.onLine != true {
            let y = renderedPoint(for: slot, layout: layout).y
            #expect(
                y < lineY,
                "\(context.isEmpty ? "" : "[\(context)] ")\(slot.key) rendered at y=\(y), past the on-line row at y=\(lineY)",
                sourceLocation: sourceLocation
            )
        }
    }

    /// DEP-431: every unit is framed to the card, so each one should actually use most of
    /// the height available to it. Before framing, the shared 0–100 charted space meant a
    /// unit only ever occupied its own band of the card — measured, the defense used 39% of
    /// the height and the offense 25%, with the opposing half left empty, which is what made
    /// a tight front unreadable.
    ///
    /// The floor is 45% of *dot-center to dot-center*, which is a good deal less than how
    /// full the card looks: the framed extent also carries the label block under the lowest
    /// dot and the margin kept past the line of scrimmage, neither of which sits between two
    /// centers. `maxFramingScale` is what binds here — the offense charts into so little
    /// vertical space that even the full 2x stretch only spans ~51% center-to-center (the
    /// defense, starting wider, clears 60%). So this asserts the doubling happened at all
    /// rather than pinning the constants, which are tuning.
    @Test("every unit is framed to use most of the card's height")
    func unitsFillTheCardVertically() {
        let size = CGSize(width: 370, height: 650)
        let offense = offenseFormation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let defense = baseDefense.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        for (name, slots) in [("offense", offense), ("defense", defense)] {
            let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)
            let ys = slots.map { renderedPoint(for: $0, layout: layout).y }
            guard let top = ys.min(), let bottom = ys.max() else { continue }
            let used = (bottom - top) / size.height
            #expect(used > 0.45, "\(name) only used \(Int(used * 100))% of the card's height")
        }
    }

    @Test("no defensive slot ever renders past the line of scrimmage")
    func noDefensiveSlotCrossesTheLine() {
        let sizes = [
            CGSize(width: 370, height: 650), CGSize(width: 370, height: 470),
            CGSize(width: 402, height: 580), CGSize(width: 402, height: 420),
        ]
        for code in ["3-4-4", "4-3-4", "2-4-5", "1-4-6", "4-2-5", "4-1-6", "4-0-7", "3-3-5"] {
            for size in sizes {
                let formation = buildRealDefenseFormation(code)
                let slots = formation.map {
                    RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
                }
                let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)
                assertNoLineCrossing(slots, layout: layout, context: "\(code) at \(size.width)x\(size.height)")
            }
        }
    }

    /// Every real per-team offensive alignment (`buildRealFormation`'s alignment ×
    /// personnel space) across a spread of plausible field sizes never lets a tag reach a
    /// neighboring dot. Regression coverage for the shotgun QB/RB case and, more
    /// importantly, for the fix itself: an earlier version of `resolvingLabelOverlaps`
    /// passed the narrower `shotgunQbTagClearsRbDot` test below while still visibly
    /// knocking an under-center running back off to one side of the QB it's charted
    /// directly behind — this sweep is what actually caught that regression.
    @Test("no real offensive alignment ever lets a tag reach a neighboring dot")
    func noOffensiveAlignmentEverLabelOverlaps() {
        let sizes = [
            CGSize(width: 370, height: 650), CGSize(width: 370, height: 470),
            CGSize(width: 402, height: 580), CGSize(width: 402, height: 420),
        ]
        for alignment in ["UNDER CENTER", "SHOTGUN", "PISTOL"] {
            for code in ["10", "11", "12", "20", "21", "01", "02", "22"] {
                for size in sizes {
                    let formation = buildRealFormation(alignment: alignment, code: code)
                    let slots = formation.map {
                        RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
                    }
                    let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)
                    assertNoLabelOverlap(
                        slots, layout: layout,
                        context: "\(alignment) \(code) at \(size.width)x\(size.height)"
                    )
                }
            }
        }
    }

    @Test("phone layouts use one readable dot size across units")
    func offenseDotsNeverTouch() {
        let offense = offenseFormation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let defense = baseDefense.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        let special = [
            slot("st-kr", 30, 18), slot("st-pr", 70, 18), slot("st-ls", 50, 68),
            slot("st-k", 38, 80), slot("st-p", 62, 80),
        ]
        let layouts = [offense, defense, special].map {
            DepthChartFieldLayout.compute(slots: $0, fieldSize: iphoneField)
        }

        #expect(Set(layouts.map(\.dotSize)).count == 1, "every unit should use one uniform dot size")
        #expect(layouts.allSatisfy { $0.dotSize >= DepthChartFieldLayout.minDotSize })
        assertNoTouching(offense, layout: layouts[0])
        assertNoTouching(defense, layout: layouts[1])
        assertNoTouching(special, layout: layouts[2])
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

    @Test("a tight offense preserves receiver clearance and line depth")
    func tightRowIsReSpread() {
        let size = CGSize(width: 300, height: 650)
        // Both off-line receivers are charted in the same tight row as the five-man
        // interior. This is the exact shape that must split into receiver strips rather
        // than flattening all seven slots into one evenly spaced wall.
        let slots = [
            RenderSlot(key: "wr-left", x: 24, y: 54, label: "WR", player: nil, onLine: false),
            RenderSlot(key: "lt", x: 34, y: 51, label: "LT", player: nil, onLine: true),
            RenderSlot(key: "lg", x: 42, y: 51, label: "LG", player: nil, onLine: true),
            RenderSlot(key: "c", x: 50, y: 51, label: "C", player: nil, onLine: true),
            RenderSlot(key: "rg", x: 58, y: 51, label: "RG", player: nil, onLine: true),
            RenderSlot(key: "rt", x: 66, y: 51, label: "RT", player: nil, onLine: true),
            RenderSlot(key: "wr-right", x: 76, y: 54, label: "WR", player: nil, onLine: false),
        ]
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)

        assertNoTouching(slots, layout: layout)

        let onLine = slots.filter { $0.onLine == true }
        let lineYs = onLine.map { renderedPoint(for: $0, layout: layout).y }
        #expect(lineYs.allSatisfy { abs($0 - lineYs[0]) < 0.001 }, "on-line slots should render on one row")

        let offLine = slots.filter { $0.onLine != true }
        for slot in offLine {
            let y = renderedPoint(for: slot, layout: layout).y
            #expect(
                lineYs.allSatisfy { abs(y - $0) >= layout.dotSize / 2 },
                "\(slot.key) should remain visibly off the line"
            )
        }

        let interior = onLine.filter { $0.label != "WR" }
        for receiver in slots.filter({ $0.label == "WR" && $0.onLine != true }) {
            let receiverX = renderedPoint(for: receiver, layout: layout).x
            guard let nearest = interior.min(by: {
                abs(renderedPoint(for: $0, layout: layout).x - receiverX)
                    < abs(renderedPoint(for: $1, layout: layout).x - receiverX)
            }) else { continue }
            let interiorX = renderedPoint(for: nearest, layout: layout).x
            #expect(
                abs(receiverX - interiorX) - layout.dotSize >= DepthChartFieldLayout.receiverClearance,
                "\(receiver.key) should keep a real gap from \(nearest.key)"
            )
        }
    }

    /// Asserts no slot's unconditional position-tag block (drawn below every dot
    /// regardless of crowding) intersects another slot's dot — the DEP-427 "LB tag over
    /// DL dot" shape and its offense analog, a shotgun QB's tag over the RB behind it.
    private func assertNoLabelOverlap(
        _ slots: [RenderSlot], layout: DepthChartFieldLayout,
        context: String = "",
        sourceLocation: SourceLocation = #_sourceLocation
    ) {
        for a in slots {
            let pa = renderedPoint(for: a, layout: layout)
            let tagZone = CGRect(
                x: pa.x - DepthChartFieldLayout.nameMinWidth / 2,
                y: pa.y + layout.dotSize / 2 + DepthChartFieldLayout.labelTopGap,
                width: DepthChartFieldLayout.nameMinWidth,
                height: DepthChartFieldLayout.labelBlockHeight
            )
            for b in slots where b.key != a.key {
                let pb = renderedPoint(for: b, layout: layout)
                let dotRect = CGRect(
                    x: pb.x - layout.dotSize / 2, y: pb.y - layout.dotSize / 2,
                    width: layout.dotSize, height: layout.dotSize
                )
                #expect(
                    !tagZone.intersects(dotRect),
                    "\(context.isEmpty ? "" : "[\(context)] ")\(a.key)'s position tag overlaps \(b.key)'s dot",
                    sourceLocation: sourceLocation
                )
            }
        }
    }

    @Test("shotgun QB's position tag never overlaps the RB dot behind it")
    func shotgunQbTagClearsRbDot() {
        for code in ["10", "11", "20", "21"] {
            let formation = buildRealFormation(alignment: "SHOTGUN", code: code)
            let slots = formation.map {
                RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
            }
            let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)
            assertNoTouching(slots, layout: layout)
            assertNoLabelOverlap(slots, layout: layout)
        }
    }

    @Test("a 4-3 front's edge linebacker tag never overlaps the DL dot behind it (DEP-427)")
    func baseFourThreeLbTagClearsDlDot() {
        // The Jets' base 4-3 from DEP-427: dl=4 spreads x 24...76, lb=3 spreads x
        // 26...74 — the outer LB slots land almost directly above the edge DL slots.
        let formation = buildRealDefenseFormation("4-3-4")
        let slots = formation.map {
            RenderSlot(key: $0.id, x: $0.x, y: $0.y, label: $0.label, player: nil, onLine: $0.onLine)
        }
        // The real device height from DEP-427's report, shorter than the generic
        // iphoneField fixture — this is where the overlap actually reproduced.
        let size = CGSize(width: 370, height: 470)
        let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: size)
        assertNoTouching(slots, layout: layout)
        assertNoLabelOverlap(slots, layout: layout)
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

    @Test("offense with fillWidth reaches the field edges (DEP-244)")
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

        // Omitting fillWidth remains equivalent to the explicit default.
        let `default` = DepthChartFieldLayout.compute(slots: slots, fieldSize: iphoneField)
        #expect(`default` == plain)
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
    /// minus the page's horizontal padding.
    ///
    /// The height is deliberately 400 rather than the 477 this fixture originally used.
    /// DEP-431's framing gives a unit roughly twice the vertical room it had, and at 477
    /// every name in this nickel front now fits inline — the layout emits zero callouts, so
    /// the leader-line assertions below would pass vacuously and stop covering the routing
    /// logic at all. 400 is inside the range where crowding (and therefore callouts) still
    /// genuinely occurs — short/landscape/split-screen viewports — which is exactly where
    /// leader lines still ship, so this keeps the routing logic under real test.
    /// Measured on this fixture: ≤440pt still produces callouts, ≥480pt produces none.
    private let phoneField = CGSize(width: 367, height: 400)

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
