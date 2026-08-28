import SwiftUI

// One team's kits, pushed from the archive's team-card grid (2026-08-27 archive v2). The
// grid trades detail for density — an abbreviation, a jersey and a count — so this is
// where a kit gets its full name, its years and its status before the sheet.
//
// It takes an already-derived `TeamGroup` rather than fetching anything: the archive
// loads all 32 teams in one read, and re-deriving the group on every render (see
// `UniformArchiveViewModel.team(id:)`) is what keeps a filter change made from this
// screen's own Filters button visible here instead of stranding a stale snapshot.
struct UniformTeamDetailView: View {
    let team: UniformArchive.TeamGroup
    let onSelectKit: (UniformListing) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero
                VStack(spacing: DesignTokens.Spacing.sm + 6) {
                    ForEach(team.kits) { kit in
                        kitRow(kit)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.top, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
        }
        .background(DesignTokens.Colors.bg)
        .navigationTitle(team.teamAbbrev)
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("uniform-team-detail")
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs + 2) {
            Text(team.teamName)
                .font(.largeTitle.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(team.divisionLabel)
                Text("·").foregroundStyle(DesignTokens.Colors.textFaintest)
                Text(team.kitCountLabel)
            }
            .font(.caption.monospacedDigit())
            .foregroundStyle(DesignTokens.Colors.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, DesignTokens.Spacing.screenMargin)
        .padding(.vertical, DesignTokens.Spacing.md + 2)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: team.representativeKit.colors.primary).opacity(0.33),
                    DesignTokens.Colors.bg,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(DesignTokens.Colors.borderDefault)
                .frame(height: 1)
        }
    }

    private func kitRow(_ kit: UniformListing) -> some View {
        Button {
            onSelectKit(kit)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                UniformThumb(url: UniformArt.fullURL(for: kit.id), size: 60)
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm - 1) {
                    Text(kit.name)
                        .font(.title3.bold())
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .multilineTextAlignment(.leading)
                    Text(UniformArchive.years(kit))
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                    UniformKitBadges(kit: kit)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
            }
            .padding(.horizontal, DesignTokens.Spacing.md - 2)
            .padding(.vertical, DesignTokens.Spacing.sm + 4)
            // The row is mostly whitespace around a short label; without this the tap
            // target is only the glyphs themselves.
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .depthCard(dense: true, padded: false, radius: DesignTokens.Radius.md)
        .accessibilityIdentifier("uniform-kit-row-\(kit.id)")
        .accessibilityLabel(
            "\(kit.name), \(UniformArchive.yearsLong(kit)), \(kit.isCurrent ? "in rotation" : "retired")"
        )
    }
}
