import SwiftUI

// The app's root screen — searchable 32-team list → team detail (design spec Milestone
// 1 item 16: "searchable team list → team depth chart → basic player detail"). Owns the
// NavigationStack path so it can restore the last-viewed team on relaunch (item 16's
// restoration requirement) by pushing it once the list has loaded.
struct TeamListView: View {
    @State private var viewModel: TeamListViewModel
    @State private var path: [String] = []
    @State private var didRestore = false

    private let repository: CachingDepthRepository
    private let preferences: UserPreferences
    private let sessionStore: AuthSessionStore
    private let authService: any DepthAuthServicing
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording

    init(
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        authService: any DepthAuthServicing,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.authService = authService
        self.overrideService = overrideService
        self.events = events
        _viewModel = State(initialValue: TeamListViewModel(repository: repository, events: events))
    }

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Depth")
                .searchable(text: $viewModel.searchText, prompt: "Search teams")
                .navigationDestination(for: String.self) { teamId in
                    TeamDetailView(
                        viewModel: TeamDetailViewModel(teamId: teamId, repository: repository, events: events),
                        repository: repository,
                        preferences: preferences,
                        sessionStore: sessionStore,
                        authService: authService,
                        overrideService: overrideService,
                        events: events
                    )
                }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        AccountSettingsButton(
                            sessionStore: sessionStore,
                            authService: authService,
                            dataSavedAt: viewModel.cachedAt,
                            events: events
                        )
                    }
                }
        }
        .task { await viewModel.load() }
        .onChange(of: viewModel.loadState) { _, newValue in
            guard newValue == .loaded else { return }
            restoreLastTeamIfNeeded()
        }
        .onChange(of: path) { _, newPath in
            preferences.lastTeamId = newPath.last
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            List(0..<8, id: \.self) { _ in TeamRowSkeleton() }
                .listStyle(.plain)
                .redacted(reason: .placeholder)
                .accessibilityHidden(true)

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
                    NavigationLink(value: team.id) {
                        TeamRow(team: team)
                    }
                    .accessibilityIdentifier("team-row-\(team.id)")
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load() }
            }
        }
    }

    private func restoreLastTeamIfNeeded() {
        guard !didRestore else { return }
        didRestore = true
        guard path.isEmpty, let lastTeamId = preferences.lastTeamId,
            viewModel.teams.contains(where: { $0.id == lastTeamId })
        else { return }
        path = [lastTeamId]
    }
}

private struct TeamRow: View {
    let team: Team

    var body: some View {
        HStack(spacing: 12) {
            TeamBadge(team: team)
            VStack(alignment: .leading) {
                Text("\(team.city) \(team.name)")
                    .font(.body)
                Text("\(team.conference) \(team.division)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

private struct TeamRowSkeleton: View {
    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(.gray).frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 6) {
                RoundedRectangle(cornerRadius: 4).fill(.gray).frame(width: 140, height: 14)
                RoundedRectangle(cornerRadius: 4).fill(.gray).frame(width: 90, height: 10)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Colored initials badge — the app never caches team logo images (design spec: "no
/// image blobs"), so `logo`/`logoDark` are opportunistic `AsyncImage` loads with this as
/// the fallback while loading or when the URL is nil/fails.
struct TeamBadge: View {
    let team: Team

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
        .frame(width: 36, height: 36)
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
