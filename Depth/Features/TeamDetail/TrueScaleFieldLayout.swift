import CoreGraphics
import Foundation

// Pure geometry for true-scale mode (design "Field Scale Options", turn 2; defense added
// by DEP-572). The depth chart stays the fill-width chart — reading the whole unit at a
// glance is its job — and true scale is a separate place you go: one yard is
// `pointsPerYard` on BOTH axes, drawn over a measured NFL field, panned inside a window
// narrower than the formation. Free of SwiftUI so the alignment table, pan clamping, and
// edge-chip rules are unit-testable without a view; `TrueScaleFieldView` only draws what
// this returns.
//
// One layout serves both units (DEP-572: same view, not a fork). `unit` selects the
// alignment table, how much field is drawn on each side of the line, and the opening
// framing — the offense's depth grows down-screen into its backfield, the defense's grows
// up-screen into its secondary, so the same geometry just mirrors about the line.
//
// Coordinates: "content" space is the whole field surface (sideline-to-sideline plus
// out-of-bounds grass, `aheadYards` downfield of the line to `behindYards` behind it). A
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
    /// Field drawn on the unit's OWN side of the line — the offense's backfield below it,
    /// the defense's secondary above it. Both reach about 11 yd (a shotgun QB at 4.7, a
    /// free safety at 10.5), so 15 leaves grass past the deepest man in either direction.
    static let ownSideYards: CGFloat = 15
    /// Field drawn on the far side of the line, where the unit has nobody: enough to read
    /// as a real field with a 5-yd line and a numeral in it.
    static let farSideYards: CGFloat = 10

    /// Yards drawn above the line (downfield, toward the offense's goal): the defense's
    /// own side, the offense's far one.
    static func aheadYards(for unit: Unit) -> CGFloat {
        unit == .defense ? ownSideYards : farSideYards
    }

    /// Yards drawn below the line (the offense's backfield).
    static func behindYards(for unit: Unit) -> CGFloat {
        unit == .defense ? farSideYards : ownSideYards
    }
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
            default:
                return [17.0, 12.5, 9.0] + (0..<max(0, count - 3)).map { 6.5 - CGFloat($0) * 1.5 }
            }
        }
        /// Fallback for a label this table doesn't know: DEP-432's charted-%-per-yard.
        static let chartedPercentPerYard: CGFloat = 6.2
    }

    /// The defense's half of the same convention (DEP-572). The charted defense is as
    /// schematic as the offense — `buildRealDefenseFormation` spreads the front evenly
    /// between fixed percentages — so again the chart supplies SIDE and ORDER and these
    /// numbers supply magnitude, named by the technique each one is. Read against the
    /// offense's 17/9 receiver ladder they line a real defense up over a real offense.
    enum RealDefenseX {
        /// A nose shaded off the centre; a nose charted dead on the ball stays at 0 (a
        /// head-up 0-technique), the same way a dead-centre back does on offense.
        static let noseYards: CGFloat = 0.5
        /// 3-technique, outside shoulder of the guard.
        static let interiorYards: CGFloat = 1.5
        /// 5-technique, outside shoulder of the tackle.
        static let edgeYards: CGFloat = 3.5
        /// Nickel back in the slot, over the offense's 9-yd inside receiver.
        static let nickelYards: CGFloat = 9
        /// Split safeties; a lone safety is charted dead-centre and stays on the ball.
        static let safetyYards: CGFloat = 6
        /// Linebackers per side, innermost first: an inside backer in the A/B gap, then
        /// outside backers on the edge. Monotonic, so the charted order never inverts.
        static let insideBackerYards: CGFloat = 2
        static let outsideBackerYards: CGFloat = 4.5
        static let backerStepYards: CGFloat = 1.5
        static func backerLadder(count: Int) -> [CGFloat] {
            (0..<count).map { (i: Int) -> CGFloat in
                guard i > 0 else { return insideBackerYards }
                return outsideBackerYards + CGFloat(i - 1) * backerStepYards
            }
        }
    }

    /// What a defensive label lines up as. Kept separate from the magnitude table so the
    /// personnel summary ("4-2-5") and the alignment table read the same labels the same
    /// way. nil is an unmapped label, which falls back to the charted x rather than being
    /// dropped or guessed at.
    enum DefenseRole {
        case nose, interior, edge, backer, nickel, corner, safety

        var group: Group {
            switch self {
            case .nose, .interior, .edge: return .line
            case .backer: return .backers
            case .nickel, .corner, .safety: return .secondary
            }
        }

        enum Group { case line, backers, secondary }
    }

    /// Labels come from `buildRealDefenseFormation`/`baseDefense`: LDE/NT/RDE/DT/DE,
    /// WLB/MLB/SLB/LILB/RILB/LB, LCB/RCB/CB/NB/SS/FS/S. The suffix rules catch the
    /// side-tagged variants without listing every permutation.
    static func defenseRole(_ label: String) -> DefenseRole? {
        switch label {
        case "NT": return .nose
        case "DT": return .interior
        case "DE", "LDE", "RDE": return .edge
        case "NB": return .nickel
        case "S", "SS", "FS": return .safety
        default:
            if label.hasSuffix("LB") { return .backer }
            if label.hasSuffix("CB") { return .corner }
            return nil
        }
    }

    struct Dot: Identifiable {
        let key: String
        let label: String
        let player: Player
        let onLine: Bool
        /// Content-space centre.
        let center: CGPoint
        /// Real yards off the line of scrimmage on the unit's own side — behind it for the
        /// offense, downfield of it for the defense. Always ≥ 0 for a player in his unit.
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

    let unit: Unit
    let dots: [Dot]
    let contentSize: CGSize
    /// Content-space y of the line of scrimmage.
    let lineOfScrimmageY: CGFloat

    /// Defaults to offense so the offense's call sites and tests read unchanged.
    init(slots: [RenderSlot], unit: Unit = .offense) {
        self.unit = unit
        let ppy = Self.pointsPerYard
        let ahead = Self.aheadYards(for: unit)
        let behind = Self.behindYards(for: unit)
        let contentWidth = (Field.widthYards + Field.outOfBoundsYards * 2) * ppy
        let losY = ahead * ppy
        contentSize = CGSize(width: contentWidth, height: (ahead + behind) * ppy)
        lineOfScrimmageY = losY

        let filled = slots.filter { $0.player != nil }
        let lateral = Self.realLateralYards(slots: filled, unit: unit)
        // Charted y runs down-screen for both units, so the drawn y is the same expression
        // either way; only the REPORTED depth flips sign, so `depthYards` stays "yards off
        // the line on my own side" for a defender the way it already is for a back.
        let ownSideSign: CGFloat = unit == .defense ? -1 : 1
        var dots = filled.compactMap { slot -> Dot? in
            guard let player = slot.player else { return nil }
            let charted = CGFloat(
                (slot.y - FieldYardScale.lineOfScrimmage)
                    / Double(FieldYardScale.chartedUnitsPerYard))
            let x = lateral[slot.key] ?? 0
            return Dot(
                key: slot.key,
                label: slot.label,
                player: player,
                onLine: slot.onLine ?? false,
                center: CGPoint(x: contentWidth / 2 + x * ppy, y: losY + charted * ppy),
                depthYards: charted * ownSideSign
            )
        }

        // Rows = dots within 3 charted units of depth, the same grouping the chart uses.
        let order = dots.indices.sorted { dots[$0].center.y < dots[$1].center.y }
        var rows: [[Int]] = []
        for index in order {
            if let first = rows.last?.first,
                abs(dots[index].depthYards - dots[first].depthYards)
                    * FieldYardScale.chartedUnitsPerYard <= 3
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

    /// Side and order from the charted x; magnitude from `RealX` / `RealDefenseX`.
    static func realLateralYards(slots: [RenderSlot], unit: Unit = .offense) -> [String: CGFloat] {
        unit == .defense ? defenseLateralYards(slots: slots) : offenseLateralYards(slots: slots)
    }

    private static func chartedSide(_ slot: RenderSlot) -> CGFloat {
        slot.x == 50 ? 0 : (slot.x < 50 ? -1 : 1)
    }

    private static func offenseLateralYards(slots: [RenderSlot]) -> [String: CGFloat] {
        let side = chartedSide
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

    /// The defense's mirror of `offenseLateralYards`. Corners reuse the offense's receiver
    /// ladder outright — a corner is aligned over the receiver he covers, so one corner a
    /// side lands at ±17 and a third corner drops into the slot at 9 rather than stacking
    /// on the boundary man.
    private static func defenseLateralYards(slots: [RenderSlot]) -> [String: CGFloat] {
        let side = chartedSide
        var out: [String: CGFloat] = [:]
        for slot in slots {
            switch defenseRole(slot.label) {
            case .nose: out[slot.key] = side(slot) * RealDefenseX.noseYards
            case .interior: out[slot.key] = side(slot) * RealDefenseX.interiorYards
            case .edge: out[slot.key] = side(slot) * RealDefenseX.edgeYards
            case .safety: out[slot.key] = side(slot) * RealDefenseX.safetyYards
            case .nickel:
                // The generated nickel back is always charted dead-centre, so there is no
                // side to take and no offense drawn to take one from. He goes to the
                // defense's left, the same side the chart's own DB order starts on
                // (LCB before RCB, SS before FS) — deterministic, not meaningful.
                out[slot.key] = (side(slot) == 0 ? -1 : side(slot)) * RealDefenseX.nickelYards
            case .backer, .corner: break  // laddered per side below
            case nil: out[slot.key] = CGFloat(slot.x - 50) / RealX.chartedPercentPerYard
            }
        }
        for dir: CGFloat in [-1, 1] {
            let backers = slots.filter { defenseRole($0.label) == .backer && side($0) == dir }
                .sorted { a, b in abs(a.x - 50) < abs(b.x - 50) }
            let backerLadder = RealDefenseX.backerLadder(count: backers.count)
            for (i, slot) in backers.enumerated() {
                out[slot.key] = dir * backerLadder[i]
            }
            let corners = slots.filter { defenseRole($0.label) == .corner && side($0) == dir }
                .sorted { a, b in abs(a.x - 50) > abs(b.x - 50) }
            let cornerLadder = RealX.receiverLadder(count: corners.count)
            for (i, slot) in corners.enumerated() {
                out[slot.key] = dir * cornerLadder[i]
            }
        }
        // A mike backer or single-high safety charted dead-centre has no side: he belongs
        // on the ball, which is where this leaves him.
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

    /// The playfield window: its full size (the field runs edge to edge, under the floating
    /// header) plus how much of its top and bottom that chrome and the system bars cover.
    /// Framing and chips respect the insets; panning and clamping use the full size.
    struct Window: Equatable {
        var size: CGSize
        var topInset: CGFloat = 0
        var bottomInset: CGFloat = 0

        var clearHeight: CGFloat { max(0, size.height - topInset - bottomInset) }
    }

    /// Where the line of scrimmage opens, as a fraction DOWN the uncovered part of the
    /// window. The offense opens near the top (0.34), leaving the screen below the line
    /// for its backfield; the defense opens near the bottom (0.66), leaving the screen
    /// above the line for its secondary.
    var homeLineFraction: CGFloat { unit == .defense ? 0.66 : 0.34 }

    /// Opens with the ball centred and the line placed so the unit's own depth is on screen.
    func initialPan(window: Window) -> CGPoint {
        clampPan(
            CGPoint(
                x: window.size.width / 2 - contentSize.width / 2,
                y: window.topInset + window.clearHeight * homeLineFraction - lineOfScrimmageY
            ),
            window: window
        )
    }

    func clampPan(_ pan: CGPoint, window: Window) -> CGPoint {
        func clamp(_ value: CGFloat, content: CGFloat, length: CGFloat) -> CGFloat {
            // A window larger than the surface (iPad) centres it instead of pinning to 0.
            guard content > length else { return (length - content) / 2 }
            return min(0, max(length - content, value))
        }
        return CGPoint(
            x: clamp(pan.x, content: contentSize.width, length: window.size.width),
            y: clamp(pan.y, content: contentSize.height, length: window.size.height)
        )
    }

    func centeringPan(on dot: Dot, window: Window) -> CGPoint {
        clampPan(
            CGPoint(
                x: window.size.width / 2 - dot.center.x,
                y: window.topInset + window.clearHeight / 2 - dot.center.y
            ),
            window: window
        )
    }

    /// A dot whose centre is in the window is drawn whole (its overhang may cross into the
    /// gutter); otherwise it's an edge chip — never sliced in half. Centre, not full extent,
    /// so the in-line TE at 3.6 yd stays on the field in a phone-width window.
    func isVisible(_ dot: Dot, pan: CGPoint, window: Window) -> Bool {
        let x = dot.center.x + pan.x
        return x >= 0 && x <= window.size.width
    }

    func isOffCentre(pan: CGPoint, window: Window) -> Bool {
        let home = initialPan(window: window)
        return abs(pan.x - home.x) > Self.recentreThreshold
            || abs(pan.y - home.y) > Self.recentreThreshold
    }

    /// Chips for players off either side, tracking their real depth, clamped into the
    /// uncovered window and spaced so two receivers on one side never stack. Capped per side
    /// with a "+N" overflow so panning to a sideline can't build a wall of chips.
    func edgeChips(pan: CGPoint, window: Window) -> [EdgeChip] {
        var chips: [EdgeChip] = []
        for side in [EdgeChip.Side.leading, .trailing] {
            let hidden =
                dots
                .filter { dot in
                    guard !isVisible(dot, pan: pan, window: window) else { return false }
                    let x = dot.center.x + pan.x
                    return side == .leading ? x < window.size.width / 2 : x >= window.size.width / 2
                }
                .sorted { $0.center.y < $1.center.y }
            let overflow = hidden.count > Self.maxChipsPerSide
            let shown = overflow ? Array(hidden.prefix(Self.maxChipsPerSide - 1)) : hidden
            let top = window.topInset + 14
            let bottom = max(top, window.size.height - window.bottomInset - 26)
            var lastY = -CGFloat.infinity
            for dot in shown {
                let y = max(min(bottom, max(top, dot.center.y + pan.y)), lastY + Self.chipSpacing)
                lastY = y
                chips.append(
                    EdgeChip(id: dot.key, side: side, y: y, dot: dot, target: dot, overflowCount: 0)
                )
            }
            let rest = hidden.dropFirst(Self.maxChipsPerSide - 1)
            if overflow, let target = rest.first {
                chips.append(
                    EdgeChip(
                        id: "\(side)-more",
                        side: side,
                        y: max(top, lastY + Self.chipSpacing),
                        dot: nil,
                        target: target,
                        overflowCount: rest.count
                    ))
            }
        }
        return chips
    }

    // MARK: Callout

    /// The selected player's callout line: whether he's on the line of scrimmage.
    static func lineStatus(for dot: Dot) -> String {
        dot.onLine || dot.depthYards <= 0.05 ? "On the line" : "Off the line"
    }

    /// The plain-text header when there's no formation to name: "3WR 1TE" for the offense,
    /// the DL-LB-DB count ("4-2-5") for the defense, both read off the resolved dots so
    /// they're right for any personnel. Empty when nothing is recognized, so the header
    /// omits the label rather than showing a stub.
    var personnelSummary: String {
        guard unit != .defense else { return defensePersonnelSummary }
        let wr = dots.filter { $0.label == "WR" }.count
        let te = dots.filter { $0.label == "TE" }.count
        return [wr > 0 ? "\(wr)WR" : nil, te > 0 ? "\(te)TE" : nil].compactMap { $0 }.joined(
            separator: " ")
    }

    private var defensePersonnelSummary: String {
        var counts: [DefenseRole.Group: Int] = [:]
        for dot in dots {
            guard let group = Self.defenseRole(dot.label)?.group else { continue }
            counts[group, default: 0] += 1
        }
        guard !counts.isEmpty else { return "" }
        return "\(counts[.line] ?? 0)-\(counts[.backers] ?? 0)-\(counts[.secondary] ?? 0)"
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

        for yardsAhead in -Int(Self.behindYards(for: unit))...Int(Self.aheadYards(for: unit)) {
            let yardLine = Field.lineOfScrimmageYardLine + yardsAhead
            let y = lineOfScrimmageY - CGFloat(yardsAhead) * ppy
            if yardLine % 5 == 0 {
                lines.append(y)
                // Alternating mow bands, each running five yards toward the offense's goal.
                bands.append(
                    .init(
                        rect: CGRect(
                            x: fieldMinX, y: y, width: fieldMaxX - fieldMinX, height: 5 * ppy),
                        light: (yardLine / 5) % 2 == 1
                    ))
                if yardLine % 10 == 0 {
                    let goalIsDown = yardLine < 50
                    for side: CGFloat in [-1, 1] {
                        // rotate(90°) puts the left column's local +x down the screen and
                        // rotate(-90°) puts the right column's up it, so the arrow flips
                        // glyph side to keep pointing at the nearer goal line.
                        let plusXIsDown = side < 0
                        numerals.append(
                            .init(
                                center: CGPoint(
                                    x: centreX + side * Field.numeralFromCentreYards * ppy, y: y),
                                text: String(yardLine > 50 ? 100 - yardLine : yardLine),
                                degrees: side < 0 ? 90 : -90,
                                arrowOnPositiveSide: yardLine == 50
                                    ? nil : goalIsDown == plusXIsDown
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
