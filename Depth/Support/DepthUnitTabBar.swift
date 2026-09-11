import SwiftUI

// Literal port of web's `web/components/ui/TabBar.tsx` as used by `FieldHeaderMenu.tsx`
// (lines 36-46): an underline-style tab row. The active tab carries a 2px bottom border
// in the team's accent; inactive tabs are faint with a transparent border. Distinct from
// `DepthSegmentedControl`'s filled pill — used where tabs share a baseline, per web.
// Generic over any Hashable selection (the depth-chart field's units, Schedule's season
// phases) so every underline row shares one selection animation and one accessibility
// contract. 44pt min-height preserves the tap target the stock capsule `Picker` used to
// provide.
struct DepthTabBar<Selection: Hashable>: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var selectionNamespace

    let options: [DepthSegmentedOption<Selection>]
    let selection: Selection
    let onChange: (Selection) -> Void
    var activeColor: Color = DesignTokens.Colors.accent

    var body: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 0))
            : AnyLayout(HStackLayout(spacing: 16))
        layout {
            ForEach(options, id: \.value) { option in
                tab(option)
            }
        }
        .sensoryFeedback(.selection, trigger: selection)
    }

    private func tab(_ option: DepthSegmentedOption<Selection>) -> some View {
        let isActive = option.value == selection
        return Button {
            withAnimation(reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.selection) {
                onChange(option.value)
            }
        } label: {
            Text(option.label)
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
                                .matchedGeometryEffect(id: "tab-selection", in: selectionNamespace)
                        }
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        // The active tab was previously distinguished only by text color and a 2px
        // underline — both invisible to VoiceOver, which announced all three tabs
        // identically. `DepthSegmentedControl` already exposes this; the underline variant
        // should too.
        .accessibilityAddTraits(isActive ? .isSelected : [])
        .accessibilityIdentifier(option.identifier)
    }

    private var selectionIndicator: some View {
        Capsule()
            .fill(activeColor)
            .frame(height: 2)
    }
}

// The depth-chart field's unit switcher (and Compare's). The three labels are web's
// `UNIT_LABELS` uppercased ("SPECIAL", not "Special Teams").
struct DepthUnitTabBar: View {
    let selection: Unit
    let onChange: (Unit) -> Void
    var activeColor: Color = DesignTokens.Colors.accent
    /// Accessibility-identifier prefix, so a second instance on another screen is
    /// addressable separately (Compare's By-team lens passes "compare-lens"; the field and
    /// Compare's By-position picker keep the default). Defaulted, so every existing caller
    /// keeps the ids its tests already assert.
    var identifierPrefix: String = "unit-tab"

    var body: some View {
        DepthTabBar(
            options: [(Unit.offense, "OFFENSE"), (.defense, "DEFENSE"), (.special, "SPECIAL")].map {
                DepthSegmentedOption(value: $0.0, label: $0.1, identifier: "\(identifierPrefix)-\($0.0.rawValue)")
            },
            selection: selection,
            onChange: onChange,
            activeColor: activeColor
        )
    }
}
