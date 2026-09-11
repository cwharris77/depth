import SwiftUI

// The kind + status badge pair a kit carries wherever it is shown at full size — the
// team drill-in's rows and the detail sheet (2026-08-27 archive v2). One view rather
// than the same capsule pair written twice (AGENTS.md #17), and the status colors are
// decided here so "IN ROTATION" can't end up accent-tinted in one place and muted in
// the other.
struct UniformKitBadges: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let kit: UniformListing
    /// The sheet renders the pair a step larger than the row does.
    var prominent = false

    var body: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.xs + 2))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.xs + 2))
        layout {
            badge(
                UniformArchive.kindLabel(kit.kind),
                fill: DesignTokens.Colors.surfaceChip,
                text: prominent ? DesignTokens.Colors.textSecondary : DesignTokens.Colors.textMuted
            )
            badge(
                kit.isCurrent ? "IN ROTATION" : "RETIRED",
                fill: kit.isCurrent
                    ? DesignTokens.Colors.accent.opacity(0.16)
                    : DesignTokens.Colors.surfaceRaised,
                text: kit.isCurrent
                    ? DesignTokens.Colors.accentSoft
                    : DesignTokens.Colors.textFaint
            )
        }
        .accessibilityElement(children: .combine)
    }

    private func badge(_ label: String, fill: Color, text: Color) -> some View {
        Text(label)
            .font(.caption2.weight(.semibold))
            .tracking(1)
            .foregroundStyle(text)
            .padding(.horizontal, DesignTokens.Spacing.sm + 2)
            .padding(.vertical, prominent ? 5 : 4)
            .background(fill, in: Capsule())
    }
}

/// The team's colors as the 3pt vertical rail that labels a kit with its team — the same
/// gradient the archive's team cards and the depth chart's team accent use.
struct UniformTeamRail: View {
    let colors: TeamColors
    var height: CGFloat = 13

    var body: some View {
        RoundedRectangle(cornerRadius: 2, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Color(hex: colors.primary), Color(hex: colors.secondary)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(width: 3, height: height)
            .accessibilityHidden(true)
    }
}
