import SwiftUI

// Literal port of web's `components/ui/SegmentedControl.tsx` (fill flavor, `sm` size):
// a rounded-pill tab group on a `surfaceChip` track where the active segment fills with
// the caller's color (the team's `uiAccent`), active text sits on `onAccent`, and the
// active segment carries a `withAlpha(activeTextColor, 40)` border (web lines 74-78).
// Two widths, matching web's `fullWidth` (DEP-236): default hugs content — the compact
// `size="sm"` that once sat inline next to the team pill (DEP-229) — and `fullWidth:
// true` stretches the track and splits options evenly for a standalone page bar.
// Used for the ROSTER/SCHEDULE/STATS page switcher. Generic over `Selection` so
// any Hashable enum can drive it; each option carries its own accessibility identifier
// (the page switcher uses `page-switcher-roster` etc.). Options are rendered uppercase
// by the caller (web upper-cases in `TeamPageHeader`).
struct DepthSegmentedOption<Selection: Hashable> {
    let value: Selection
    let label: String
    let identifier: String
}

struct DepthSegmentedControl<Selection: Hashable>: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var selectionNamespace

    let options: [DepthSegmentedOption<Selection>]
    let selection: Selection
    let onChange: (Selection) -> Void
    var activeColor: Color = DesignTokens.Colors.accent
    var activeTextColor: Color = DesignTokens.Colors.onAccent
    /// Web parity (components/ui/SegmentedControl.tsx `fullWidth`): true stretches the
    /// track full-width and splits the options evenly (web: `w-full` + `flex-1
    /// text-center`), for a standalone bar (DEP-236 page switcher); false hugs content
    /// (the old inline-with-the-pill usage).
    var fullWidth: Bool = false

    var body: some View {
        // Web `md` track: `rounded-2xl p-1 gap-1` — native hugging-content HStack on the
        // `surfaceChip` track. The track and each button stay 44pt tall for the native
        // touch target, while the selected surface is inset to 36pt so it reads as a
        // highlight inside the control instead of a second oversized button. The selected
        // surface moves as one piece between options, preserving spatial continuity.
        HStack(spacing: 4) {
            ForEach(options, id: \.value) { option in
                let isActive = option.value == selection
                Button {
                    withAnimation(reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.selection) {
                        onChange(option.value)
                    }
                } label: {
                    Text(option.label)
                        .font(.caption.bold())
                        .tracking(0.3)
                        .foregroundStyle(isActive ? activeTextColor : DesignTokens.Colors.textMuted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .padding(.horizontal, 10)
                        .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: 44)
                        .background { selectionSurface(isActive: isActive) }
                }
                .contentShape(Rectangle())
                .buttonStyle(.plain)
                // Selection already has a visible filled surface; expose the same state
                // semantically so VoiceOver does not have to infer it from color.
                .accessibilityAddTraits(isActive ? .isSelected : [])
                .accessibilityIdentifier(option.identifier)
            }
        }
        .frame(maxWidth: fullWidth ? .infinity : nil)
        .padding(.horizontal, 4)
        .background(DesignTokens.Colors.surfaceChip, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .sensoryFeedback(.selection, trigger: selection)
    }

    @ViewBuilder
    private func selectionSurface(isActive: Bool) -> some View {
        if isActive {
            if reduceMotion {
                selectionShape.transition(.opacity)
            } else {
                selectionShape
                    .matchedGeometryEffect(id: "segmented-selection", in: selectionNamespace)
            }
        }
    }

    private var selectionShape: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(activeColor)
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .strokeBorder(activeTextColor.opacity(0.40), lineWidth: 1)
            }
            .padding(.vertical, 4)
    }
}
