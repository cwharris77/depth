import SwiftUI

// Shared full-width action button. The destructive variant is the red confirm used by the
// account-deletion flow; add further variants here rather than hand-rolling per screen.
struct DepthButtonStyle: ButtonStyle {
    enum Variant {
        case destructive
    }

    let variant: Variant
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .background(Capsule().fill(fill))
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.5)
            .contentShape(Capsule())
    }

    private var fill: Color {
        switch variant {
        case .destructive: DesignTokens.Colors.danger
        }
    }
}

extension ButtonStyle where Self == DepthButtonStyle {
    static func depth(_ variant: DepthButtonStyle.Variant) -> DepthButtonStyle {
        DepthButtonStyle(variant: variant)
    }
}
