import SwiftUI

// One team's uniforms: everything in rotation as a lineup of full figures, then retired
// designs grouped by the decade they were first worn. Every uniform is a bordered card
// with a footer row and chevron, so it reads as something to open, and the footer counts
// the verified combinations waiting on its page.
//
// Like the older drill-in, it takes an already-derived `TeamGroup` so a filter changed
// from this screen is reflected here.
struct UniformTeamPageView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let team: UniformArchive.TeamGroup
    /// How many ways a design can be shown on its page, its own figure included.
    let combinationCount: (UniformListing) -> Int
    let onSelectKit: (UniformListing) -> Void

    private var sections: UniformArchive.TeamSections {
        UniformArchive.teamSections(team.kits)
    }

    private var columns: [GridItem] {
        let count = dynamicTypeSize.isAccessibilitySize ? 1 : 3
        return Array(
            repeating: GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            count: count)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if !sections.inRotation.isEmpty {
                    rotation
                }
                ForEach(sections.past) { decade in
                    pastDecade(decade)
                }
            }
            .padding(.bottom, DesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Colors.bg)
        .navigationTitle(team.teamName)
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("uniform-team-detail")
    }

    private var rotation: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 4) {
            sectionHeader {
                Text("IN ROTATION")
                    .font(.caption.bold())
                    .tracking(1.2)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            } trailing: {
                Text(team.divisionLabel)
            }
            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
                ForEach(sections.inRotation) { kit in
                    card(kit, dates: kit.rotationDates, prominent: true)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.screenMargin - 4)
        .padding(.top, DesignTokens.Spacing.sm + 4)
        .padding(.bottom, DesignTokens.Spacing.lg - 4)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: team.representativeKit.colors.primary).opacity(0.4),
                    DesignTokens.Colors.bg,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private func pastDecade(_ decade: UniformArchive.DecadeGroup) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 4) {
            sectionHeader {
                Text(decade.label)
                    .font(.title3.bold().monospacedDigit())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            } trailing: {
                Text(decade.countLabel)
            }
            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
                ForEach(decade.kits) { kit in
                    card(kit, dates: kit.presentation.dates, prominent: false)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.screenMargin)
        .padding(.vertical, DesignTokens.Spacing.md + 2)
        .overlay(alignment: .top) {
            Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
        }
    }

    private func sectionHeader<Leading: View, Trailing: View>(
        @ViewBuilder _ leading: () -> Leading, @ViewBuilder trailing: () -> Trailing
    ) -> some View {
        HStack(alignment: .firstTextBaseline) {
            leading()
            Spacer(minLength: DesignTokens.Spacing.sm)
            trailing()
                .font(.caption2.monospacedDigit())
                .foregroundStyle(DesignTokens.Colors.textMuted)
        }
    }

    @ViewBuilder
    private func title(_ kit: UniformListing, prominent: Bool) -> some View {
        let text = Text(kit.presentation.title)
            .font(prominent ? .headline : .subheadline.weight(.semibold))
            .foregroundStyle(
                prominent ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textSecondary
            )
            .multilineTextAlignment(.center)
        if dynamicTypeSize.isAccessibilitySize {
            text
        } else {
            // Two lines reserved, so cards in a row stay the same height whether or not a
            // name wraps.
            text.lineLimit(2, reservesSpace: true)
        }
    }

    private func card(_ kit: UniformListing, dates: String, prominent: Bool) -> some View {
        let count = combinationCount(kit)
        return Button {
            onSelectKit(kit)
        } label: {
            VStack(spacing: DesignTokens.Spacing.xs + 1) {
                UniformThumb(url: UniformArt.fullURL(for: kit.id), size: prominent ? 80 : 48)
                title(kit, prominent: prominent)
                Text(dates)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .multilineTextAlignment(.center)
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Text(count > 1 ? "\(count) combos" : "Details")
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(
                    prominent ? DesignTokens.Colors.textSecondary : DesignTokens.Colors.textMuted
                )
                .frame(minHeight: 34)
                .overlay(alignment: .top) {
                    Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
                }
                .padding(.top, DesignTokens.Spacing.xs - 1)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm + 2)
            .padding(.top, DesignTokens.Spacing.sm + 4)
            .frame(maxWidth: .infinity)
            .background(
                prominent ? DesignTokens.Colors.bg.opacity(0.55) : DesignTokens.Colors.surfaceCard2,
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .strokeBorder(
                        prominent
                            ? DesignTokens.Colors.borderInput : DesignTokens.Colors.borderDefault,
                        lineWidth: 1)
            }
            // The whole card is the target, not just its text and figure.
            .contentShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniform-kit-row-\(kit.id)")
        .accessibilityLabel(kit.presentation.accessibilityLabel)
        .accessibilityHint(count > 1 ? Text("\(count) combinations") : Text(verbatim: ""))
    }
}
