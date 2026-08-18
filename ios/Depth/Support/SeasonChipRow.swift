import SwiftUI

// DEP-263: the shared season switcher, promoted out of Stats (web parity,
// TeamStatsView.tsx lines 338-397) so Schedule uses the same control instead of a
// stock `.menu` Picker — one "pick a season" interaction across the app. A horizontal-
// scrolling row of `SeasonChip` pills; each chip can carry an optional leading "latest"
// dot, trailing UPCOMING badge, and dashed border for a synthetic not-yet-real season.
// Stats uses all three decorations; Schedule uses none. Scales to a long season list via
// horizontal scroll, unlike a fixed-width segmented control.
struct SeasonChipItem: Identifiable {
    let season: Int
    var leading: SeasonChip.Decoration?
    var trailing: SeasonChip.Decoration?
    var dashed: Bool = false

    var id: Int { season }
}

struct SeasonChipRow: View {
    let items: [SeasonChipItem]
    let selectedSeason: Int?
    let accent: Color
    let identifierPrefix: String
    let onSelect: (Int) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(items) { item in
                    SeasonChip(
                        label: String(item.season),
                        isSelected: item.season == selectedSeason,
                        accent: accent,
                        leading: item.leading,
                        trailing: item.trailing,
                        dashed: item.dashed
                    ) {
                        onSelect(item.season)
                    }
                    .accessibilityIdentifier("\(identifierPrefix)-season-\(item.season)")
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 10)
        }
    }
}

/// A single season switcher chip (web lines 354-373 real rows, 381-396 synthetic chip).
/// `leading`/`trailing` are the optional latest-dot and UPCOMING badge decorations.
struct SeasonChip: View {
    enum Decoration {
        case latestDot
        case upcomingBadge
    }

    let label: String
    let isSelected: Bool
    let accent: Color
    let leading: Decoration?
    let trailing: Decoration?
    var dashed: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if leading == .latestDot {
                    Circle()
                        .fill(isSelected ? DesignTokens.Colors.onAccent : accent)
                        .frame(width: 6, height: 6)
                }
                Text(label)
                    .font(.caption.bold())
                if trailing == .upcomingBadge {
                    SeasonChipUpcomingBadge(isSelected: isSelected, accent: accent)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? accent : Color.clear, in: RoundedRectangle(cornerRadius: 3))
            .overlay {
                RoundedRectangle(cornerRadius: 3)
                    .strokeBorder(
                        isSelected ? accent : DesignTokens.Colors.borderInput,
                        style: StrokeStyle(lineWidth: 1, dash: dashed ? [3] : [])
                    )
            }
            .foregroundStyle(isSelected ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textMuted)
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
    }
}

/// Web's `UpcomingBadge` (lines 73-85) — selected inverts to the on-accent color with an
/// on-accent55 border; unselected is accent text on `accent1a` with an `accent55` border.
private struct SeasonChipUpcomingBadge: View {
    let isSelected: Bool
    let accent: Color

    var body: some View {
        Text("UPCOMING")
            .font(.caption2.bold())
            .tracking(0.4)
            .padding(.horizontal, 6)
            .padding(.vertical, 1)
            .foregroundStyle(isSelected ? DesignTokens.Colors.onAccent : accent)
            .background(isSelected ? DesignTokens.Colors.onAccent.opacity(0.33) : accent.opacity(0.10))
            .overlay {
                Capsule().strokeBorder(
                    isSelected ? DesignTokens.Colors.onAccent.opacity(0.55) : accent.opacity(0.55),
                    lineWidth: 1
                )
            }
    }
}

/// Shared "Back to current" escape hatch (DEP-245/DEP-254): shown only while a past
/// season is selected on either the Stats or Schedule page, returns to the
/// current/upcoming season on tap.
struct BackToCurrentSeasonButton: View {
    let identifier: String
    let action: () -> Void

    var body: some View {
        Button("Back to current", action: action)
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityIdentifier(identifier)
    }
}
