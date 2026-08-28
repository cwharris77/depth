import SwiftUI

// One kit, opened from anywhere in the archive (2026-08-27 archive v2). The full
// mannequin at the size it was drawn for, beside the facts the grid and drill-in rows
// had to abbreviate: the unshortened year range, how long the kit actually lasted, and
// which team it belongs to.
//
// Two deliberate omissions from the pre-v2 sheet design, both Cooper's calls:
//   • The dismiss control is the shared `CloseButton` in the corner, not a second
//     full-width button beside the primary action — every other sheet in the app hosts
//     its X the same way, and sitting it next to "Open depth chart" was the bug.
//   • No color swatches. The ones this sheet used to show were the *team's* primary and
//     secondary, so every Buccaneers kit displayed the same red and pewter including the
//     cream Creamsicle. A truthful per-kit palette needs color data the archive doesn't
//     store, so the swatches are gone rather than wrong.
struct UniformKitSheet: View {
    @Environment(\.dismiss) private var dismiss

    let kit: UniformListing
    /// Jumps to this kit's team on the Depth Charts tab. Owned by the tab (which owns the
    /// cross-tab route), not by this sheet.
    let onOpenDepthChart: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                HStack(alignment: .top, spacing: DesignTokens.Spacing.md + 2) {
                    UniformThumb(url: UniformArt.fullURL(for: kit.id), size: 112)
                    details
                }
                openDepthChartButton
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xl)
        }
        .scrollBounceBehavior(.basedOnSize)
        .overlay(alignment: .topTrailing) {
            CloseButton(action: { dismiss() }, placement: .overlay, identifier: "uniform-kit-close")
                .padding(DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Colors.bg)
        .presentationBackground(DesignTokens.Colors.surfaceCard)
        .presentationDragIndicator(.visible)
        // Sized to the artwork it is built around, with `.large` available so an
        // accessibility text size can grow into a full sheet instead of scrolling a
        // cramped one.
        .presentationDetents([.height(470), .large])
        .accessibilityIdentifier("uniform-kit-sheet")
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs + 2) {
                HStack(spacing: DesignTokens.Spacing.sm - 1) {
                    UniformTeamRail(colors: kit.colors)
                    Text(kit.teamName)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                }
                Text(kit.name)
                    .font(.title.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            // Only the title block clears the close button; the rows below it start
            // under the button and can use the full column width.
            .padding(.trailing, 44)

            UniformKitBadges(kit: kit, prominent: true)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs - 1) {
                Text("WORN")
                    .font(.caption2.weight(.semibold))
                    .tracking(1.2)
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
                Text(UniformArchive.yearsLong(kit))
                    .font(.title2.monospacedDigit())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var openDepthChartButton: some View {
        Button {
            onOpenDepthChart()
            dismiss()
        } label: {
            Text("Open depth chart")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.onAccent)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(DesignTokens.Colors.accent, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniform-kit-open-depth-chart")
    }
}
