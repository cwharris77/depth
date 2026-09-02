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

/// Maps the shared charted coordinate space onto the card in real yards (DEP-432).
///
/// The charted space runs 0–100 across both axes with the line of scrimmage at y=50, and
/// the field used to map all 100 units of it onto the card — so a unit occupied only its
/// own band (the defense 39% of the height, the offense 25%), and each drawn yard line was
/// worth ~2.9 real yards. That is what made an under-centre quarterback read as if he were
/// standing ten yards deep.
///
/// Instead the card is cropped to a window around the unit being drawn, which sets the
/// vertical scale directly: roughly a 10-yard window for the offense and 14 for the defense.
/// At those windows every real alignment clears the dot-collision minimum on its own, so
/// depth can be drawn at **true scale** with nothing added to it — see
/// `settingOffLineDepth`, which no longer pushes anything apart to make room for labels.
///
/// `FieldMarkings` draws its yard ticks through this same scale, so the ruler beside the
/// players measures the distance the players are actually spaced by.
struct FieldYardScale: Equatable {
    /// Screen points per charted unit.
    let pointsPerUnit: CGFloat
    /// Screen y of charted 0.
    let originY: CGFloat

    /// Charted units per real yard, fitted by least squares against 137 measured snaps of
    /// NFL tracking data (DEP-432). The charted values are not perfectly self-consistent —
    /// they were authored by eye — so this is the best single linear fit, accurate to
    /// within half a yard everywhere except the secondary, whose charted depths are
    /// separately known to be wrong and are tracked for correction.
    static let chartedUnitsPerYard: CGFloat = 3.8

    /// The line of scrimmage in charted coordinates.
    static let lineOfScrimmage: Double = 50

    /// The untransformed full-field mapping — the safe fallback when there is nothing to
    /// frame against, and what the field drew before DEP-432.
    static func fullField(height: CGFloat) -> FieldYardScale {
        FieldYardScale(pointsPerUnit: height / 100, originY: 0)
    }

    var pointsPerYard: CGFloat { pointsPerUnit * Self.chartedUnitsPerYard }

    func screenY(charted: Double) -> CGFloat { CGFloat(charted) * pointsPerUnit + originY }

    /// Real yards between two charted y values.
    static func yards(between a: Double, and b: Double) -> CGFloat {
        CGFloat(abs(b - a)) / chartedUnitsPerYard
    }

    /// Charted y for a whole-yard tick `yards` from the line of scrimmage, on the side the
    /// sign selects (positive = the offense's side, matching charted y increasing downward).
    static func charted(yardsFromLine yards: CGFloat) -> Double {
        lineOfScrimmage + Double(yards * chartedUnitsPerYard)
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
    /// The charted→screen vertical mapping this layout was drawn with. `FieldMarkings`
    /// must draw its yard ticks through the SAME scale, or the ruler stops measuring the
    /// distances the players are spaced by.
    var yardScale: FieldYardScale = FieldYardScale(pointsPerUnit: 1, originY: 0)

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
            return DepthChartFieldLayout(
                dotSize: maxDotSize, positions: [:], nameCallouts: [:],
                yardScale: .fullField(height: max(fieldSize.height, 1))
            )
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
                    : Set(slots.map(\.key)),
                yardScale: base.yardScale
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
            ),
            yardScale: base.yardScale
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

    /// How far a leader line must stay from another slot's dot center before the stroke is
    /// broken around it (DepthChartFieldView.leaderLine). Shared with the callout placement
    /// search so "does this line hit that dot" has one answer in both places — the search
    /// used to ignore the line entirely and could pick a spot whose line ran straight
    /// through the formation, leaving the drawing layer to gap it out afterwards.
    static func leaderLineClearance(dotSize: CGFloat) -> CGFloat {
        dotSize / 2 + 5
    }

    /// The block under a dot that its text occupies. The position tag ("RILB") is drawn
    /// under every dot unconditionally (see DepthChartFieldView.slotDot), so the zone is at
    /// least `nameMinWidth` wide; a slot rendering its name inline widens it to that name.
    /// Shared by the callout placement search and the leader-line stroke so a line can't
    /// be routed through text that the drawing layer would then have to strike out.
    static func labelZone(center: CGPoint, inlineName: String?, dotSize: CGFloat) -> CGRect {
        let w = max(nameMinWidth, inlineName.map(estimatedNameWidth) ?? 0)
        return CGRect(
            x: center.x - w / 2,
            y: center.y + dotSize / 2 + labelTopGap,
            width: w,
            height: labelBlockHeight
        )
    }

    /// Shortest distance from `point` to the segment `a`–`b`. The leader line is a straight
    /// segment, so a point-to-segment test is what decides whether it clips a dot — a
    /// point-to-endpoint test would miss everything the line passes over in between.
    static func distance(from point: CGPoint, toSegment a: CGPoint, _ b: CGPoint) -> CGFloat {
        let dx = b.x - a.x
        let dy = b.y - a.y
        let lengthSquared = dx * dx + dy * dy
        guard lengthSquared > 0 else { return hypot(point.x - a.x, point.y - a.y) }
        let t = min(max(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0), 1)
        return hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
    }

    /// Whether the segment `a`–`b` stays out of `rect`. Sampled rather than solved
    /// analytically: the sample count only has to be fine enough that no gap between
    /// samples can straddle a label block, and 32 steps across a phone-width field is far
    /// finer than `labelBlockHeight`.
    static func segment(_ a: CGPoint, _ b: CGPoint, avoids rect: CGRect) -> Bool {
        let steps = 32
        for step in 0...steps {
            let t = CGFloat(step) / CGFloat(steps)
            let point = CGPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t)
            if rect.contains(point) { return false }
        }
        return true
    }

    /// Web parity (components/PlayerDot.tsx): an on-line dot is nudged a radius onto its
    /// own side of the line of scrimmage. Layout has to account for it or every collision
    /// test is off by that much for exactly the most crowded row on the field.
    /// Only ever a dot radius — enough that an on-line player isn't drawn straddling the
    /// line, and nothing more.
    ///
    /// An intermediate version of DEP-432 extended the defensive side to clear the whole
    /// label block, because a label hangs below its dot (back toward the line, on the
    /// defense's side) and the line of scrimmage was being drawn through the defensive
    /// linemen's names. That was compensating in the render for a charted depth that was
    /// simply wrong: `dlY` implied 0.26 yd against 1.3–1.4 measured. With `dlY` corrected
    /// the line clears its own labels honestly, so the compensation is gone — keeping both
    /// would have double-counted it and pushed the front to ~2.5 yd.
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

            // A slot's position tag ("WR", "LT", …) always renders directly under its own
            // dot regardless of whether the NAME goes inline or to a callout (slotDot draws
            // it unconditionally, see DepthChartFieldView) — a callout landing in that zone
            // visually collides with the tag it's meant to sit clear of. Shipped bug: an
            // on-line receiver's callout name landed directly under its own position tag.
            // Reserve that zone so candidates skip over it too, not just other dots/labels.
            let ownLabelZone = CGRect(
                x: dot.x - nameMinWidth / 2,
                y: dot.y + dotSize / 2 + labelTopGap,
                width: nameMinWidth,
                height: labelBlockHeight
            )

            // Shipped bug (Cooper, Ravens defense): the search only ever checked where the
            // TAG landed, never the leader LINE that has to reach it — so a tag could sit
            // in genuinely free grass while its line ran straight across two other dots
            // and through their position tags. Every candidate is now also asked whether
            // its line arrives cleanly. It's a preference, not a hard requirement: a
            // second pass drops the line test so a crowded slot still gets a callout
            // rather than losing its name entirely (no candidate at all means no callout
            // is drawn, and a crowded slot draws no inline name either).
            let lineClearance = leaderLineClearance(dotSize: dotSize)
            let otherLabelZones = named.filter { $0.key != slot.key }.map { other in
                labelZone(
                    center: center(other),
                    inlineName: crowded.contains(where: { $0.key == other.key })
                        ? nil : formatLastName(other.player?.name ?? ""),
                    dotSize: dotSize
                )
            }
            func lineIsClear(to anchor: CGPoint) -> Bool {
                others.allSatisfy {
                    distance(from: CGPoint(x: $0.midX, y: $0.midY), toSegment: dot, anchor)
                        >= lineClearance
                } && otherLabelZones.allSatisfy { segment(dot, anchor, avoids: $0) }
            }

            var best: CGPoint?
            search: for requireClearLine in [true, false] {
                for ring in 0..<8 {
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
                                || ownLabelZone.intersects(padded)
                            if blocked { continue }
                            if requireClearLine, !lineIsClear(to: CGPoint(x: x, y: y)) { continue }
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
        // DEP-432: y goes through the unit's yard window rather than the full charted
        // space, so a point on screen is a fixed number of real yards. x is untouched —
        // five linemen occupy 6.2 measured yards, which is 43pt at the field's true
        // horizontal scale, so width has to stay stretched for the dots to be separable.
        let yardScale = yardScaleFitting(slots: slots, dotSize: dotSize, height: height)

        var centers: [String: CGPoint] = [:]
        for slot in slots {
            centers[slot.key] = CGPoint(
                x: width * slot.x / 100,
                y: yardScale.screenY(charted: slot.y)
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
                            y: yardScale.screenY(charted: slot.y)
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
                                y: yardScale.screenY(charted: entry.y)
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
                        y: yardScale.screenY(charted: wr.y)
                    )
                }
                i = j + 1
            }
        }

        centers = settingOffLineDepth(centers, slots: slots, dotSize: dotSize)
        // A single label/dot pass can re-open a gap it just closed elsewhere (pushing one
        // dot clear of a tag can walk it into a THIRD slot's tag zone) — iterate to a
        // fixed point rather than trusting one pass to converge.
        for _ in 0..<4 {
            centers = resolvingLabelOverlaps(centers, slots: slots, dotSize: dotSize, width: width, height: height)
            centers = resolvingOverlaps(centers, slots: slots, dotSize: dotSize, width: width)
        }
        return DepthChartFieldLayout(
            dotSize: dotSize, positions: centers, nameCallouts: [:], yardScale: yardScale
        )
    }

    /// Snaps each side's on-line players onto one row. `buildRealFormation` promotes
    /// receivers to on-line to satisfy the seven-on-the-line rule but leaves them at their
    /// charted wing depth, so a promoted receiver would render BELOW the line it is
    /// supposedly on; the whole group is snapped to the row nearest the line of scrimmage,
    /// which is what "on the line" has to look like.
    ///
    /// **This function used to do much more, and that was the bug** (DEP-432). It pushed
    /// every off-line slot clear of the on-line row's *label block* — a floor of roughly
    /// 67pt, expressed in points and unrelated to yards, which forced ~2.9 yards of
    /// separation onto any two levels closer than that. Measured against tracking data, an
    /// under-centre quarterback charted 1.4 yards back was being drawn at 24.8, because the
    /// floor bit hardest on exactly the shallowest player. Worse, it bit unevenly: a shotgun
    /// quarterback was exaggerated 6.7x against the under-centre one's 17.8x, so the picture
    /// could not distinguish the two alignments at all.
    ///
    /// The yard window (`yardScaleFitting`) now gives every real alignment enough room on
    /// its own — the tightest pair on the field, an under-centre quarterback half a yard off
    /// his own centre, clears the dot minimum by itself — so nothing needs pushing and
    /// charted depth survives to the screen unmodified.
    private static func settingOffLineDepth(
        _ centers: [String: CGPoint],
        slots: [RenderSlot],
        dotSize: CGFloat
    ) -> [String: CGPoint] {
        var centers = centers
        for isOffense in [true, false] {
            let side = slots.filter { isOffense ? $0.y >= 50 : $0.y < 50 }
            let onLine = side.filter { $0.onLine == true }
            guard !onLine.isEmpty else { continue }

            let anchors = onLine.compactMap { centers[$0.key]?.y }
            guard let lineRowY = isOffense ? anchors.min() : anchors.max() else { continue }
            for slot in onLine {
                guard let current = centers[slot.key] else { continue }
                centers[slot.key] = CGPoint(x: current.x, y: lineRowY)
            }

            // On-line dots are drawn a radius onto their own side of the line
            // (`lineOffset`), so every off-line slot on this side shifts by the same amount
            // to preserve the real gap between them. Without it a receiver charted just off
            // the line renders level with the tackle beside him.
            let nudge: CGFloat = isOffense ? dotSize / 2 + 3 : -(dotSize / 2 + 3)
            for slot in side where slot.onLine != true {
                guard let current = centers[slot.key] else { continue }
                centers[slot.key] = CGPoint(x: current.x, y: current.y + nudge)
            }
        }
        return centers
    }

    /// Grass (yards) kept beyond the outermost player and beyond the line of scrimmage, so
    /// the unit isn't flush against the card edge and the line reads as a line.
    static let windowMarginYards: CGFloat = 1.4

    /// Crops the card to a window around this unit and returns the resulting scale.
    ///
    /// The window always contains the line of scrimmage as well as every player, so the
    /// line stays in frame wherever the unit sits relative to it — near the bottom for a
    /// defense, near the top for an offense, mid-card for special teams, all falling out of
    /// the same arithmetic rather than needing a per-unit rule.
    ///
    /// Room for the label block under the lowest dot is reserved in *points* before the
    /// yard scale is fitted, because a label is a fixed size on screen and does not scale
    /// with the window.
    private static func yardScaleFitting(
        slots: [RenderSlot],
        dotSize: CGFloat,
        height: CGFloat
    ) -> FieldYardScale {
        let charted = slots.map(\.y)
        guard let lo = charted.min(), let hi = charted.max() else {
            return .fullField(height: height)
        }
        let margin = Double(windowMarginYards * FieldYardScale.chartedUnitsPerYard)
        let windowMin = min(lo, FieldYardScale.lineOfScrimmage) - margin
        let windowMax = max(hi, FieldYardScale.lineOfScrimmage) + margin
        let span = windowMax - windowMin
        guard span > 0 else { return .fullField(height: height) }

        let topInset = dotSize / 2 + 4
        let bottomInset = dotSize / 2 + labelTopGap + labelBlockHeight + 4
        let usable = height - topInset - bottomInset
        guard usable > 0 else { return .fullField(height: height) }

        let pointsPerUnit = usable / CGFloat(span)
        return FieldYardScale(
            pointsPerUnit: pointsPerUnit,
            originY: topInset - CGFloat(windowMin) * pointsPerUnit
        )
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

    /// Ensures a slot's position-tag block never visually overlaps a NEIGHBORING dot.
    /// `resolvingOverlaps` above only guarantees `dotSize + gap` between dot CENTERS —
    /// it says nothing about the label block DepthChartFieldView renders unconditionally
    /// under every dot (position tag, regardless of crowding — see
    /// `calloutsForCrowdedNames`'s doc comment), which can reach past a neighboring dot
    /// even when the dots themselves are clear. Same mechanism in shipped reports: a
    /// linebacker's tag over the DL dot behind it (DEP-427) and a shotgun QB's tag over the
    /// RB dot charted just behind it.
    ///
    /// Earlier versions of this shipped a regression apiece, so the remaining logic here is
    /// deliberately narrow rather than a general solver:
    /// - Always pushing sideways knocked a running back charted dead-center behind the QB
    ///   off to one side, breaking the "stacked behind the QB" read Cooper checks directly
    ///   off the chart.
    /// - Always adding vertical clearance instead resolved that, but a slot squeezed
    ///   between two independent tag sources above and below it (an edge linebacker with a
    ///   DL dot below and a safety's tag above) has no y that clears both — pushing it
    ///   shallower to clear one reactivates the other, and it never settles no matter how
    ///   many iterations run.
    /// - A congested interior slot (a 3-4 nose tackle with an interior linebacker's tag
    ///   reaching it from both sides) has the same shape in x: pushing it away from one
    ///   linebacker's tag walks it into the other's.
    /// - An UNCLAMPED vertical push, chained through a column of slots stacked at the same
    ///   x (a 3-3-5's nickel back, middle linebacker, and nose tackle all sit at x=50),
    ///   could compound across iterations far enough to push the linebacker's dot PAST the
    ///   defensive line's row entirely — visibly rendering it on the offense's side of the
    ///   line of scrimmage. Worse than the graze it was trying to fix, and only showed up
    ///   live in the simulator on a real team's real personnel, not in the geometry-only
    ///   test sweep, since that sweep only ever asserted "no overlap", never "still on the
    ///   correct side of the line."
    ///
    /// So: an on-line slot's y never moves — it's snapped to its row by
    /// `settingOffLineDepth` and must stay there. When the dot owner is off the line, push
    /// it deeper (y), clamped to stop short of the on-line row it must not cross. When the
    /// dot owner IS on the line (DEP-427's DL) and the pair aren't charted at the same x,
    /// push the dot sideways instead, same as `resolvingOverlaps`. A dot owner that's both
    /// on-line and charted at the same x as its tag's owner (the nose-tackle-under-a-
    /// linebacker shape) has no safe move by either axis and is left as a known, accepted
    /// residual case rather than risk a worse regression.
    private static func resolvingLabelOverlaps(
        _ centers: [String: CGPoint],
        slots: [RenderSlot],
        dotSize: CGFloat,
        width: CGFloat,
        height: CGFloat,
        fixed: Set<String> = []
    ) -> [String: CGPoint] {
        var centers = centers
        let halfClearance = nameMinWidth / 2 + dotSize / 2
        // The minimum center-to-center y for a tag block to fully clear the dot below it.
        let requiredDy = dotSize / 2 + labelTopGap + labelBlockHeight + dotSize / 2
        func rendered(_ slot: RenderSlot) -> CGPoint? {
            centers[slot.key].map {
                CGPoint(x: $0.x, y: $0.y + lineOffset(y: slot.y, onLine: slot.onLine, dotSize: dotSize))
            }
        }
        // The one shared row every on-line slot is already snapped to (at most one such
        // row exists per unit) — the hard boundary an off-line push must stop short of.
        let lineY: CGFloat? = slots.first(where: { $0.onLine == true }).flatMap { rendered($0)?.y }
        for a in slots {
            guard let pa = rendered(a) else { continue }
            let tagZone = CGRect(
                x: pa.x - nameMinWidth / 2,
                y: pa.y + dotSize / 2 + labelTopGap,
                width: nameMinWidth,
                height: labelBlockHeight
            )
            for b in slots where b.key != a.key && !fixed.contains(b.key) {
                guard let pb = rendered(b) else { continue }
                let dotRect = CGRect(x: pb.x - dotSize / 2, y: pb.y - dotSize / 2, width: dotSize, height: dotSize)
                guard tagZone.intersects(dotRect) else { continue }
                if b.onLine != true {
                    var targetY = max(centers[b.key]?.y ?? pb.y, pa.y + requiredDy)
                    if let lineY, pb.y < lineY {
                        targetY = min(targetY, lineY - dotSize - gap)
                    }
                    targetY = min(height, targetY)
                    centers[b.key] = CGPoint(x: centers[b.key]?.x ?? pb.x, y: targetY)
                } else if abs(pb.x - pa.x) >= 1 {
                    let direction: CGFloat = pb.x < pa.x ? -1 : 1
                    let targetX = max(0, min(width, pa.x + direction * halfClearance))
                    centers[b.key] = CGPoint(x: targetX, y: centers[b.key]?.y ?? pb.y)
                }
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
        for _ in 0..<4 {
            positions = resolvingLabelOverlaps(
                positions, slots: slots, dotSize: base.dotSize, width: width, height: height, fixed: pinned
            )
            positions = resolvingOverlaps(
                positions, slots: slots, dotSize: base.dotSize, width: width, fixed: pinned
            )
        }

        // `base` came from standardLayout, which fitted the yard window; the re-pin above
        // only moves x, so that scale still describes these positions.
        return DepthChartFieldLayout(
            dotSize: base.dotSize, positions: positions, nameCallouts: base.nameCallouts,
            yardScale: base.yardScale
        )
    }
}