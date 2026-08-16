import SwiftUI

// The searchable 32-team list. This used to be the app's root screen; as of the
// 2026-08-15 navigation-parity spec (locked decision #5) it is the *content of the team
// switcher sheet* instead — "the list stops being a place you are and becomes a control
// you use". It therefore owns no NavigationStack, no navigation destination, and no
// last-team restoration: the enclosing TeamSwitcherSheet supplies the stack and chrome,
// and DepthChartsTab owns which team is current. Selection is a callback, not a push.
struct TeamListView: View {
    @State private var viewModel: TeamListViewModel

    /// Highlighted with a checkmark so the sheet shows where you are, matching the web
    /// switcher's current-team affordance.
    private let selectedTeamId: String
    private let onSelect: (String) -> Void

    init(
        repository: CachingDepthRepository,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        selectedTeamId: String,
        onSelect: @escaping (String) -> Void
    ) {
        self.selectedTeamId = selectedTeamId
        self.onSelect = onSelect
        _viewModel = State(initialValue: TeamListViewModel(repository: repository, events: events))
    }

    var body: some View {
        content
            .searchable(text: $viewModel.searchText, prompt: "Search teams")
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            // Hiding the placeholder rows keeps VoiceOver from reading eight blank
            // stand-ins, but a fully hidden screen announces nothing at all — the
            // container carries the state instead.
            List(0..<8, id: \.self) { _ in
                TeamRowSkeleton().accessibilityHidden(true)
            }
            .listStyle(.plain)
            .redacted(reason: .placeholder)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Loading teams")
            .accessibilityIdentifier("team-list-loading")

        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load teams", systemImage: "wifi.slash")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
            }

        case .loaded:
            if viewModel.filteredTeams.isEmpty {
                if viewModel.searchText.isEmpty {
                    ContentUnavailableView("No Teams", systemImage: "sportscourt")
                } else {
                    ContentUnavailableView.search(text: viewModel.searchText)
                }
            } else {
                List(viewModel.filteredTeams) { team in
                    Button {
                        onSelect(team.id)
                    } label: {
                        HStack {
                            TeamRow(team: team)
                            Spacer()
                            if team.id == selectedTeamId {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.tint)
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("team-row-\(team.id)")
                    .listRowBackground(DesignTokens.Colors.surfaceCard2)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(DesignTokens.Colors.bg)
                .refreshable { await viewModel.load() }
            }
        }
    }
}

private struct TeamRow: View {
    let team: Team

    var body: some View {
        HStack(spacing: 12) {
            TeamBadge(team: team)
            VStack(alignment: .leading) {
                Text("\(team.city) \(team.name)")
                    .font(.subheadline)
                Text("\(team.conference) \(team.division)")
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

// Sized against the same scaled badge metric as `TeamRow`, so the list doesn't resize
// under the user when real rows land (AGENTS.md's flash-then-jump rule).
private struct TeamRowSkeleton: View {
    @ScaledMetric(relativeTo: .body) private var badgeSize: CGFloat = TeamBadge.baseSize
    @ScaledMetric(relativeTo: .body) private var titleHeight: CGFloat = 16
    @ScaledMetric(relativeTo: .caption) private var subtitleHeight: CGFloat = 12

    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(.gray).frame(width: badgeSize, height: badgeSize)
            VStack(alignment: .leading, spacing: 8) {
                RoundedRectangle(cornerRadius: 4).fill(.gray).frame(maxWidth: 140, maxHeight: titleHeight)
                RoundedRectangle(cornerRadius: 4).fill(.gray).frame(maxWidth: 90, maxHeight: subtitleHeight)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Colored initials badge — the app never caches team logo images (design spec: "no
/// image blobs"), so `logo`/`logoDark` are opportunistic `AsyncImage` loads with this as
/// the fallback while loading or when the URL is nil/fails.
struct TeamBadge: View {
    /// Shared with `TeamRowSkeleton` so the placeholder and the real row scale together.
    static let baseSize: CGFloat = 36

    let team: Team

    @ScaledMetric(relativeTo: .body) private var size: CGFloat = TeamBadge.baseSize

    var body: some View {
        ZStack {
            Circle().fill(Color(hex: team.colors.uiAccent))
            if let url = team.logo.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit().padding(6)
                    } else {
                        initials
                    }
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private var initials: some View {
        Text(team.abbrev)
            .font(.caption2.bold())
            .foregroundStyle(Color(hex: team.colors.onAccent))
    }
}

extension Color {
    /// Minimal `#RRGGBB` parser — the only hex shape `teams.color_*`/`uiAccent`/`onAccent`
    /// ever store (AGENTS.md's color-token invariants).
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var value: UInt64 = 0
        Scanner(string: s).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self = Color(red: r, green: g, blue: b)
    }
}
