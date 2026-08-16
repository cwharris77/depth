import SwiftUI

// Native equivalent of components/ui/Card.tsx (2026-08-15 visual-pass spec) — the one
// bounded-surface treatment every screen in the app composes from, rather than each
// screen inventing its own background/border/radius combination.
private struct DepthCard: ViewModifier {
    let dense: Bool
    let padded: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        Group {
            if padded {
                content.padding(DesignTokens.Spacing.md)
            } else {
                content
            }
        }
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
    ///
    /// `padded: false` (DEP-225) skips the outer padding for row-list content whose
    /// individual rows carry their own padding — with the default `padded: true`, a
    /// row's own `.background()` highlight (e.g. the current-player row, the
    /// current-season stats row) gets inset by the card's own padding before the
    /// `clipShape` below ever runs, so the highlight can't reach the card's rounded
    /// edges. Callers using `padded: false` must apply matching padding to every row
    /// themselves (leading/trailing at minimum) or content will touch the card's edges.
    func depthCard(dense: Bool = false, padded: Bool = true) -> some View {
        modifier(DepthCard(dense: dense, padded: padded))
    }
}