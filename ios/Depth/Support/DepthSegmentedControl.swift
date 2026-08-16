import SwiftUI

// Literal port of web's `components/ui/SegmentedControl.tsx` (fill flavor, `sm` size):
// a rounded-pill tab group on a `surfaceChip` track where the active segment fills with
// the caller's color (the team's `uiAccent`), active text sits on `onAccent`, and the
// active segment carries a `withAlpha(activeTextColor, 40)` border (web lines 74-78).
// Compact/intrinsic-width, not stretched (DEP-229) — web's `size="sm" className="shrink-0"`
// sits inline next to the team-switcher pill, never a full-width standalone row.
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
        // `surfaceChip` track. Each segment is `rounded-xl px-2.5 py-1.5` in web. DEP-235:
        // no 44pt min-height frame here — that inflated the Button's *layout box* (not
        // just its hit area), so the track sized to 44pt while the drawn highlight capsule
        // stayed ~24pt, leaving the "background extends way beyond the highlight" gap.
        // This is web's compact `sm` size sitting inline with the team pill (which isn't
        // 44pt either), so the tap target here is the capsule itself (a stock capsule
        // Picker would be the same). The unit tabs keep the 44pt guarantee via their own
        // control (DepthUnitTabBar).
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
                        // Embedded in the nav bar's principal slot alongside the team
                        // pill (DEP-229), there isn't always room for "SCHEDULE" at
                        // full size — lineLimit + minimumScaleFactor shrinks it instead
                        // of wrapping mid-word ("SCHED-ULE"), same safety valve the
                        // team-switcher pill's abbrev already uses.
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        // DEP-229: hug each label's own width (web: `SegmentedControl
                        // size="sm"`, intrinsic-width, never stretched) instead of
                        // evenly filling the parent — that's what made this control
                        // stretch across the full screen as a standalone row.
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(isActive ? activeColor : Color.clear, in: RoundedRectangle(cornerRadius: 12))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(
                                    isActive ? activeTextColor.opacity(0.40) : Color.clear,
                                    lineWidth: 1
                                )
                        }
                }
                .contentShape(Rectangle())
                .buttonStyle(.plain)
                .accessibilityIdentifier(option.identifier)
            }
        }
        .padding(4)
        .background(DesignTokens.Colors.surfaceChip, in: RoundedRectangle(cornerRadius: 16))
    }
}