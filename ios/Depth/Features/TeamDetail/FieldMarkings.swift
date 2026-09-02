import SwiftUI

// The field's own markings, drawn through the layout's yard scale (DEP-432).
//
// This used to draw a yard line every 10% of the card and the line of scrimmage at a flat
// 50%, both in card-relative percentages. Once the card was cropped to a unit's yard window
// that stopped being a ruler at all: the "yard lines" were worth ~2.9 real yards each and
// the line of scrimmage was no longer the line the front was aligned on.
//
// Now every marking is placed by real distance from the line of scrimmage, through the same
// `FieldYardScale` the players are positioned with — so counting ticks beside a dot gives
// its actual pre-snap depth. That ruler is what makes the vertical axis self-describing:
// without legible gradations the eye judges depth against the field's *width*, which is
// where "that quarterback is ten yards back" came from.
struct FieldMarkings: View {
    var yardScale: FieldYardScale

    /// A tick every yard, a full-width line and a number every five.
    private let majorEvery = 5
    /// Widest window any unit produces is ~20 yards (special teams spans both sides of the
    /// line); ticks outside the card are simply not drawn.
    private let maxYardsEitherSide = 24

    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height

            ZStack(alignment: .topLeading) {
                ForEach(-maxYardsEitherSide...maxYardsEitherSide, id: \.self) { yard in
                    let y = yardScale.screenY(charted: FieldYardScale.charted(yardsFromLine: CGFloat(yard)))
                    if y >= 0, y <= h {
                        marking(yard: yard, y: y, width: w)
                    }
                }

                // Line of scrimmage — solid blue, matching TV broadcast overlays.
                let losY = yardScale.screenY(charted: FieldYardScale.lineOfScrimmage)
                if losY >= 0, losY <= h {
                    Path { path in
                        path.move(to: CGPoint(x: 0, y: losY))
                        path.addLine(to: CGPoint(x: w, y: losY))
                    }
                    .stroke(DesignTokens.Colors.fieldLineOfScrimmage, lineWidth: 2)
                }
            }
        }
        .allowsHitTesting(false)
    }

    @ViewBuilder
    private func marking(yard: Int, y: CGFloat, width: CGFloat) -> some View {
        let isMajor = yard % majorEvery == 0
        // The line of scrimmage draws itself above; a 0 tick underneath it would double up.
        if yard != 0 {
            if isMajor {
                Path { path in
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: width, y: y))
                }
                .stroke(DesignTokens.Colors.fieldChalkMajor, lineWidth: 1)
            } else {
                // Per-yard gradation, kept to a rail on both edges so it reads as a ruler
                // rather than clutter across the middle of the formation. Long enough to
                // actually count: a first pass drew these at 7pt and they vanished, which
                // defeats the point — the ruler is what makes the vertical axis legible.
                Path { path in
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: 14, y: y))
                    path.move(to: CGPoint(x: width - 14, y: y))
                    path.addLine(to: CGPoint(x: width, y: y))
                }
                .stroke(DesignTokens.Colors.fieldChalk, lineWidth: 1)
            }
        }

        if isMajor, yard != 0 {
            Text(verbatim: "\(abs(yard))")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .offset(x: 5, y: y - 13)
        }
    }
}
