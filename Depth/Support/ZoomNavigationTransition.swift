import SwiftUI

/// Zooms a pushed screen out of the element the user tapped. Under Reduce Motion it keeps
/// the default push.
private struct ZoomNavigationTransition<ID: Hashable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let sourceID: ID
    let namespace: Namespace.ID

    func body(content: Content) -> some View {
        if reduceMotion {
            content
        } else {
            content.navigationTransition(.zoom(sourceID: sourceID, in: namespace))
        }
    }
}

extension View {
    /// Destination half of a zoom push; pair it with `zoomTransitionSource(id:in:cornerRadius:)`.
    func zoomNavigationTransition<ID: Hashable>(
        from sourceID: ID, in namespace: Namespace.ID
    ) -> some View {
        modifier(ZoomNavigationTransition(sourceID: sourceID, namespace: namespace))
    }

    /// Source half of a zoom push. A nil `id` (a placeholder with nothing to open) leaves
    /// the view unchanged. The source clip only accepts a rounded rectangle.
    @ViewBuilder
    func zoomTransitionSource<ID: Hashable>(
        id: ID?, in namespace: Namespace.ID, cornerRadius: CGFloat
    ) -> some View {
        if let id {
            matchedTransitionSource(id: id, in: namespace) {
                $0.clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            }
        } else {
            self
        }
    }
}
