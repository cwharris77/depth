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
    let selection: Unit
    let onChange: (Unit) -> Void
    var activeColor: Color = DesignTokens.Colors.accent

    var body: some View {
        HStack(spacing: 16) {
            unitTab(.offense, label: "OFFENSE")
            unitTab(.defense, label: "DEFENSE")
            unitTab(.special, label: "SPECIAL")
        }
    }

    private func unitTab(_ unit: Unit, label: String) -> some View {
        let isActive = unit == selection
        return Button {
            onChange(unit)
        } label: {
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(isActive ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textFaint)
                // DEP-230: hug the label's own width (web's TabBar.tsx is `flex gap-4`,
                // no stretch) instead of evenly filling the row — that's what was
                // spreading OFFENSE/DEFENSE/SPECIAL across the full screen width.
                .frame(minHeight: 44)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(isActive ? activeColor : Color.clear)
                        .frame(height: 2)
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("unit-tab-\(unit.rawValue)")
    }
}