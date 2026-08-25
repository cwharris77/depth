import CoreGraphics
import Foundation

// Pure geometry for the depth-chart field (DEP-207). Given a unit's resolved slots
// (percentage x/y coordinates) and the field's on-screen size, picks the largest dot
// diameter at which no two dots sit closer than `dotSize + gap`, and re-spreads any row
// that still can't fit at the minimum size around its centroid. Deliberately free of
// SwiftUI so the overlap guarantee is unit-testable without a view — DepthChartFieldView
// just applies the returned size and positions.
//
// The 44-point tap target is the view's job (.frame(minWidth: 44, minHeight: 44) +
// .contentShape), matching the web's 30px visual dot with a 44px hit-slop; this type
// only decides what's actually drawn.
/// The three name-presentation styles selectable in Settings › Settings (DEP-323) and
/// drawn by DepthChartFieldView. The geometry is identical in all three — only what
/// happens to the names differs, so a switch is purely a presentation choice.
enum FieldNameMode: String, CaseIterable, Identifiable, Sendable {
    /// Names under the dot wherever one fits, and a leader-line callout for the rest.
    case callouts
    /// Names under the dot wherever one fits; a name with no room is simply not drawn.
    case inlineOnly
    /// No names anywhere — jersey number and position tag only, as the field shipped.
    case off

    var id: String { rawValue }

    /// The one defaults key Settings writes and the field reads. The value predates
    /// DEP-323 (it started as the beta experiment's key); it is kept as-is so a user's
    /// existing choice survives promotion to a permanent setting.
    static let storageKey = "betaFieldNameMode"

    var title: String {
        switch self {
        case .callouts: return "Names + Leader Lines"
        case .inlineOnly: return "Names Where They Fit"
        case .off: return "No Names"
        }
    }
}

struct DepthChartFieldLayout: Equatable {
    /// Visual dot diameter in points.
    let dotSize: CGFloat
    /// Center of each slot, in points, keyed by `RenderSlot.key`.
    let positions: [String: CGPoint]
    /// THROWAWAY PROTOTYPE (not landed): slots whose real spacing is still too tight for a
    /// name even after the uniform-size stretch below — draw the name via a leader line to
    /// this point instead of under the dot. Empty when every slot has room. If this
    /// direction is adopted for real, `DepthChartFieldLayoutTests` needs a rewrite: it
    /// currently asserts dot size is *derived* from the tightest gap (27.6pt for the
    /// generic on-line row), which this file no longer does.
    let nameCallouts: [String: CGPoint]
    /// Slots whose name must NOT render under the dot. In the leader-line variant that is
    /// exactly the callout set, so this stays empty and `nameCallouts` answers it; the
    /// other two variants draw no callouts and use this instead — either the slots with no
    /// room (`inlineOnly`) or every slot (`off`).
    var crowdedKeys: Set<String> = []

    /// Whether this slot's name renders under its own dot.
    func showsInlineName(_ key: String) -> Bool {
        nameCallouts[key] == nil && !crowdedKeys.contains(key)
    }

    static let minDotSize: CGFloat = 26
    /// THROWAWAY PROTOTYPE, per Cooper 2026-08-23: 32 rather than 36. At 36 the six-man
    /// interior run (five linemen plus a tight end) eats ~190pt of a ~367pt row, leaving
    /// no room for the receivers to sit visibly off the line — the whole offense collapsed
    /// into one evenly spaced wall. 32 buys back the strip the receivers need while still
    /// reading much larger than the old size-to-the-tightest-gap result (27.6pt), and it
    /// stays uniform across offense/defense/special, which was the point of the change.
    static let maxDotSize: CGFloat = 32
    static let gap: CGFloat = 2
    /// Deliberate empty space between the outermost interior dot (tackle or tight end) and
    /// the nearest receiver — the visual gap that says "this receiver is split out", not
    /// just "these dots don't touch".
    static let receiverClearance: CGFloat = 10
    /// Max y spread (percent of field height) that still counts as one row.
    static let rowTolerancePct: CGFloat = 3
    /// Minimum on-screen width (pt) a last name realistically needs. A slot stretched to
    /// less room than this routes its name through a leader-line callout instead.
    static let nameMinWidth: CGFloat = 44

    /// Web parity (components/PlayerDot.tsx `LABEL_VISIBILITY`): whether a unit's player
    /// names render under each dot at a given field width. Offense (OL shoulder-to-
    /// shoulder) packs tightest so it needs the most room; defense mid; special teams
    /// (~5 dots spread the full field) never collide so names are always on. Web keys
    /// this off viewport width (`min-[720px]`/`min-[520px]`); native keys it off the
    /// field's own width, which tracks the device width (screen minus horizontal
    /// padding), so the same thresholds land on the same breakpoints.
    static func showsNames(unit: Unit, fieldWidth: CGFloat) -> Bool {
        switch unit {
        case .offense: return fieldWidth >= 720
        case .defense: return fieldWidth >= 520
        case .special: return true
        }
    }

    /// Groups slots into rows by y proximity (percent coordinates, greedy on sorted y).
    /// Shared by `compute` and the geometry tests so "same row" has one definition.
    static func rows(in slots: [RenderSlot]) -> [[RenderSlot]] {
        var rows: [[RenderSlot]] = []
        for slot in slots.sorted(by: { $0.y < $1.y }) {
            if let first = rows.last?.first, slot.y - first.y <= rowTolerancePct {
                rows[rows.count - 1].append(slot)
            } else {
                rows.append([slot])
            }
        }
        return rows
    }

    /// `fillWidth` (offense, DEP-244): the offense always fills the field's full width —
    /// the outermost wide receivers are pinned to the left/right edges while the line
    /// keeps its real (tight) formation spacing, and the dots are sized as large as that
    /// spacing allows.
    static func compute(
        slots: [RenderSlot],
        fieldSize: CGSize,
        fillWidth: Bool = false,
        nameMode: FieldNameMode = .callouts
    ) -> DepthChartFieldLayout {
        let width = fieldSize.width
        guard width > 0, fieldSize.height > 0, !slots.isEmpty else {
            return DepthChartFieldLayout(dotSize: maxDotSize, positions: [:], nameCallouts: [:])
        }
        let base = fillWidth
            ? fillingLayout(slots: slots, width: width, height: fieldSize.height)
            : standardLayout(slots: slots, width: width, height: fieldSize.height)
        // Only the leader-line variant draws callouts. The other two want the same
        // geometry with no callout points at all — and because a slot renders its name
        // inline exactly when it has NO callout, `inlineOnly` needs the crowded slots
        // marked some other way, which is `crowdedKeys` below.
        guard nameMode == .callouts else {
            return DepthChartFieldLayout(
                dotSize: base.dotSize,
                positions: base.positions,
                nameCallouts: [:],
                crowdedKeys: nameMode == .inlineOnly
                    ? Set(
                        calloutsForCrowdedNames(
                            positions: base.positions,
                            slots: slots,
                            dotSize: base.dotSize,
                            width: width,
                            height: fieldSize.height
                        ).keys
                    )
                    : Set(slots.map(\.key))
            )
        }
        return DepthChartFieldLayout(
            dotSize: base.dotSize,
            positions: base.positions,
            nameCallouts: calloutsForCrowdedNames(
                positions: base.positions,
                slots: slots,
                dotSize: base.dotSize,
                width: width,
                height: fieldSize.height
            )
        )
    }

    /// Height of the label block drawn under a dot (position tag + name line).
    static let labelBlockHeight: CGFloat = 28
    /// Gap between a dot's edge and the top of its label block.
    static let labelTopGap: CGFloat = 3
    /// Rough rendered width of a name at the field's label size. Bold SF at ~9pt runs a
    /// little over half the point size per character; the pad covers the callout pill's
    /// own horizontal padding, so one estimate serves both inline and callout placement.
    static func estimatedNameWidth(_ name: String) -> CGFloat {
        max(30, CGFloat(name.count) * 5.8 + 12)
    }

    /// Web parity (components/PlayerDot.tsx): an on-line dot is nudged a radius onto its
    /// own side of the line of scrimmage. Layout has to account for it or every collision
    /// test is off by that much for exactly the most crowded row on the field.
    static func lineOffset(y: Double, onLine: Bool?, dotSize: CGFloat) -> CGFloat {
        guard onLine == true else { return 0 }
        return y >= 50 ? dotSize / 2 + 3 : -(dotSize / 2 + 3)
    }

    /// THROWAWAY PROTOTYPE, per Cooper 2026-08-23: decides which names can't be drawn under
    /// their own dot, working in real rectangles against the FINAL positions.
    ///
    /// Earlier versions compared dot CENTERS and missed the cases that actually show up: a
    /// name is far wider than its dot, so it collides with the dot *below* it (a nickel
    /// back's name landing across the linebackers) and runs off the field edge, neither of
    /// which a center-distance test can see. So each label is modelled as the rectangle it
    /// really occupies and rejected if it leaves the field or hits another dot or label.
    ///
    /// The backfield is placed FIRST so it wins the argument for an inline name wherever
    /// one fits (per Cooper: a quarterback's and back's names should read under the dot
    /// like a receiver's, not on a leader line). It is a priority, not an exemption —
    /// forcing them inline regardless put a quarterback's name across the tailback's dot.
    private static func calloutsForCrowdedNames(
        positions: [String: CGPoint],
        slots: [RenderSlot],
        dotSize: CGFloat,
        width: CGFloat,
        height: CGFloat
    ) -> [String: CGPoint] {
        let named = slots.filter { ($0.player?.name.isEmpty == false) && positions[$0.key] != nil }
        guard !named.isEmpty else { return [:] }

        func center(_ slot: RenderSlot) -> CGPoint {
            let p = positions[slot.key]!
            return CGPoint(x: p.x, y: p.y + lineOffset(y: slot.y, onLine: slot.onLine, dotSize: dotSize))
        }
        func dotRect(_ slot: RenderSlot) -> CGRect {
            let c = center(slot)
            return CGRect(
                x: c.x - dotSize / 2, y: c.y - dotSize / 2, width: dotSize, height: dotSize
            )
        }
        func labelRect(_ slot: RenderSlot) -> CGRect {
            let c = center(slot)
            let w = estimatedNameWidth(formatLastName(slot.player?.name ?? ""))
            return CGRect(
                x: c.x - w / 2,
                y: c.y + dotSize / 2 + labelTopGap,
                width: w,
                height: labelBlockHeight
            )
        }

        let field = CGRect(x: 0, y: 0, width: width, height: height)
        let allDots = named.map(dotRect)

        // Backfield first so it always wins its spot, then left to right for a stable,
        // predictable result rather than one that depends on slot order.
        let ordered = named.sorted { a, b in
            let aFixed = a.label == "QB" || a.label == "RB"
            let bFixed = b.label == "QB" || b.label == "RB"
            if aFixed != bFixed { return aFixed }
            return center(a).x < center(b).x
        }

        var placedLabels: [CGRect] = []
        var crowded: [RenderSlot] = []
        for slot in ordered {
            let rect = labelRect(slot)
            let hitsDot = zip(named, allDots).contains { other, r in
                other.key != slot.key && r.intersects(rect)
            }
            let fits = field.contains(rect) && !hitsDot && !placedLabels.contains { $0.intersects(rect) }
            if fits {
                placedLabels.append(rect)
            } else {
                crowded.append(slot)
            }
        }
        guard !crowded.isEmpty else { return [:] }

        // THROWAWAY PROTOTYPE, per Cooper 2026-08-23: each callout looks for the nearest
        // free spot to ITS OWN dot rather than every tag marching to one shared half of the
        // field. Sending them all the same way dragged a deep player's name (a fullback's,
        // say) all the way across the formation and over the line of scrimmage when there
        // was open grass just below-left of him. Candidates step outward from the dot,
        // trying the side facing away from the formation first and allowing a sideways
        // nudge, so the leader line stays short and the tag lands in real empty space.
        let formationMidY = named.map { center($0).y }.reduce(0, +) / CGFloat(named.count)
        let step: CGFloat = 24
        var placedTags: [CGRect] = []
        var callouts: [String: CGPoint] = [:]

        for slot in crowded.sorted(by: { center($0).x < center($1).x }) {
            let w = estimatedNameWidth(formatLastName(slot.player?.name ?? ""))
            let dot = center(slot)
            let away: CGFloat = dot.y >= formationMidY ? 1 : -1
            // A slot's OWN dot must not block its tag, and the first ring has to start
            // clear of that dot — otherwise the straight-up position always looked
            // occupied and the tag squeezed out sideways instead of sitting directly
            // above its player, which is the placement that reads.
            let others = zip(named, allDots).filter { $0.0.key != slot.key }.map { $0.1 }
            let firstRing = dotSize / 2 + 16

            var best: CGPoint?
            search: for ring in 0..<8 {
                for direction in [away, -away] {
                    for dx in [CGFloat(0), -w * 0.7, w * 0.7, -w * 1.4, w * 1.4] {
                        let x = min(max(w / 2 + 2, dot.x + dx), width - w / 2 - 2)
                        let y = dot.y + direction * (firstRing + CGFloat(ring) * step)
                        let tag = CGRect(x: x - w / 2, y: y - 9, width: w, height: 18)
                        guard field.contains(tag) else { continue }
                        let padded = tag.insetBy(dx: -6, dy: -2)
                        let blocked =
                            others.contains { $0.intersects(padded) }
                            || placedLabels.contains { $0.intersects(padded) }
                            || placedTags.contains { $0.intersects(padded) }
                        if !blocked {
                            best = CGPoint(x: x, y: y)
                            break search
                        }
                    }
                }
            }
            if let best {
                placedTags.append(CGRect(x: best.x - w / 2, y: best.y - 9, width: w, height: 18))
                callouts[slot.key] = best
            }
        }
        return callouts
    }

    /// THROWAWAY PROTOTYPE (not landed — see `nameCallouts`'s doc comment): every slot
    /// targets one uniform, comfortable dot size (`maxDotSize`) instead of shrinking to
    /// whatever the tightest row can fit — the shoulder-to-shoulder O-line should read
    /// the same size as everyone else, not smaller. A maximal *cluster* of adjacent
    /// same-row slots whose real gaps can't hold that size is stretched (never
    /// compressed) just enough around its own centroid — order, y, and every
    /// already-roomy neighbor in the same row (e.g. a flanker 14% from the tackle) stay
    /// exactly as charted; only the genuinely tight run moves. A stretched cluster still
    /// isn't wide enough for a name (`nameMinWidth` > the stretch target), so its members
    /// get a staggered `nameCallouts` point instead.
    private static func standardLayout(
        slots: [RenderSlot],
        width: CGFloat,
        height: CGFloat
    ) -> DepthChartFieldLayout {
        let dotSize = maxDotSize

        var centers: [String: CGPoint] = [:]
        for slot in slots {
            centers[slot.key] = CGPoint(
                x: width * slot.x / 100,
                y: height * slot.y / 100
            )
        }

        let spacing = dotSize + gap
        let spacingPct = spacing / width * 100

        for row in rows(in: slots) where row.count > 1 {
            let sortedRow = row.sorted(by: { $0.x < $1.x })
            var i = 0
            while i < sortedRow.count {
                var j = i
                while j + 1 < sortedRow.count,
                    (sortedRow[j + 1].x - sortedRow[j].x) / 100 * width < spacing
                {
                    j += 1
                }
                guard j > i else {
                    i += 1
                    continue
                }

                let cluster = Array(sortedRow[i...j])
                // THROWAWAY PROTOTYPE, per Cooper 2026-08-23: a receiver's DISTANCE from
                // the line is what tells you the formation (is this WR in the slot or
                // split wide?), so a WR must never be interleaved into the line's evenly
                // spaced grid — that erases the one measurement worth reading. Only the
                // interior run, whose internal spacing carries no such signal (nobody
                // reads "is the guard 8% or 9% from center"), gets flattened to uniform
                // spacing around its own centroid; a WR caught in the same tight run is
                // instead pushed the minimum distance clear of it, preserving how close
                // it really lines up.
                let interior = cluster.filter { $0.label != "WR" }
                let receivers = cluster.filter { $0.label == "WR" }

                if interior.count > 1 {
                    let centroid = interior.map(\.x).reduce(0, +) / CGFloat(interior.count)
                    let spanPct = spacingPct * CGFloat(interior.count - 1)
                    let startPct = max(0, min(100 - spanPct, centroid - spanPct / 2))
                    for (k, slot) in interior.enumerated() {
                        centers[slot.key] = CGPoint(
                            x: width * (startPct + spacingPct * CGFloat(k)) / 100,
                            y: height * slot.y / 100
                        )
                    }
                }

                // THROWAWAY PROTOTYPE, per Cooper 2026-08-23: the gap between the receivers
                // and the end of the line is the formation's signature, and pushing a
                // receiver only the minimum distance clear of the line erased it — every
                // dot ended up in one evenly spaced wall. Instead each side's receivers get
                // the whole strip of field left over beside the interior run: the outermost
                // sits at the sideline, the rest spread inward across that strip, and a
                // deliberate `receiverClearance` keeps the innermost off the line. Order and
                // side are preserved; only the exact proportion gives way, which is the part
                // that can't survive a phone's width anyway.
                if !interior.isEmpty && !receivers.isEmpty {
                    let interiorCenters = interior.map { centers[$0.key]!.x }
                    let clusterLeft = interiorCenters.min()! - dotSize / 2
                    let clusterRight = interiorCenters.max()! + dotSize / 2
                    let interiorRealXs = interior.map(\.x)
                    let edgeInset = dotSize / 2 + 4

                    for side in [-1.0, 1.0] {
                        let group = side < 0
                            ? receivers.filter { $0.x < interiorRealXs.min()! }
                                .sorted { $0.x < $1.x }
                            : receivers.filter { $0.x > interiorRealXs.max()! }
                                .sorted { $0.x > $1.x }
                        guard !group.isEmpty else { continue }

                        // The strip runs from the sideline to a deliberate clearance off
                        // the line. Each receiver lands where its CHARTED x falls within
                        // that strip proportionally — a slot receiver charted just off the
                        // tackle stays just off the tackle, and one charted at the numbers
                        // stays out wide. An earlier version dropped a lone receiver
                        // straight on the sideline, which is how a slot receiver ended up
                        // stacked underneath the split end already standing there.
                        let outer = side < 0 ? edgeInset : width - edgeInset
                        let inner = side < 0
                            ? clusterLeft - receiverClearance - dotSize / 2
                            : clusterRight + receiverClearance + dotSize / 2
                        let chartedEdge = side < 0 ? interiorRealXs.min()! : interiorRealXs.max()!

                        var placed: [(key: String, x: CGFloat, y: Double)] = group.map { wr in
                            let t = side < 0
                                ? (chartedEdge <= 0 ? 1 : CGFloat(wr.x) / CGFloat(chartedEdge))
                                : (chartedEdge >= 100
                                    ? 1
                                    : CGFloat(100 - wr.x) / CGFloat(100 - chartedEdge))
                            let clamped = max(0, min(1, t))
                            return (wr.key, outer + (inner - outer) * clamped, wr.y)
                        }

                        // Then enforce no-touch from the sideline inward, so a proportion
                        // that puts two receivers on top of each other still separates.
                        for k in placed.indices.dropFirst() {
                            let previous = placed[k - 1].x
                            if abs(placed[k].x - previous) < spacing {
                                placed[k].x = previous - CGFloat(side) * spacing
                            }
                        }
                        for entry in placed {
                            centers[entry.key] = CGPoint(
                                x: max(0, min(width, entry.x)),
                                y: height * entry.y / 100
                            )
                        }
                    }
                }

                // Anything still overlapping (a receiver the strip could not hold, an odd
                // formation) slides outward by the minimum, as before.
                let interiorXsPct = interior.map { centers[$0.key]!.x / width * 100 }
                let center = interiorXsPct.isEmpty
                    ? 50
                    : interiorXsPct.reduce(0, +) / CGFloat(interiorXsPct.count)
                var placedXsPct = interiorXsPct
                let inOut = receivers.sorted {
                    abs(centers[$0.key]!.x / width * 100 - center)
                        < abs(centers[$1.key]!.x / width * 100 - center)
                }
                for wr in inOut {
                    var xPct = centers[wr.key]!.x / width * 100
                    // Repeat until clear: sliding off one neighbor can land on the next.
                    for _ in 0..<placedXsPct.count + 1 {
                        guard let hit = placedXsPct.first(where: { abs(xPct - $0) < spacingPct })
                        else { break }
                        xPct = xPct < center ? hit - spacingPct : hit + spacingPct
                    }
                    placedXsPct.append(xPct)
                    centers[wr.key] = CGPoint(
                        x: width * max(0, min(100, xPct)) / 100,
                        y: height * wr.y / 100
                    )
                }
                i = j + 1
            }
        }

        centers = settingOffLineDepth(centers, slots: slots, dotSize: dotSize, height: height)
        centers = resolvingOverlaps(centers, slots: slots, dotSize: dotSize, width: width)
        return DepthChartFieldLayout(dotSize: dotSize, positions: centers, nameCallouts: [:])
    }

    /// THROWAWAY PROTOTYPE, per Cooper 2026-08-23: makes "off the line of scrimmage" legible.
    ///
    /// A slot receiver charts only ~4% deeper than the line — about 24pt — and the on-line
    /// nudge that keeps linemen from straddling the line eats almost all of that, so a
    /// receiver off the line ended up drawn at the same depth as the tackle beside him and
    /// the whole formation read as one flat row. An under-center quarterback had it worse:
    /// he charts 5% back and landed on top of the linemen's own position tags.
    ///
    /// So every off-line slot is pushed clear of the on-line row by its full label block —
    /// the smallest gap that can't be misread as "level with the line", and enough that the
    /// line's tags stay readable. Slots already deeper than that (a shotgun quarterback, the
    /// backfield) don't move; this only ever increases the distance from the line.
    private static func settingOffLineDepth(
        _ centers: [String: CGPoint],
        slots: [RenderSlot],
        dotSize: CGFloat,
        height: CGFloat
    ) -> [String: CGPoint] {
        var centers = centers
        func placed(_ slot: RenderSlot) -> CGFloat? {
            centers[slot.key].map { $0.y + lineOffset(y: slot.y, onLine: slot.onLine, dotSize: dotSize) }
        }
        // Two clearances. A slot behind the line's own labels has to clear the whole label
        // block; one out beyond them (a receiver split wide, where there is nothing under
        // the line to avoid) only needs enough to read as off the line. Using the label
        // clearance for everyone shoved wide receivers as deep as running backs.
        let labelClearance = dotSize / 2 + labelTopGap + labelBlockHeight + 4 + dotSize / 2

        // Each side of the ball is handled on its own: the offense's on-line row is nudged
        // down and its skill players are deeper (larger y), the defense's mirrors that.
        for isOffense in [true, false] {
            let side = slots.filter { isOffense ? $0.y >= 50 : $0.y < 50 }
            let onLine = side.filter { $0.onLine == true }
            let offLine = side.filter { $0.onLine != true }
            guard !onLine.isEmpty else { continue }

            // Everyone on the line is drawn ON one line. `buildRealFormation` promotes
            // receivers to on-line to satisfy the seven-on-the-line rule but leaves them
            // at their charted wing depth, so a promoted receiver rendered BELOW the line
            // it is supposedly on. Snap the whole on-line group to the row nearest the
            // line of scrimmage — which is what "on the line" has to look like.
            let anchors = onLine.compactMap { centers[$0.key]?.y }
            if let lineRowY = isOffense ? anchors.min() : anchors.max() {
                for slot in onLine {
                    guard let current = centers[slot.key] else { continue }
                    centers[slot.key] = CGPoint(x: current.x, y: lineRowY)
                }
            }
            guard !offLine.isEmpty else { continue }

            // The same nudge the on-line row received, in this side's direction.
            let nudge: CGFloat = isOffense ? dotSize / 2 + 3 : -(dotSize / 2 + 3)
            for slot in offLine {
                guard let current = centers[slot.key] else { continue }
                // Does this slot sit behind any of the line's labels?
                let underLabel = onLine.contains { other in
                    guard let p = centers[other.key] else { return false }
                    return abs(p.x - current.x) < nameMinWidth / 2 + dotSize / 2
                }
                guard underLabel else {
                    // Out where nothing sits under the line, the charted depth is already
                    // correct and should simply survive being drawn: the on-line row got
                    // nudged onto its own side of the line, so shifting this slot by the
                    // SAME amount preserves the real gap between them. A flat minimum
                    // instead of this made a split-wide receiver sit several yards off the
                    // line — a flanker drawn like a running back.
                    centers[slot.key] = CGPoint(x: current.x, y: current.y + nudge)
                    continue
                }
                let limit: CGFloat
                if isOffense {
                    guard let lowest = onLine.compactMap(placed).max() else { continue }
                    limit = lowest + labelClearance
                    guard current.y < limit else { continue }
                } else {
                    guard let highest = onLine.compactMap(placed).min() else { continue }
                    limit = highest - labelClearance
                    guard current.y > limit else { continue }
                }
                centers[slot.key] = CGPoint(x: current.x, y: limit)
            }

            // NOTE: an earlier version also walked the backfield apart so every stacked
            // player had a full label block beneath it. A deep under-center set
            // (quarterback, fullback, tailback in one column) stacked three of those and
            // shoved the tailback off the bottom of the field. The backfield now keeps its
            // charted depth and the label pass decides per name whether it fits inline or
            // needs a callout — the positions are the honest part, the labels are the part
            // that can move.
            //
            // Every push above still moves players away from the line, and a deep formation
            // (an under-center backfield of quarterback, fullback and tailback) stacks
            // three of them — enough to shove the last one off the bottom of the field.
            // If the group no longer fits, compress the whole set of distances-from-the-
            // line proportionally: everything keeps its order and its relative depth, the
            // formation just gets shallower rather than running off the surface.
            guard let lineRowY = onLine.compactMap({ centers[$0.key]?.y }).first else { continue }
            let limit = height * 0.86
            let depths = offLine.compactMap { centers[$0.key].map { abs($0.y - lineRowY) } }
            guard let deepest = depths.max(), deepest > 0 else { continue }
            let room = abs(limit - lineRowY) - dotSize / 2 - labelBlockHeight
            guard room > 0, deepest > room else { continue }
            let squeeze = room / deepest
            for slot in offLine {
                guard let current = centers[slot.key] else { continue }
                centers[slot.key] = CGPoint(
                    x: current.x,
                    y: lineRowY + (current.y - lineRowY) * squeeze
                )
            }
        }
        return centers
    }

    /// THROWAWAY PROTOTYPE, per Cooper 2026-08-23: every other pass here is same-ROW only,
    /// and `rowTolerancePct` is 3 — so two slots 4% apart in y (the split end at 51 and the
    /// slot receiver at 55) are never compared to each other and can be drawn on top of one
    /// another. This resolves what's left in real 2D distance rather than by row, and must
    /// run LAST in whichever path produced the layout: the fill-width path re-pins its edge
    /// receivers after the standard pass, which would otherwise reintroduce exactly the
    /// overlap this fixes.
    ///
    /// Anchors are visited outward from the formation's center (`fixed` keys first, since a
    /// pinned receiver can't yield), and each overlap pushes the *later* slot directly away
    /// from the anchor. That ordering is what makes a receiver yield to the line rather than
    /// the line drifting off its charted spot. Only x moves — y is the charted depth.
    private static func resolvingOverlaps(
        _ centers: [String: CGPoint],
        slots: [RenderSlot],
        dotSize: CGFloat,
        width: CGFloat,
        fixed: Set<String> = []
    ) -> [String: CGPoint] {
        var centers = centers
        let minCenterDistance = dotSize + gap
        let ordered = slots.sorted { a, b in
            let aFixed = fixed.contains(a.key)
            let bFixed = fixed.contains(b.key)
            if aFixed != bFixed { return aFixed }
            return abs(a.x - 50) < abs(b.x - 50)
        }
        for (i, a) in ordered.enumerated() {
            for b in ordered.dropFirst(i + 1) where !fixed.contains(b.key) {
                guard let pa = centers[a.key], let pb = centers[b.key] else { continue }
                let dx = pb.x - pa.x
                let dy = pb.y - pa.y
                guard hypot(dx, dy) < minCenterDistance else { continue }
                let needed = sqrt(max(0, minCenterDistance * minCenterDistance - dy * dy))
                let direction: CGFloat = dx == 0 ? (pa.x < width / 2 ? 1 : -1) : (dx < 0 ? -1 : 1)
                centers[b.key] = CGPoint(
                    x: max(0, min(width, pa.x + direction * needed)),
                    y: pb.y
                )
            }
        }
        return centers
    }

    private static func withX(_ slot: RenderSlot, _ x: Double) -> RenderSlot {
        RenderSlot(key: slot.key, x: x, y: slot.y, label: slot.label, player: slot.player, onLine: slot.onLine)
    }

    /// The DEP-244 fill-width layout. Every slot keeps its original coordinate EXCEPT the
    /// leftmost and rightmost wide receiver, which are pinned to the field's edges — the
    /// line stays clustered at its real spacing (and the dots stay as large as that
    /// spacing allows) while the WRs take the full width. The standard layout (and its
    /// centroid re-spread) runs first; the edge WRs are then re-pinned so the re-spread
    /// can't pull them back toward the line.
    private static func fillingLayout(
        slots: [RenderSlot],
        width: CGFloat,
        height: CGFloat
    ) -> DepthChartFieldLayout {
        // Margin (percent) that keeps the largest dot's radius fully inside the field.
        // This budgeted an extra 26pt for the pinned receiver's name text at one point;
        // that is now the label pass's job (it clamps a name or moves it to a callout),
        // and the extra margin here only ate into the strip the receivers need.
        let marginPct = Double(maxDotSize / 2 + 4) / Double(width) * 100

        // The wide receivers are the slots labelled "WR" (every offense formation labels
        // its WR skill slots this way); they're the ones pinned to the field edges.
        let wrs = slots.enumerated().filter { $0.element.label == "WR" }
        let left = wrs.min { $0.element.x < $1.element.x }?.offset
        let right = wrs.max { $0.element.x < $1.element.x }?.offset

        var adjusted = slots
        if let left {
            adjusted[left] = withX(slots[left], marginPct)
        }
        if let right, right != left {
            adjusted[right] = withX(slots[right], 100 - marginPct)
        }

        let base = standardLayout(slots: adjusted, width: width, height: height)

        // Re-pin the edge WRs to the field edges after the standard layout's re-spread.
        // Only x is re-pinned: y must keep whatever the standard pass decided, which is
        // where a receiver gets snapped onto the line or pushed off it. Recomputing y from
        // the charted value here undid that, so a receiver promoted to the line was drawn
        // below the line it was on.
        var positions = base.positions
        if let left, let current = positions[slots[left].key] {
            positions[slots[left].key] = CGPoint(x: width * marginPct / 100, y: current.y)
        }
        if let right, right != left, let current = positions[slots[right].key] {
            positions[slots[right].key] = CGPoint(x: width * (100 - marginPct) / 100, y: current.y)
        }

        // The re-pin above moves receivers after the standard pass already de-overlapped
        // them, so it can reintroduce a collision (a split end pinned to the edge landing
        // on the slot receiver beside it). Resolve again with the pinned pair held fixed —
        // they own the field's edges; anything they now touch is what yields.
        var pinned: Set<String> = []
        if let left { pinned.insert(slots[left].key) }
        if let right, right != left { pinned.insert(slots[right].key) }
        positions = resolvingOverlaps(
            positions, slots: slots, dotSize: base.dotSize, width: width, fixed: pinned
        )

        return DepthChartFieldLayout(dotSize: base.dotSize, positions: positions, nameCallouts: base.nameCallouts)
    }
}