import SwiftUI

// Native equivalent of components/ui/Card.tsx (2026-08-15 visual-pass spec) — the one
// bounded-surface treatment every screen in the app composes from, rather than each
// screen inventing its own background/border/radius combination.
private struct DepthCard: ViewModifier {
    let dense: Bool
    let padded: Bool
    /// Overrides the default corner radius. Web's `CompareView` cards are `rounded-2xl`
    /// (16pt = `Radius.md`), not the `Radius.lg` (24) this modifier defaults to, so
    /// Compare passes `.md` to keep web parity while still composing the one card
    /// treatment (DEP-266).
    let radius: CGFloat

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
            RoundedRectangle(cornerRadius: radius)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: radius))
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
    ///
    /// `radius` overrides the default `Radius.lg` (24); pass `DesignTokens.Radius.md`
    /// (16) for surfaces that must match web's `rounded-2xl` cards (DEP-266's Compare).
    func depthCard(dense: Bool = false, padded: Bool = true, radius: CGFloat = DesignTokens.Radius.lg) -> some View {
        modifier(DepthCard(dense: dense, padded: padded, radius: radius))
    }
}