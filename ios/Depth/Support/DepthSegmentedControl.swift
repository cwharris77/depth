import SwiftUI

// Literal port of web's `components/ui/SegmentedControl.tsx` (fill flavor, `md` size):
// a rounded-pill tab group on a `surfaceChip` track where the active segment fills with
// the caller's color (the team's `uiAccent`), active text sits on `onAccent`, and the
// active segment carries a `withAlpha(activeTextColor, 40)` border (web lines 74-78).
// Used for the round-4 ROSTER/SCHEDULE/STATS page switcher. Generic over `Selection` so
// any Hashable enum can drive it; each option carries its own accessibility identifier
// (the page switcher uses `page-switcher-roster` etc.). Options are rendered uppercase
// by the caller (web upper-cases in `TeamPageHeader`).
struct DepthSegmentedOption<Selection: Hashable> {
    let value: Selection
    let label: String
    let identifier: String
}

struct DepthSegmentedControl<Selection: Hashable>: View {
    let options: [DepthSegmentedOption<Selection>]
    let selection: Selection
    let onChange: (Selection) -> Void
    var activeColor: Color = DesignTokens.Colors.accent
    var activeTextColor: Color = DesignTokens.Colors.onAccent

    var body: some View {
        // Web `md` track: `rounded-2xl p-1 gap-1` — native hugging-content HStack on the
        // `surfaceChip` track. Each segment is `rounded-xl px-2.5 py-1.5` in web; the
        // 44pt min-height guarantees the spec's tap target (a stock capsule Picker
        // provides the same by default, and the underline restyle must not regress it).
        HStack(spacing: 4) {
            ForEach(options, id: \.value) { option in
                let isActive = option.value == selection
                Button {
                    onChange(option.value)
                } label: {
                    Text(option.label)
                        .font(.caption.bold())
                        .tracking(0.3)
                        .foregroundStyle(isActive ? activeTextColor : DesignTokens.Colors.textMuted)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(isActive ? activeColor : Color.clear, in: RoundedRectangle(cornerRadius: 12))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(
                                    isActive ? activeTextColor.opacity(0.40) : Color.clear,
                                    lineWidth: 1
                                )
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier(option.identifier)
            }
        }
        .padding(4)
        .background(DesignTokens.Colors.surfaceChip, in: RoundedRectangle(cornerRadius: 16))
    }
}