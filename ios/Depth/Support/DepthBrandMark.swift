import SwiftUI

// Icon-only port of components/Logo.tsx's three descending bars (the depth-chart glyph,
// the app's brand mark) — do not alter the 11:8:5 width ratio, it's the brand geometry.
// Web always pairs this with a "depth" wordmark (DepthMark.tsx); native drops the text
// because the nav bar has far less horizontal room than web's persistent header, and an
// icon alone is enough brand presence in a 44pt toolbar slot.
struct DepthBrandMark: View {
    var size: CGFloat = 20
    var color: Color = DesignTokens.Colors.accent

    private var unit: CGFloat { size / 16 }

    var body: some View {
        VStack(alignment: .leading, spacing: 2.5 * unit) {
            bar(widthUnits: 11)
            bar(widthUnits: 8)
            bar(widthUnits: 5)
        }
        .frame(width: size, height: size, alignment: .center)
    }

    private func bar(widthUnits: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: unit)
            .fill(color)
            .frame(width: widthUnits * unit, height: 2 * unit)
    }
}
