import SwiftUI

// One uniform's page, pushed from the archive. The full figure leads; below it, each
// verified combination (the same jersey with other pants, socks or helmet) is a chip
// that swaps the figure in place. Combinations never become archive entries of their own.
struct UniformKitDetailView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let kit: UniformListing
    /// The design's own figure first, then its extra combinations.
    let options: [UniformCombination]
    /// Jumps to this kit's team on the Depth Charts tab.
    let onOpenDepthChart: () -> Void

    @State private var selectedKey = UniformArchive.canonicalCombinationKey

    private var selected: UniformCombination? {
        options.first { $0.key == selectedKey } ?? options.first
    }

    private var dates: String {
        kit.isCurrent ? kit.rotationDates : kit.presentation.dates
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    titleBlock
                    if options.count > 1 {
                        combinationPicker
                    }
                    openDepthChartButton
                }
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
        }
        .background(DesignTokens.Colors.bg)
        .navigationTitle(kit.teamAbbrev)
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("uniform-kit-detail")
    }

    private var hero: some View {
        ZStack {
            // Keyed by combination so a swap crossfades the old figure out and the new
            // one in rather than snapping.
            UniformThumb(url: selected?.fullURL, size: 130)
                .id(selected?.key)
                .transition(.opacity)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.md)
        .background(
            LinearGradient(
                colors: [Color(hex: kit.colors.primary).opacity(0.4), DesignTokens.Colors.bg],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .accessibilityElement()
        .accessibilityLabel(
            [
                kit.presentation.title,
                selected.flatMap {
                    $0.key == UniformArchive.canonicalCombinationKey
                        ? nil : "with \($0.label.lowercased())"
                },
            ]
            .compactMap { $0 }.joined(separator: ", ")
        )
        .accessibilityAddTraits(.isImage)
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs + 2) {
            HStack(spacing: DesignTokens.Spacing.sm - 1) {
                UniformTeamRail(colors: kit.colors)
                Text(kit.teamName)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            Text(kit.presentation.title)
                .font(.title.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(dates)
                    .monospacedDigit()
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                Text("·").foregroundStyle(DesignTokens.Colors.textFaintest)
                    .accessibilityHidden(true)
                Text(kit.presentation.status)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                if let kind = kit.presentation.kindLabel {
                    Text("·").foregroundStyle(DesignTokens.Colors.textFaintest)
                        .accessibilityHidden(true)
                    Text(kind)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                }
            }
            .font(.subheadline)
        }
        .padding(.top, DesignTokens.Spacing.xs)
    }

    private var combinationPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 2) {
            Text("WORN WITH")
                .font(.caption2.weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .accessibilityAddTraits(.isHeader)
            DepthFlowLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(options) { option in
                    chip(option)
                }
            }
        }
    }

    private func chip(_ option: UniformCombination) -> some View {
        let isSelected = option.key == selected?.key
        return Button {
            withAnimation(reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.reveal)
            {
                selectedKey = option.key
            }
        } label: {
            Text(option.label)
                .font(.subheadline.weight(isSelected ? .semibold : .regular))
                .foregroundStyle(
                    isSelected ? DesignTokens.Colors.accentSoft : DesignTokens.Colors.textSecondary
                )
                .padding(.horizontal, DesignTokens.Spacing.md - 2)
                .frame(minHeight: 44)
                .background(
                    isSelected
                        ? DesignTokens.Colors.accent.opacity(0.16)
                        : DesignTokens.Colors.surfaceChip,
                    in: Capsule()
                )
                .overlay {
                    Capsule().strokeBorder(
                        isSelected ? DesignTokens.Colors.accent.opacity(0.66) : .clear,
                        lineWidth: 1)
                }
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniform-combination-\(option.key)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var openDepthChartButton: some View {
        Button {
            onOpenDepthChart()
        } label: {
            Text("Open depth chart")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.onAccent)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(DesignTokens.Colors.accent, in: Capsule())
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniform-kit-open-depth-chart")
    }
}
