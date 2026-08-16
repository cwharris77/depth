import SwiftUI

// Complete native player profile. The sheet owns presentation and semantic layout only;
// profile fields arrive in Player and its independent lazy stats state stays in the
// feature-local view model so a failed stats read never removes the player profile.
struct PlayerDetailView: View {
    let player: Player
    let team: Team?

    @State private var viewModel: PlayerProfileViewModel

    @Environment(\.dismiss) private var dismiss

    // Portrait and vital tiles scale with body text so an Accessibility XXXL reader
    // gets a proportionate layout rather than large type crammed beside fixed chrome.
    // The portrait is capped because past that it is the text, not the image, that
    // needs the width.
    @ScaledMetric(relativeTo: .title) private var scaledPhotoSize: CGFloat = 96

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var photoSize: CGFloat { min(scaledPhotoSize, 140) }

    init(player: Player, team: Team?, repository: DepthRepository) {
        self.player = player
        self.team = team
        _viewModel = State(initialValue: PlayerProfileViewModel(
            playerID: player.id, teamID: team?.id, repository: repository
        ))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    vitals
                    if let college = PlayerProfileDisplay.meaningful(player.college) {
                        labeledText("College", value: college)
                    }
                    if let bio = PlayerProfileDisplay.meaningful(player.bio) {
                        labeledText("Bio", value: bio)
                    }
                    statsSection
                }
                .padding()
            }
            .accessibilityIdentifier("player-profile-content")
            .toolbar {
                // Top-trailing X, matching the web PlayerCardHeader's close. An xmark is
                // more discoverable than a "Close" text button, and mirrors the familiar
                // swipe-down sheet affordance.
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationBackground(DesignTokens.Colors.bg)
        .task { await viewModel.load() }
        // Visible grabber so the swipe-to-dismiss gesture is discoverable, not just
        // the X (web's player card is a right-hand drawer; native is a sheet).
        .presentationDragIndicator(.visible)
        .presentationDetents([.large])
    }

    // Side-by-side portrait and name only works while the name still has room to wrap on
    // word boundaries. At accessibility sizes the remaining column is narrower than a
    // single word, so the layout stacks instead — otherwise names break mid-word
    // ("DJ Moor / e"), which is the failure this switch exists to prevent.
    private var header: some View {
        let identity = VStack(alignment: .leading, spacing: 8) {
            Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                .font(.title.bold())
                .accessibilityIdentifier("player-profile-name")
            Text("#\(player.number) · \(player.position.rawValue) · \(player.position.fullName)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .accessibilityIdentifier("player-profile-position")
            Text(player.status.rawValue.capitalized)
                .font(.subheadline.weight(.semibold))
                .accessibilityIdentifier("player-profile-status")
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 16) {
                    photo
                    identity
                }
            } else {
                HStack(alignment: .top, spacing: 16) {
                    photo
                    identity
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    // Vitals render as the web StatGrid's one row of four equal columns (AGE / EXP /
    // HT / WT): a single card, label above value, both centered, thin vertical dividers
    // between columns. Replaces the old adaptive grid that wrapped to two rows and
    // left-aligned everything (Cooper's visual pass: values should be centered and
    // smaller so all four fit on one line).
    private var vitals: some View {
        HStack(spacing: 0) {
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
        .accessibilityIdentifier("player-profile-vitals")
    }

    private var divider: some View {
        Rectangle()
            .fill(DesignTokens.Colors.borderDefault)
            .frame(width: 1)
            .padding(.vertical, 4)
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Season Stats")
                .font(.headline)
            switch viewModel.statsState {
            case .loading:
                PlayerStatsSkeleton(columnCount: playerStatColumns(for: player.position).count)
            case .loaded:
                PlayerStatsTable(stats: viewModel.stats, columns: playerStatColumns(for: player.position))
            case .empty:
                ContentUnavailableView("No stats available", systemImage: "chart.bar.xaxis")
                    .frame(maxWidth: .infinity)
            case .failed(let error):
                VStack(alignment: .leading, spacing: 8) {
                    Text(error.recoveryDescription)
                        .foregroundStyle(.secondary)
                    Button("Retry") { Task { await viewModel.retry() } }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("player-profile-stats-retry")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-stats")
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

    private func labeledText(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.bold()).foregroundStyle(.secondary)
            Text(value).fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var photo: some View {
        let accent = team.map { Color(hex: $0.colors.uiAccent) } ?? .accentColor
        let onAccent = team.map { Color(hex: $0.colors.onAccent) } ?? .white
        ZStack {
            Circle().fill(accent)
            if let url = player.photoUrl.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        initials(onAccent)
                    }
                }
                .clipShape(Circle())
            } else {
                initials(onAccent)
            }
        }
        .frame(width: photoSize, height: photoSize)
        .accessibilityHidden(true)
    }

    private func initials(_ color: Color) -> some View {
        Text("\(player.number)")
            .font(.title.bold())
            .foregroundStyle(color)
    }
}

// The table remains horizontally scrollable at Accessibility XXXL rather than truncating
// numeric columns, so its column widths scale with the text (`@ScaledMetric`) instead of
// clipping larger digits inside fixed frames. On-screen headers stay compact; the spoken
// reading comes from `PlayerStatsAccessibility.rowLabel`, which pairs every value with
// its column name — a row combined from the bare cells would announce unlabeled numbers.
private struct PlayerStatsTable: View {
    let stats: [PlayerSeasonStats]
    let columns: [PlayerStatColumn]

    @ScaledMetric(relativeTo: .footnote) private var seasonWidth: CGFloat = 44
    @ScaledMetric(relativeTo: .footnote) private var teamWidth: CGFloat = 40
    @ScaledMetric(relativeTo: .footnote) private var statWidth: CGFloat = 52

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 16) {
                    cell("SZN", width: seasonWidth, header: true)
                    cell("TM", width: teamWidth, header: true)
                    ForEach(columns, id: \.self) { column in
                        cell(column.header, width: statWidth, header: true)
                    }
                }
                // Each data row carries the full spoken label, so repeating the compact
                // headers as their own VoiceOver stops is pure noise.
                .accessibilityHidden(true)

                ForEach(stats) { season in
                    HStack(spacing: 16) {
                        cell("\(season.season)", width: seasonWidth)
                        cell(season.teamAbbrev ?? "—", width: teamWidth)
                        ForEach(columns, id: \.self) { column in
                            cell(column.value(for: season), width: statWidth)
                        }
                    }
                    .padding(.vertical, 8)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(
                        PlayerStatsAccessibility.rowLabel(for: season, columns: columns)
                    )
                }
            }
            .depthCard(dense: true)
        }
    }

    private func cell(_ value: String, width: CGFloat, header: Bool = false) -> some View {
        Text(value)
            .font(header ? .caption.bold() : .footnote.weight(.semibold))
            .foregroundStyle(header ? .secondary : .primary)
            .frame(width: width, alignment: .leading)
    }
}

// Sized against the same scaled metrics as the table it stands in for, so the section
// doesn't resize when real rows land (AGENTS.md's flash-then-jump rule).
private struct PlayerStatsSkeleton: View {
    let columnCount: Int

    @ScaledMetric(relativeTo: .footnote) private var cellWidth: CGFloat = 44
    @ScaledMetric(relativeTo: .footnote) private var cellHeight: CGFloat = 14

    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: 8) {
                    ForEach(0..<(columnCount + 2), id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.tertiary)
                            .frame(width: cellWidth, height: cellHeight)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 72)
        .depthCard(dense: true)
        .redacted(reason: .placeholder)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading season stats")
    }
}
