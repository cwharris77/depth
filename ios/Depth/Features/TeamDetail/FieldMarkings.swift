import SwiftUI

// Direct port of components/FieldMarkings.tsx's SVG geometry (2026-08-15 visual-pass
// spec) — yard lines, end zones, line of scrimmage, and hash marks, all as percentages
// of the field's own bounds so they scale with whatever size DepthChartFieldView ends
// up rendering at.
struct FieldMarkings: View {
    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height

            ZStack {
                // Yard lines every 10%, skipping the 50% line (drawn separately, below,
                // as the line of scrimmage).
                ForEach([10, 20, 30, 40, 60, 70, 80, 90], id: \.self) { yPercent in
                    Path { path in
                        let y = h * CGFloat(yPercent) / 100
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: w, y: y))
                    }
                    .stroke(DesignTokens.Colors.borderStrong, lineWidth: h * 0.004)
                }

                // End zones.
                Rectangle()
                    .fill(DesignTokens.Colors.navy.opacity(0.3))
                    .frame(width: w, height: h * 0.06)
                    .position(x: w / 2, y: h * 0.03)
                Rectangle()
                    .fill(DesignTokens.Colors.navy.opacity(0.3))
                    .frame(width: w, height: h * 0.06)
                    .position(x: w / 2, y: h * 0.97)

                // Line of scrimmage — solid blue, matching TV broadcast overlays (same
                // comment as the web source).
                Path { path in
                    let y = h * 0.5
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: w, y: y))
                }
                .stroke(DesignTokens.Colors.fieldLineOfScrimmage, lineWidth: h * 0.006)

                // Hash marks — two columns, one per side of the field.
                ForEach([15, 25, 35, 45, 55, 65, 75, 85], id: \.self) { yPercent in
                    let y = h * CGFloat(yPercent) / 100
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.32, y: y))
                        path.addLine(to: CGPoint(x: w * 0.35, y: y))
                    }
                    .stroke(DesignTokens.Colors.fieldHashMark, lineWidth: h * 0.004)
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.65, y: y))
                        path.addLine(to: CGPoint(x: w * 0.68, y: y))
                    }
                    .stroke(DesignTokens.Colors.fieldHashMark, lineWidth: h * 0.004)
                }
            }
        }
        .allowsHitTesting(false)
    }
}