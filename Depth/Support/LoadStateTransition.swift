import SwiftUI

/// Crossfades a screen between its loading, content, empty and error states with the
/// `reveal` token. It animates only when `state` changes, so a refresh that resolves to the
/// state already on screen leaves the content still.
private struct LoadStateTransition<State: Equatable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let state: State

    func body(content: Content) -> some View {
        content.animation(
            DesignTokens.Motion.reveal.respectingReduceMotion(reduceMotion), value: state)
    }
}

extension View {
    /// Applies the shared load-state crossfade, keyed on the screen's own state enum.
    func loadStateTransition<State: Equatable>(_ state: State) -> some View {
        modifier(LoadStateTransition(state: state))
    }
}
