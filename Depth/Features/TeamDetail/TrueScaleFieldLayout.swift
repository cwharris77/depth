import CoreGraphics
import Foundation

// Pure geometry for the offense's true-scale mode (design "Field Scale Options", turn 2).
// The depth chart stays the fill-width chart — reading the whole unit at a glance is its
// job — and true scale is a separate place you go: one yard is `pointsPerYard` on BOTH
// axes, drawn over a measured NFL field, panned inside a window narrower than the
// formation. Free of SwiftUI so the alignment table, pan clamping, and edge-chip rules are
// unit-testable without a view; `TrueScaleFieldView` only draws what this returns.
//
// Coordinates: "content" space is the whole field surface (sideline-to-sideline plus
// out-of-bounds grass, `aheadYards` in front of the line to `behindYards` behind it). A
// `pan` is the content's offset inside the playfield window, so a content point p is drawn
// at p + pan. Pans are always ≤ 0 on both axes (the window never shows past the surface).
struct TrueScaleFieldLayout {
    static let pointsPerYard: CGFloat = 44
    /// At 44pt/yd a 40pt dot is roughly one body, and still clears the 44pt tap target
    /// with the Button's hit frame.
    static let dotSize: CGFloat = 40
    /// Reserved beside the playfield for edge chips, so a chip can never cover a player
    /// who is actually in view.
    static let gutter: CGFloat = 30
    static let aheadYards: CGFloat = 10
    static let behindYards: CGFloat = 15
    /// Edge chips per side before the last one collapses into "+N".
    static let maxChipsPerSide = 5
    static let chipSpacing: CGFloat = 32
    /// Panned further than this off the opening position and the recentre control appears.
    static let recentreThreshold: CGFloat = 6

    /// Real NFL field geometry, in yards.
    enum Field {
        /// 160 ft sideline to sideline.
        static let widthYards: CGFloat = 53.333
        /// Out-of-bounds grass drawn beyond each sideline.
        static let outOfBoundsYards: CGFloat = 3
        /// Inbound (hash) lines: 70'9" in from each sideline, so 6.17 yd apart.
        static let hashFromCentreYards: CGFloat = 3.083
        /// Numeral centres: 12–14 yd in from each sideline.
        static let numeralFromCentreYards: CGFloat = 13.667
        /// 1-yd marks are 24 in long.
        static let tickYards: CGFloat = 0.667
        /// Numerals are 6 ft tall.
        static let numeralHeightYards: CGFloat = 2
        /// The chart carries no game context, so the scrimmage line is pinned to the
        /// offense's own 43: off a 5-yd line (the blue line never hides under a chalk line)
        /// and the 50 still falls inside the view.
        static let lineOfScrimmageYardLine = 43
    }

    /// Real alignment x, in yards from the ball. The charted x is schematic, not measured:
    /// it spreads five linemen across 32% and pins receivers to the card edges, so no single
    /// scale fits both (6.2%/yd makes the OL right and receivers 3× too tight; 1.9%/yd the
    /// reverse). At 1:1 the charted value supplies only SIDE and ORDER; magnitude comes from
    /// alignment convention. G/T keep LT→RT at the 5.2 yd DEP-432's x calibration used.
    /// Measured tracking x would replace this table wholesale.
    enum RealX {
        static let guardYards: CGFloat = 1.30
        static let tackleYards: CGFloat = 2.60
        /// In-line TE; a second TE on the same side wings one yard outside him.
        static let tightEndYards: CGFloat = 3.60
        static let wingStepYards: CGFloat = 1.0
        static let backYards: CGFloat = 1.20
        /// Receivers per side, outermost first. Every ladder is monotonic so the charted
        /// order (outside receiver outside the slot) is never inverted.
        static func receiverLadder(count: Int) -> [CGFloat] {
            switch count {
            case 1: return [17.0]
            case 2: return [17.0, 9.0]
            default: return [17.0, 12.5, 9.0] + (0..<max(0, count - 3)).map { 6.5 - CGFloat($0) * 1.5 }
            }
        }
        /// Fallback for a label this table doesn't know: DEP-432's charted-%-per-yard.
        static let chartedPercentPerYard: CGFloat = 6.2
    }

    struct Dot: Identifiable {
        let key: String
        let label: String
        let player: Player
        let onLine: Bool
        /// Content-space centre.
        let center: CGPoint
        /// Signed real yards from the ball; positive is the offense's right (screen right).
        let lateralYards: CGFloat
        /// Real yards behind the line of scrimmage.
        let depthYards: CGFloat
        /// Tight rows alternate labels above/below instead of nudging dots apart — at 1:1
        /// a dot is exactly where the data puts it.
        var labelAbove = false

        var id: String { key }
    }

    struct EdgeChip: Identifiable {
        enum Side { case leading, trailing }
        let id: String
        let side: Side
        /// Viewport y of the chip's centre.
        let y: CGFloat
        /// The player the chip stands for; nil for the "+N" overflow chip.
        let dot: Dot?
        /// The player a tap pans to (the first hidden one, for overflow).
        let target: Dot
        let overflowCount: Int
    }

    let dots: [Dot]
    let contentSize: CGSize
    /// Content-space y of the line of scrimmage.
    let lineOfScrimmageY: CGFloat

    init(slots: [RenderSlot]) {
        let ppy = Self.pointsPerYard
        let contentWidth = (Field.widthYards + Field.outOfBoundsYards * 2) * ppy
        let losY = Self.aheadYards * ppy
        contentSize = CGSize(width: contentWidth, height: (Self.aheadYards + Self.behindYards) * ppy)
        lineOfScrimmageY = losY

        let filled = slots.filter { $0.player != nil }
        let lateral = Self.realLateralYards(slots: filled)
        var dots = filled.map { slot in
            let depth = CGFloat((slot.y - FieldYardScale.lineOfScrimmage) / Double(FieldYardScale.chartedUnitsPerYard))
            let x = lateral[slot.key] ?? 0
            return Dot(
                key: slot.key,
                label: slot.label,
                player: slot.player!,
                onLine: slot.onLine ?? false,
                center: CGPoint(x: contentWidth / 2 + x * ppy, y: losY + depth * ppy),
                lateralYards: x,
                depthYards: depth
            )
        }

        // Rows = dots within 3 charted units of depth, the same grouping the chart uses.
        let order = dots.indices.sorted { dots[$0].center.y < dots[$1].center.y }
        var rows: [[Int]] = []
        for index in order {
            if let first = rows.last?.first,
                abs(dots[index].depthYards - dots[first].depthYards) * FieldYardScale.chartedUnitsPerYard <= 3
            {
                rows[rows.count - 1].append(index)
            } else {
                rows.append([index])
            }
        }
        for row in rows where row.count > 1 {
            let sorted = row.sorted { dots[$0].center.x < dots[$1].center.x }
            let tight = zip(sorted, sorted.dropFirst()).contains { a, b in
                dots[b].center.x - dots[a].center.x < Self.labelWidth(for: dots[b]) + 6
            }
            guard tight else { continue }
            for (i, index) in sorted.enumerated() {
                dots[index].labelAbove = i % 2 == 1
            }
        }
        self.dots = dots
    }

    /// Side and order from the charted x; magnitude from `RealX`.
    static func realLateralYards(slots: [RenderSlot]) -> [String: CGFloat] {
        func side(_ slot: RenderSlot) -> CGFloat { slot.x == 50 ? 0 : (slot.x < 50 ? -1 : 1) }
        var out: [String: CGFloat] = [:]
        for slot in slots {
            switch slot.label {
            case "C", "QB": out[slot.key] = 0
            case "LG": out[slot.key] = -RealX.guardYards
            case "RG": out[slot.key] = RealX.guardYards
            case "LT": out[slot.key] = -RealX.tackleYards
            case "RT": out[slot.key] = RealX.tackleYards
            case "RB", "FB": out[slot.key] = side(slot) * RealX.backYards
            case "TE", "WR": break
            default: out[slot.key] = CGFloat(slot.x - 50) / RealX.chartedPercentPerYard
            }
        }
        for dir: CGFloat in [-1, 1] {
            let tightEnds = slots.filter { $0.label == "TE" && side($0) == dir }
                .sorted { a, b in abs(a.x - 50) < abs(b.x - 50) }
            for (i, slot) in tightEnds.enumerated() {
                out[slot.key] = dir * (RealX.tightEndYards + CGFloat(i) * RealX.wingStepYards)
            }
            let receivers = slots.filter { $0.label == "WR" && side($0) == dir }
                .sorted { a, b in abs(a.x - 50) > abs(b.x - 50) }
            let ladder = RealX.receiverLadder(count: receivers.count)
            for (i, slot) in receivers.enumerated() {
                out[slot.key] = dir * ladder[i]
            }
        }
        // A TE or WR charted dead-centre has no side; put him on the ball rather than drop him.
        for slot in slots where out[slot.key] == nil {
            out[slot.key] = 0
        }
        return out
    }

    /// Approximate label width (11pt bold last name), used for row tightness and for
    /// clamping a label inside the playfield.
    static func labelWidth(for dot: Dot) -> CGFloat {
        max(40, CGFloat(formatLastName(dot.player.name).count) * 5.2 + 8)
    }

    // MARK: Viewport

    /// Opens with the ball centred and the line a third of the way down, so the backfield
    /// has room below it.
    func initialPan(viewport: CGSize) -> CGPoint {
        clampPan(
            CGPoint(x: viewport.width / 2 - contentSize.width / 2, y: viewport.height * 0.34 - lineOfScrimmageY),
            viewport: viewport
        )
    }

    func clampPan(_ pan: CGPoint, viewport: CGSize) -> CGPoint {
        func clamp(_ value: CGFloat, content: CGFloat, window: CGFloat) -> CGFloat {
            // A window larger than the surface (iPad) centres it instead of pinning to 0.
            guard content > window else { return (window - content) / 2 }
            return min(0, max(window - content, value))
        }
        return CGPoint(
            x: clamp(pan.x, content: contentSize.width, window: viewport.width),
            y: clamp(pan.y, content: contentSize.height, window: viewport.height)
        )
    }

    func centeringPan(on dot: Dot, viewport: CGSize) -> CGPoint {
        clampPan(
            CGPoint(x: viewport.width / 2 - dot.center.x, y: viewport.height / 2 - dot.center.y),
            viewport: viewport
        )
    }

    /// A dot whose centre is in the window is drawn whole (its overhang may cross into the
    /// gutter); otherwise it's an edge chip — never sliced in half. Centre, not full extent,
    /// so the in-line TE at 3.6 yd stays on the field in a phone-width window.
    func isVisible(_ dot: Dot, pan: CGPoint, viewport: CGSize) -> Bool {
        let x = dot.center.x + pan.x
        return x >= 0 && x <= viewport.width
    }

    func isOffCentre(pan: CGPoint, viewport: CGSize) -> Bool {
        let home = initialPan(viewport: viewport)
        return abs(pan.x - home.x) > Self.recentreThreshold || abs(pan.y - home.y) > Self.recentreThreshold
    }

    /// Signed real yards from the ball to the window's centre; positive is right.
    func windowOffsetYards(pan: CGPoint, viewport: CGSize) -> CGFloat {
        (viewport.width / 2 - pan.x - contentSize.width / 2) / Self.pointsPerYard
    }

    /// Chips for players off either side, tracking their real depth, clamped into the
    /// window and spaced so two receivers on one side never stack. Capped per side with a
    /// "+N" overflow so panning to a sideline can't build a wall of chips.
    func edgeChips(pan: CGPoint, viewport: CGSize) -> [EdgeChip] {
        var chips: [EdgeChip] = []
        for side in [EdgeChip.Side.leading, .trailing] {
            let hidden = dots
                .filter { dot in
                    guard !isVisible(dot, pan: pan, viewport: viewport) else { return false }
                    let x = dot.center.x + pan.x
                    return side == .leading ? x < viewport.width / 2 : x >= viewport.width / 2
                }
                .sorted { $0.center.y < $1.center.y }
            let overflow = hidden.count > Self.maxChipsPerSide
            let shown = overflow ? Array(hidden.prefix(Self.maxChipsPerSide - 1)) : hidden
            let top: CGFloat = 14
            let bottom = max(top, viewport.height - 26)
            var lastY = -CGFloat.infinity
            for dot in shown {
                let y = max(min(bottom, max(top, dot.center.y + pan.y)), lastY + Self.chipSpacing)
                lastY = y
                chips.append(EdgeChip(id: dot.key, side: side, y: y, dot: dot, target: dot, overflowCount: 0))
            }
            if overflow {
                let rest = hidden.dropFirst(Self.maxChipsPerSide - 1)
                chips.append(EdgeChip(
                    id: "\(side)-more",
                    side: side,
                    y: max(top, lastY + Self.chipSpacing),
                    dot: nil,
                    target: rest.first!,
                    overflowCount: rest.count
                ))
            }
        }
        return chips
    }

    // MARK: Readout

    static func formatYards(_ yards: CGFloat) -> String {
        String(format: "%.1f yd", Double(abs(yards)))
    }

    /// "3.9 yd right of the ball · 1.1 yd off the line" — the sentence true scale exists for.
    static func alignmentDescription(for dot: Dot) -> String {
        let lateral = abs(dot.lateralYards) < 0.05
            ? "Over the ball"
            : "\(formatYards(dot.lateralYards)) \(dot.lateralYards > 0 ? "right" : "left") of the ball"
        let depth = dot.onLine || dot.depthYards <= 0.05
            ? "on the line"
            : "\(formatYards(dot.depthYards)) off the line"
        return "\(lateral) · \(depth)"
    }

    static func windowDescription(offsetYards: CGFloat) -> String {
        abs(offsetYards) < 0.6
            ? "Centred on the ball"
            : "\(formatYards(offsetYards)) \(offsetYards > 0 ? "right" : "left") of the ball"
    }

    /// "3WR 1TE" from the resolved dots, so it's right for any personnel.
    var personnelSummary: String {
        let wr = dots.filter { $0.label == "WR" }.count
        let te = dots.filter { $0.label == "TE" }.count
        return [wr > 0 ? "\(wr)WR" : nil, te > 0 ? "\(te)TE" : nil].compactMap { $0 }.joined(separator: " ")
    }

    // MARK: Field furniture

    struct Furniture {
        struct Band { let rect: CGRect; let light: Bool }
        struct Numeral {
            let center: CGPoint
            let text: String
            /// Rotation so the column reads from its own sideline.
            let degrees: Double
            /// Which side of the numeral (in its own rotated frame) carries the arrow
            /// toward the nearer goal line; nil at the 50.
            let arrowOnPositiveSide: Bool?
        }

        let fieldMinX: CGFloat
        let fieldMaxX: CGFloat
        let bands: [Band]
        let yardLineYs: [CGFloat]
        let ticks: [CGRect]
        let numerals: [Numeral]
        let numeralFontSize: CGFloat
    }

    var furniture: Furniture {
        let ppy = Self.pointsPerYard
        let fieldMinX = Field.outOfBoundsYards * ppy
        let fieldMaxX = fieldMinX + Field.widthYards * ppy
        let centreX = contentSize.width / 2
        let tick = Field.tickYards * ppy
        var bands: [Furniture.Band] = []
        var lines: [CGFloat] = []
        var ticks: [CGRect] = []
        var numerals: [Furniture.Numeral] = []

        for yardsAhead in -Int(Self.behindYards)...Int(Self.aheadYards) {
            let yardLine = Field.lineOfScrimmageYardLine + yardsAhead
            let y = lineOfScrimmageY - CGFloat(yardsAhead) * ppy
            if yardLine % 5 == 0 {
                lines.append(y)
                // Alternating mow bands, each running five yards toward the offense's goal.
                bands.append(.init(
                    rect: CGRect(x: fieldMinX, y: y, width: fieldMaxX - fieldMinX, height: 5 * ppy),
                    light: (yardLine / 5) % 2 == 1
                ))
                if yardLine % 10 == 0 {
                    let goalIsDown = yardLine < 50
                    for side: CGFloat in [-1, 1] {
                        // rotate(90°) puts the left column's local +x down the screen and
                        // rotate(-90°) puts the right column's up it, so the arrow flips
                        // glyph side to keep pointing at the nearer goal line.
                        let plusXIsDown = side < 0
                        numerals.append(.init(
                            center: CGPoint(x: centreX + side * Field.numeralFromCentreYards * ppy, y: y),
                            text: String(yardLine > 50 ? 100 - yardLine : yardLine),
                            degrees: side < 0 ? 90 : -90,
                            arrowOnPositiveSide: yardLine == 50 ? nil : goalIsDown == plusXIsDown
                        ))
                    }
                }
            } else {
                for x in [
                    fieldMinX, fieldMaxX - tick,
                    centreX - Field.hashFromCentreYards * ppy - tick / 2,
                    centreX + Field.hashFromCentreYards * ppy - tick / 2,
                ] {
                    ticks.append(CGRect(x: x, y: y - 1, width: tick, height: 2))
                }
            }
        }
        return Furniture(
            fieldMinX: fieldMinX,
            fieldMaxX: fieldMaxX,
            bands: bands,
            yardLineYs: lines,
            ticks: ticks,
            numerals: numerals,
            // Cap height is ~78% of the point size for a condensed heavy face.
            numeralFontSize: Field.numeralHeightYards * ppy / 0.78
        )
    }
}
