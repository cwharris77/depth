import SwiftUI

// Native equivalent of components/ui/Card.tsx (2026-08-15 visual-pass spec) — the one
// bounded-surface treatment every screen in the app composes from, rather than each
// screen inventing its own background/border/radius combination.
private struct DepthCard: ViewModifier {
    let dense: Bool

    func body(content: Content) -> some View {
        content
            .padding(DesignTokens.Spacing.md)
            .background(dense ? DesignTokens.Colors.surfaceCard2 : DesignTokens.Colors.surfaceCard)
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }
}

extension View {
    /// Wraps content in the app's one card treatment. `dense: true` uses the lighter
    /// `surfaceCard2` fill (web's `Card` `dense` prop) for nested/secondary surfaces.
    func depthCard(dense: Bool = false) -> some View {
        modifier(DepthCard(dense: dense))
    }
}