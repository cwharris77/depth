import SwiftUI

// Direct port of components/FieldMarkings.tsx's SVG geometry (2026-08-15 visual-pass
// spec) — yard lines, end zones, line of scrimmage, and hash marks, all as percentages
// of the field's own bounds so they scale with whatever size DepthChartFieldView ends
// up rendering at.
//
// DEP-431: every marking is placed through the layout's `FieldFraming` rather than
// straight off the card's height. The card is framed to whichever unit is being drawn, so
// the markings have to move with it — a line of scrimmage still pinned at a flat 50% would
// no longer be the line the front is lined up on, and the yard lines would stop measuring
// the same distances the players are spaced by.
struct FieldMarkings: View {
    var framing: FieldFraming = .identity

    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height
            let y = { (percent: Double) in framing.screenY(chartedPercent: percent, height: h) }

            ZStack {
                // Yard lines every 10%, skipping the 50% line (drawn separately, below,
                // as the line of scrimmage).
                ForEach([10, 20, 30, 40, 60, 70, 80, 90], id: \.self) { yPercent in
                    Path { path in
                        path.move(to: CGPoint(x: 0, y: y(Double(yPercent))))
                        path.addLine(to: CGPoint(x: w, y: y(Double(yPercent))))
                    }
                    .stroke(DesignTokens.Colors.borderStrong, lineWidth: h * 0.004)
                }

                // End zones. Framed like everything else, so a zoomed-in unit simply has
                // them fall outside the card (clipped) rather than drawn at a depth the
                // rest of the field no longer agrees with.
                Rectangle()
                    .fill(DesignTokens.Colors.navy.opacity(0.3))
                    .frame(width: w, height: h * 0.06 * framing.scale)
                    .position(x: w / 2, y: y(3))
                Rectangle()
                    .fill(DesignTokens.Colors.navy.opacity(0.3))
                    .frame(width: w, height: h * 0.06 * framing.scale)
                    .position(x: w / 2, y: y(97))

                // Line of scrimmage — solid blue, matching TV broadcast overlays (same
                // comment as the web source).
                Path { path in
                    path.move(to: CGPoint(x: 0, y: y(50)))
                    path.addLine(to: CGPoint(x: w, y: y(50)))
                }
                .stroke(DesignTokens.Colors.fieldLineOfScrimmage, lineWidth: h * 0.006)

                // Hash marks — two columns, one per side of the field.
                ForEach([15, 25, 35, 45, 55, 65, 75, 85], id: \.self) { yPercent in
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.32, y: y(Double(yPercent))))
                        path.addLine(to: CGPoint(x: w * 0.35, y: y(Double(yPercent))))
                    }
                    .stroke(DesignTokens.Colors.fieldHashMark, lineWidth: h * 0.004)
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.65, y: y(Double(yPercent))))
                        path.addLine(to: CGPoint(x: w * 0.68, y: y(Double(yPercent))))
                    }
                    .stroke(DesignTokens.Colors.fieldHashMark, lineWidth: h * 0.004)
                }
            }
        }
        .allowsHitTesting(false)
    }
}