import SwiftUI

// Team depth chart — offense/defense/special-teams sections over one cached/refreshed
// `TeamSnapshot` (design spec Milestone 1 item 16). Restores the last-viewed section via
// `UserPreferences.lastUnit` and persists it on change, same pattern as the team-list
// restoration in TeamListView.
struct TeamDetailView: View {
    @State private var viewModel: TeamDetailViewModel
    @State private var unit: Unit
    @State private var selectedPlayer: Player?

    private let preferences: UserPreferences

    init(viewModel: TeamDetailViewModel, preferences: UserPreferences) {
        _viewModel = State(initialValue: viewModel)
        self.preferences = preferences
        _unit = State(initialValue: preferences.lastUnit ?? .offense)
    }

    var body: some View {
        content
            .navigationTitle(viewModel.snapshot.map { "\($0.team.city) \($0.team.name)" } ?? "Team")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
            .onChange(of: unit) { _, newValue in preferences.lastUnit = newValue }
            .sheet(item: $selectedPlayer) { player in
                PlayerDetailView(player: player, team: viewModel.snapshot?.team)
            }
    }

    @ViewBuilder
    private var content: some View {
        if let snapshot = viewModel.snapshot {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isStale {
                        StaleBanner()
                    }
                    if case .failed = viewModel.loadState {
                        // Only reachable if a refresh failed after we already had data —
                        // last-good snapshot stays on screen (design spec's failure-mode
                        // table), this just surfaces that a background refresh didn't land.
                        RefreshFailedBanner()
                    }
                    Picker("Unit", selection: $unit) {
                        Text("Offense").tag(Unit.offense)
                        Text("Defense").tag(Unit.defense)
                        Text("Special Teams").tag(Unit.special)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    DepthChartFieldView(snapshot: snapshot, unit: unit) { player in
                        selectedPlayer = player
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
        } else {
            switch viewModel.loadState {
            case .loading:
                VStack {
                    ProgressView()
                    Text("Loading depth chart…").foregroundStyle(.secondary).padding(.top, 8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .failed(let error):
                ContentUnavailableView {
                    Label("Couldn't load this team", systemImage: "wifi.slash")
                } description: {
                    Text(error.recoveryDescription)
                } actions: {
                    Button("Retry") { Task { await viewModel.load() } }
                }
            case .loaded:
                // loaded with no snapshot shouldn't happen (a successful load always
                // sets one), but fail safe rather than showing a blank screen.
                ContentUnavailableView("No Data", systemImage: "sportscourt")
            }
        }
    }
}

private struct StaleBanner: View {
    var body: some View {
        Label("Showing saved data — pull to refresh", systemImage: "clock.arrow.circlepath")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .padding(.horizontal)
            .accessibilityIdentifier("stale-banner")
    }
}

private struct RefreshFailedBanner: View {
    var body: some View {
        Label("Couldn't refresh — showing saved data", systemImage: "exclamationmark.triangle")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .padding(.horizontal)
    }
}
