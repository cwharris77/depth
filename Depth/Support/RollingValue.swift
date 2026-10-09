import SwiftUI

/// Rolls a headline number's digits to its new value when it changes in place, such as a
/// season switch. Under Reduce Motion the old and new values crossfade instead. The first
/// appearance is not animated, since nothing changed in place.
private struct RollingValue<Value: Equatable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let value: Value

    func body(content: Content) -> some View {
        content
            .contentTransition(reduceMotion ? .opacity : .numericText())
            .animation(
                DesignTokens.Motion.selection.respectingReduceMotion(reduceMotion), value: value)
    }
}

extension View {
    /// Applies the shared numeric roll, keyed on the value the text displays.
    func rollingValue<Value: Equatable>(_ value: Value) -> some View {
        modifier(RollingValue(value: value))
    }
}
