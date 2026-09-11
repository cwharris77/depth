import SwiftUI

// The full-screen "everything about one player" destination (2026-09-10 design spec):
// full season-by-season stats, and later draft history and accolades. Reachable from
// PlayerDetailView's card (a "Full stats & history" row) and from Compare's PlayerCell.
// Distinct from PlayerDetailView, which stays the quick-glance sheet — this is a
// NavigationStack push, not a sheet, so it composes into whatever stack pushed it rather
// than owning its own dismiss chrome.
//
// Draft history is deferred until DEP-393's `draft_picks` table ships; accolades has no
// confirmed data source yet (DEP-533) and renders as an explicit empty state, kept last
// so an empty section reads as a coda rather than a gap before more content (Cooper,
// 2026-09-10).
struct PlayerProfileView: View {
    let player: Player
    let team: Team?
    /// See PlayerDetailView's identical property: the actively-selected kit when opened
    /// from the depth chart, else the team's own. Compare's entry point has no kit
    /// selection, so it always passes nil and falls back to `team?.colors.jersey`.
    let kitColors: JerseyColors?

    @State private var viewModel: PlayerProfileViewModel

    @ScaledMetric(relativeTo: .title) private var scaledPhotoSize: CGFloat = 96
    @ScaledMetric(relativeTo: .title) private var scaledNumberSize: CGFloat = 64
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var photoSize: CGFloat { min(scaledPhotoSize, 140) }
    private var jersey: JerseyColors? { kitColors ?? team?.colors.jersey }
    private var markColor: Color {
        jersey.map { Color(hex: TeamSurfaces.mark($0)) } ?? DesignTokens.Colors.accent
    }

    init(player: Player, team: Team?, kitColors: JerseyColors? = nil, repository: DepthRepository) {
        self.player = player
        self.team = team
        self.kitColors = kitColors
        _viewModel = State(initialValue: PlayerProfileViewModel(
            playerID: player.id, teamID: team?.id, repository: repository
        ))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                header
                vitals
                statsSection
                accoladesSection
            }
            .padding()
        }
        .scrollIndicators(.hidden)
        .background(DesignTokens.Colors.bg)
        .navigationTitle(player.name.isEmpty ? "#\(player.number)" : player.name)
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("player-profile-full-content")
        .task { await viewModel.load() }
    }

    // Same side-by-side/stacked switch as PlayerDetailView's header, for the same reason:
    // at accessibility sizes the identity column is narrower than a single word.
    private var header: some View {
        let accent = markColor
        let identity = VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            jerseyNumeral
            Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                .font(.title.bold())
                .accessibilityIdentifier("player-profile-full-name")
            if dynamicTypeSize.isAccessibilitySize {
                positionLabel(accent)
                statusLabel(accent)
            } else {
                HStack(spacing: 6) {
                    positionLabel(accent)
                    statusLabel(accent)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    photo
                    identity
                }
            } else {
                HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                    photo
                    identity
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var jerseyNumeral: some View {
        if let colors = jersey {
            let numeral = TeamSurfaces.numeral(colors)
            StrokedText(
                runs: [
                    .init(
                        text: "#",
                        size: scaledNumberSize * 0.5,
                        fill: Color(hex: numeral.fill),
                        stroke: Color(hex: numeral.stroke),
                        strokeWidthPercent: 3
                    ),
                    .init(
                        text: String(player.number),
                        size: scaledNumberSize,
                        fill: Color(hex: numeral.fill),
                        stroke: Color(hex: numeral.stroke),
                        strokeWidthPercent: 3
                    ),
                ],
                weight: .black,
                tracking: scaledNumberSize * -0.03
            )
            .accessibilityLabel("Jersey number \(player.number)")
        } else {
            Text("#\(player.number)")
                .font(.system(size: scaledNumberSize, weight: .black))
                .tracking(scaledNumberSize * -0.03)
                .foregroundStyle(DesignTokens.Colors.accent)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .accessibilityLabel("Jersey number \(player.number)")
        }
    }

    @ViewBuilder
    private var photo: some View {
        let accent = jersey.map { Color(hex: TeamSurfaces.ring($0)) } ?? DesignTokens.Colors.accent
        let fill = jersey.map { Color(hex: TeamSurfaces.fill($0)) } ?? DesignTokens.Colors.accent
        let onFillHex = jersey.map { readableTextOn(TeamSurfaces.fill($0)) }
        let onFill = onFillHex.map(Color.init(hex:)) ?? DesignTokens.Colors.onAccent
        ZStack {
            Circle().fill(fill)
            if let url = player.photoUrl.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        initials(onFill)
                    }
                }
                .clipShape(Circle())
            } else {
                initials(onFill)
            }
        }
        .frame(width: photoSize, height: photoSize)
        .overlay {
            Circle().strokeBorder(accent, lineWidth: 2)
        }
        .accessibilityHidden(true)
    }

    private func initials(_ color: Color) -> some View {
        Text("\(player.number)")
            .font(.title.bold())
            .foregroundStyle(color)
    }

    private func positionBadge(accent: Color) -> some View {
        Text(player.position.rawValue)
            .font(.caption.bold())
            .foregroundStyle(accent)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(DesignTokens.Colors.surfaceNavy, in: Capsule())
            .overlay {
                Capsule().strokeBorder(accent.opacity(0.40), lineWidth: 1)
            }
    }

    private func positionLabel(_ accent: Color) -> some View {
        HStack(spacing: 6) {
            positionBadge(accent: accent)
            Text(player.position.fullName)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("player-profile-full-position")
    }

    private func statusLabel(_ accent: Color) -> some View {
        Text(player.status.rawValue.capitalized)
            .font(.caption.weight(.semibold))
            .foregroundStyle(playerStatusColor(player.status, accent: accent))
            .accessibilityIdentifier("player-profile-full-status")
    }

    private var vitals: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: DesignTokens.Spacing.sm))
            : AnyLayout(HStackLayout(spacing: 0))
        return layout {
            vital("Age", PlayerProfileDisplay.age(player.age))
            divider
            vital("Experience", PlayerProfileDisplay.experience(player.experience))
            divider
            vital("Height", PlayerProfileDisplay.height(player.height))
            divider
            vital("Weight", PlayerProfileDisplay.weight(player.weight))
        }
        .depthCard(dense: true)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-full-vitals")
    }

    private func vital(_ label: String, _ value: String) -> some View {
        VStack(alignment: .center, spacing: 2) {
            Text(label.uppercased())
                .font(.caption)
                .tracking(0.5)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            Text(value)
                .font(.subheadline.weight(.black))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label), \(value)")
    }

    @ViewBuilder
    private var divider: some View {
        if dynamicTypeSize.isAccessibilitySize {
            Divider().overlay(DesignTokens.Colors.borderDefault)
        } else {
            Rectangle()
                .fill(DesignTokens.Colors.borderDefault)
                .frame(width: 1)
                .padding(.vertical, 4)
        }
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(PlayerProfileSection.seasonStatsTitle)
            switch viewModel.statsState {
            case .loading:
                PlayerStatsSkeleton(columnCount: playerStatColumns(for: player.position).count)
            case .loaded:
                PlayerStatsTable(
                    stats: viewModel.stats,
                    columns: playerStatColumns(for: player.position),
                    accent: markColor
                )
                .frame(maxWidth: .infinity, alignment: PlayerStatsTableLayout.containerAlignment.swiftUI)
            case .empty:
                ContentUnavailableView("No stats available", systemImage: "chart.bar.xaxis")
                    .frame(maxWidth: .infinity)
            case .failed(let error):
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text(error.recoveryDescription)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                    Button("Retry") { Task { await viewModel.retry() } }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("player-profile-full-stats-retry")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-full-stats")
    }

    // DEP-533 (accolades data source) is unresolved — this stays a visible, explicit
    // empty state rather than a hidden section, per the design spec's locked decision:
    // the screen keeps its promise that accolades exist here, just not yet.
    private var accoladesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(PlayerProfileSection.accoladesTitle)
            ContentUnavailableView("Coming soon", systemImage: "trophy")
                .frame(maxWidth: .infinity, minHeight: 100)
                .depthCard(dense: true)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-full-accolades")
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .tracking(0.5)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }
}
