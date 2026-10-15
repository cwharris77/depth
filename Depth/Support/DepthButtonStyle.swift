import SwiftUI

// Shared full-width action button. Add further variants here rather than hand-rolling
// per screen.
struct DepthButtonStyle: ButtonStyle {
    enum Variant {
        /// Destructive confirmation: danger fill, danger-on label.
        case destructive
        /// Caution that is not destructive: warning fill, dark label.
        case warning
    }

    let variant: Variant
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        configuration.label
            .font(.body.weight(.bold))
            .foregroundStyle(labelColor)
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .background(shape.fill(fill))
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.6)
            .contentShape(shape)
    }

    private var fill: Color {
        switch variant {
        case .destructive: DesignTokens.Colors.danger
        case .warning: DesignTokens.Colors.warning
        }
    }

    private var labelColor: Color {
        switch variant {
        case .destructive: DesignTokens.Colors.onDanger
        case .warning: DesignTokens.Colors.onAccent
        }
    }
}

extension ButtonStyle where Self == DepthButtonStyle {
    static func depth(_ variant: DepthButtonStyle.Variant) -> DepthButtonStyle {
        DepthButtonStyle(variant: variant)
    }
}
