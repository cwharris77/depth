import SwiftUI

// Complete native player profile. The sheet owns presentation and semantic layout only;
// profile fields arrive in Player and its independent lazy stats state stays in the
// feature-local view model so a failed stats read never removes the player profile.
struct PlayerDetailView: View {
    let player: Player
    let team: Team?

    @State private var viewModel: PlayerProfileViewModel

    @Environment(\.dismiss) private var dismiss

    init(player: Player, team: Team?, repository: DepthRepository) {
        self.player = player
        self.team = team
        _viewModel = State(initialValue: PlayerProfileViewModel(playerID: player.id, repository: repository))
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
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .frame(minWidth: 44, minHeight: 44)
                }
            }
        }
        .task { await viewModel.load() }
        .presentationDetents([.large])
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 16) {
            photo
            VStack(alignment: .leading, spacing: 6) {
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
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .contain)
    }

    private var vitals: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 12)], spacing: 12) {
            vital("Age", PlayerProfileDisplay.age(player.age))
            vital("Experience", PlayerProfileDisplay.experience(player.experience))
            vital("Height", PlayerProfileDisplay.height(player.height))
            vital("Weight", PlayerProfileDisplay.weight(player.weight))
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("player-profile-vitals")
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
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
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption.bold()).foregroundStyle(.secondary)
            Text(value).font(.body.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
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
        .frame(width: 96, height: 96)
        .accessibilityHidden(true)
    }

    private func initials(_ color: Color) -> some View {
        Text("\(player.number)")
            .font(.title.bold())
            .foregroundStyle(color)
    }
}

// The table remains horizontally scrollable at Accessibility XXXL rather than truncating
// numeric columns; its combined row labels preserve a useful VoiceOver reading order.
private struct PlayerStatsTable: View {
    let stats: [PlayerSeasonStats]
    let columns: [PlayerStatColumn]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 14) {
                    cell("SZN", width: 44, header: true)
                    cell("TM", width: 40, header: true)
                    ForEach(columns, id: \.self) { column in
                        cell(column.header, width: 52, header: true)
                    }
                }
                ForEach(stats) { season in
                    HStack(spacing: 14) {
                        cell("\(season.season)", width: 44)
                        cell(season.teamAbbrev ?? "—", width: 40)
                        ForEach(columns, id: \.self) { column in
                            cell(column.value(for: season), width: 52)
                        }
                    }
                    .padding(.vertical, 8)
                    .accessibilityElement(children: .combine)
                }
            }
            .padding(12)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private func cell(_ value: String, width: CGFloat, header: Bool = false) -> some View {
        Text(value)
            .font(header ? .caption.bold() : .footnote.weight(.semibold))
            .foregroundStyle(header ? .secondary : .primary)
            .frame(width: width, alignment: .leading)
    }
}

private struct PlayerStatsSkeleton: View {
    let columnCount: Int

    var body: some View {
        VStack(spacing: 10) {
            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: 8) {
                    ForEach(0..<(columnCount + 2), id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.tertiary)
                            .frame(width: 44, height: 14)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 70)
        .padding(12)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .redacted(reason: .placeholder)
        .accessibilityLabel("Loading season stats")
    }
}
