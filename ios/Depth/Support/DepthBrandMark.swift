import SwiftUI

// Icon-only port of components/Logo.tsx's first-down marker and staggered depth bars.
// Web pairs this with a "depth" wordmark; native uses the mark alone in the toolbar.
struct DepthBrandMark: View {
    var size: CGFloat = 20

    private var scale: CGFloat { size / 1024 }

    var body: some View {
        Canvas { context, _ in
            context.scaleBy(x: scale, y: scale)
            let frame = CGRect(x: 0, y: 0, width: 1024, height: 1024)
            context.fill(Path(frame), with: .color(Color(hex: "#0A0E1A")))

            context.fill(circle(center: CGPoint(x: 270, y: 270), radius: 132), with: .color(Color(hex: "#FF6500")))
            context.fill(circle(center: CGPoint(x: 270, y: 270), radius: 82), with: .color(Color(hex: "#0A0E1A")))
            context.fill(circle(center: CGPoint(x: 270, y: 270), radius: 50), with: .color(Color(hex: "#FF6500")))

            var pole = Path()
            pole.move(to: CGPoint(x: 190, y: 405))
            pole.addLine(to: CGPoint(x: 350, y: 405))
            pole.addLine(to: CGPoint(x: 322, y: 840))
            pole.addQuadCurve(to: CGPoint(x: 298, y: 862), control: CGPoint(x: 320, y: 862))
            pole.addLine(to: CGPoint(x: 242, y: 862))
            pole.addQuadCurve(to: CGPoint(x: 218, y: 840), control: CGPoint(x: 220, y: 862))
            pole.closeSubpath()
            context.drawLayer { layer in
                layer.clip(to: pole)
                layer.fill(Path(CGRect(x: 160, y: 405, width: 220, height: 470)), with: .color(Color(hex: "#FF6500")))
                layer.fill(Path(CGRect(x: 160, y: 490, width: 220, height: 52)), with: .color(.white))
                layer.fill(Path(CGRect(x: 160, y: 610, width: 220, height: 52)), with: .color(.white))
            }

            context.fill(
                Path(roundedRect: CGRect(x: 420, y: 415, width: 410, height: 96), cornerRadius: 29),
                with: .color(.white)
            )
            context.fill(
                Path(roundedRect: CGRect(x: 420, y: 565, width: 275, height: 96), cornerRadius: 29),
                with: .color(.white)
            )
            context.fill(
                Path(roundedRect: CGRect(x: 420, y: 715, width: 155, height: 96), cornerRadius: 29),
                with: .color(.white)
            )
        }
        .frame(width: size, height: size)
    }

    private func circle(center: CGPoint, radius: CGFloat) -> Path {
        Path(ellipseIn: CGRect(
            x: center.x - radius,
            y: center.y - radius,
            width: radius * 2,
            height: radius * 2
        ))
    }
}

extension View {
    /// DEP-277: the app-wide top-left brand mark. A pure identity/decoration element
    /// (web parity: components/DepthMark.tsx, non-interactive there too) — never a
    /// navigation control, so `.allowsHitTesting(false)` is explicit rather than relying
    /// on the mark carrying no `Button`/`onTapGesture` of its own. That distinction
    /// matters here: a `.topBarLeading` toolbar item can still register taps through
    /// iOS's leading-edge/back-button-adjacent hit region even without an explicit
    /// handler, which is what made the un-wrapped mark tappable before this fix.
    /// One call site per top-level screen (DepthChartsTab/TeamDetailView, CompareView,
    /// UniformsTab, SettingsView/AccountTab) keeps the placement, size, and
    /// non-interactivity identical everywhere rather than four hand-rolled copies.
    func depthBrandMarkToolbar() -> some View {
        toolbar {
            ToolbarItem(placement: .topBarLeading) {
                DepthBrandMark(size: 28)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
    }
}
