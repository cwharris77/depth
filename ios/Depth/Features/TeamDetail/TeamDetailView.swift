import SwiftUI

// Team depth chart — offense/defense/special-teams sections over one cached/refreshed
// `TeamSnapshot` (design spec Milestone 1 item 16). Restores the last-viewed section via
// `UserPreferences.lastUnit` and persists it on change, same pattern as the team-list
// restoration in TeamListView.
struct TeamDetailView: View {
    @State private var viewModel: TeamDetailViewModel
    @State private var unit: Unit
    @State private var selectedPlayer: Player?
    @State private var selectedOverrideGroup: EditableOverrideGroup?
    @State private var pendingOverrideGroup: EditableOverrideGroup?
    @State private var showAuth = false
    @State private var confirmedOrders: [Position: [String]] = [:]

    private let preferences: UserPreferences
    private let repository: CachingDepthRepository
    private let sessionStore: AuthSessionStore
    private let authService: any DepthAuthServicing
    private let overrideService: any DepthOverrideServicing

    init(
        viewModel: TeamDetailViewModel,
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        authService: any DepthAuthServicing,
        overrideService: any DepthOverrideServicing
    ) {
        _viewModel = State(initialValue: viewModel)
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.authService = authService
        self.overrideService = overrideService
        _unit = State(initialValue: preferences.lastUnit ?? .offense)
    }

    var body: some View {
        content
            .navigationTitle(viewModel.snapshot.map { "\($0.team.city) \($0.team.name)" } ?? "Team")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.load()
                await loadOverrides()
            }
            .refreshable {
                await viewModel.load()
                await loadOverrides()
            }
            .onChange(of: unit) { _, newValue in preferences.lastUnit = newValue }
            .onChange(of: sessionStore.user) { _, user in
                if user == nil {
                    confirmedOrders = [:]
                } else {
                    Task { await loadOverrides() }
                }
            }
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    NavigationLink {
                        ScheduleView(teamId: viewModel.teamId, repository: repository)
                    } label: {
                        Label("Schedule", systemImage: "calendar")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Schedule")
                    .accessibilityIdentifier("schedule-destination")

                    if !editableGroups.isEmpty {
                        Menu("Edit Order", systemImage: "arrow.up.arrow.down") {
                            ForEach(editableGroups) { group in
                                Button(group.position.rawValue) { beginEditing(group) }
                            }
                        }
                        .accessibilityIdentifier("edit-depth-order")
                    }
                }
            }
            .sheet(item: $selectedPlayer) { player in
                PlayerDetailView(player: player, team: viewModel.snapshot?.team)
            }
            .sheet(isPresented: $showAuth, onDismiss: finishAuthentication) {
                AuthSheet(service: authService, sessionStore: sessionStore)
            }
            .sheet(item: $selectedOverrideGroup) { group in
                let players = players(for: group.position)
                OverrideEditorSheet(
                    viewModel: OverrideEditorViewModel(
                        teamId: viewModel.teamId,
                        position: group.position.rawValue,
                        playerIds: players.map(\.id),
                        writer: overrideService
                    ),
                    playerNames: Dictionary(
                        uniqueKeysWithValues: players.map {
                            ($0.id, $0.name.isEmpty ? "#\($0.number)" : $0.name)
                        }
                    ),
                    onSaved: { confirmedOrders[group.position] = $0 }
                )
            }
    }

    @ViewBuilder
    private var content: some View {
        if let snapshot = displayedSnapshot {
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

    private var editableGroups: [EditableOverrideGroup] {
        guard let snapshot = displayedSnapshot else { return [] }
        let positions = Set(snapshot.players.filter { $0.position.unit == unit }.map(\.position))
        return
            positions
            .filter { players(for: $0).count > 1 }
            .sorted { $0.rawValue < $1.rawValue }
            .map { EditableOverrideGroup(position: $0) }
    }

    private func players(for position: Position) -> [Player] {
        displayedSnapshot?.players.filter { $0.position == position }.sorted(by: byDepthOrder)
            ?? []
    }

    private var displayedSnapshot: TeamSnapshot? {
        viewModel.snapshot.map { applyingDepthOverrides(to: $0, orders: confirmedOrders) }
    }

    private func loadOverrides() async {
        guard sessionStore.user != nil else {
            confirmedOrders = [:]
            return
        }
        if let orders = try? await overrideService.load(teamId: viewModel.teamId) {
            confirmedOrders = orders
        }
    }

    private func beginEditing(_ group: EditableOverrideGroup) {
        if sessionStore.user == nil {
            pendingOverrideGroup = group
            showAuth = true
        } else {
            selectedOverrideGroup = group
        }
    }

    private func finishAuthentication() {
        if sessionStore.user != nil {
            selectedOverrideGroup = pendingOverrideGroup
        }
        pendingOverrideGroup = nil
    }
}

private struct EditableOverrideGroup: Identifiable {
    let position: Position
    var id: String { position.rawValue }
}

extension Position {
    fileprivate var unit: Unit {
        switch self {
        case .qb, .rb, .fb, .wr, .te, .lt, .lg, .c, .rg, .rt:
            .offense
        case .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb, .cb, .lcb,
            .rcb, .nb, .s, .ss, .fs:
            .defense
        case .k, .p, .ls, .kr, .pr:
            .special
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
