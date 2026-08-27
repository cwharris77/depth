import SwiftUI

// Literal port of web's `components/ui/TabBar.tsx` as used by `FieldHeaderMenu.tsx`
// (lines 36-46): an underline-style unit switcher for the depth-chart field. The active
// tab carries a 2px bottom border in the team's `uiAccent`; inactive tabs are faint with
// a transparent border. Distinct from `DepthSegmentedControl`'s filled pill — used where
// tabs share a baseline, per web. Unit-specific (not generic like the segmented control)
// because it is the one place this underline row exists; the three labels are the web
// `UNIT_LABELS` uppercased ("SPECIAL", not "Special Teams"). 44pt min-height preserves
// the tap target the stock capsule `Picker` used to provide.
struct DepthUnitTabBar: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var selectionNamespace

    let selection: Unit
    let onChange: (Unit) -> Void
    var activeColor: Color = DesignTokens.Colors.accent
    /// Accessibility-identifier prefix, so a second instance on another screen is
    /// addressable separately (Compare's By-team lens passes "compare-lens"; the field and
    /// Compare's By-position picker keep the default). Defaulted, so every existing caller
    /// keeps the ids its tests already assert.
    var identifierPrefix: String = "unit-tab"

    var body: some View {
        HStack(spacing: 16) {
            unitTab(.offense, label: "OFFENSE")
            unitTab(.defense, label: "DEFENSE")
            unitTab(.special, label: "SPECIAL")
        }
        .sensoryFeedback(.selection, trigger: selection)
    }

    private func unitTab(_ unit: Unit, label: String) -> some View {
        let isActive = unit == selection
        return Button {
            withAnimation(reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.selection) {
                onChange(unit)
            }
        } label: {
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(isActive ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textFaint)
                // DEP-230: hug the label's own width (web's TabBar.tsx is `flex gap-4`,
                // no stretch) instead of evenly filling the row — that's what was
                // spreading OFFENSE/DEFENSE/SPECIAL across the full screen width.
                .frame(minHeight: 44)
                .overlay(alignment: .bottom) {
                    if isActive {
                        if reduceMotion {
                            selectionIndicator.transition(.opacity)
                        } else {
                            selectionIndicator
                                .matchedGeometryEffect(id: "unit-selection", in: selectionNamespace)
                        }
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        // The active tab was previously distinguished only by text color and a 2px
        // underline — both invisible to VoiceOver, which announced all three tabs
        // identically. `DepthSegmentedControl` already exposes this; the underline variant
        // should too (it is the depth-chart field's unit switcher as well as Compare's).
        .accessibilityAddTraits(isActive ? .isSelected : [])
        .accessibilityIdentifier("\(identifierPrefix)-\(unit.rawValue)")
    }

    private var selectionIndicator: some View {
        Capsule()
            .fill(activeColor)
            .frame(height: 2)
    }
}
