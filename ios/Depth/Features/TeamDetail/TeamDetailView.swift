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
    @State private var showHistory = false
    @State private var confirmedOrders: [Position: [String]] = [:]

    private let preferences: UserPreferences
    private let repository: CachingDepthRepository
    private let sessionStore: AuthSessionStore
    private let authService: any DepthAuthServicing
    private let overrideService: any DepthOverrideServicing
    @State private var historyViewModel: HistoryViewModel

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
        _historyViewModel = State(initialValue: HistoryViewModel(teamId: viewModel.teamId, repository: repository))
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
                if historyViewModel.isHistorical {
                    await historyViewModel.retry()
                } else {
                    await viewModel.load()
                    await loadOverrides()
                }
            }
            .onChange(of: unit) { _, newValue in preferences.lastUnit = newValue }
            .onChange(of: historyViewModel.selectedSeason) { _, _ in selectedPlayer = nil }
            .onChange(of: sessionStore.user) { _, user in
                if user == nil {
                    confirmedOrders = [:]
                } else {
                    Task { await loadOverrides() }
                }
            }
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button("History", systemImage: "clock.arrow.circlepath") { showHistory = true }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("history-destination")

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

                    // Live snapshot only (design spec locked decision #10) — historical
                    // rosters have no equivalent share-card visual contract yet.
                    if !historyViewModel.isHistorical, let snapshot = displayedSnapshot {
                        DepthChartShareButton(snapshot: snapshot)
                    }
                }
            }
            .sheet(item: $selectedPlayer) { player in
                PlayerDetailView(player: player, team: displayedSnapshot?.team, repository: repository)
                    .id(player.id)
            }
            .sheet(isPresented: $showHistory) {
                HistorySeasonSheet(
                    seasons: historyViewModel.seasons,
                    selectedSeason: historyViewModel.selectedSeason
                ) { season in
                    showHistory = false
                    historyViewModel.selectImmediately(season)
                }
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
        if historyViewModel.isHistorical {
            historicalContent
        } else {
            currentContent
        }
    }

    @ViewBuilder
    private var historicalContent: some View {
        switch historyViewModel.state {
        case .loading:
            VStack {
                ProgressView()
                Text("Loading historical roster…").foregroundStyle(.secondary).padding(.top, 8)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityIdentifier("history-loading")
        case .loaded:
            if let snapshot = historyViewModel.snapshot {
                rosterContent(snapshot: snapshot, historical: true)
            } else {
                ContentUnavailableView("No Data", systemImage: "sportscourt")
            }
        case .empty:
            historyUnavailable(
                title: "No roster data", description: "This season doesn't have a historical roster yet."
            )
        case .failed(let error):
            historyUnavailable(
                title: "Couldn't load this season", description: error.recoveryDescription, retry: true
            )
        case .current:
            EmptyView()
        }
    }

    @ViewBuilder
    private var currentContent: some View {
        if let snapshot = displayedSnapshot {
            rosterContent(snapshot: snapshot, historical: false)
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

    private func rosterContent(snapshot: TeamSnapshot, historical: Bool) -> some View {
            ScrollView {
                VStack(spacing: 16) {
                    if historical {
                        HStack {
                            Text(verbatim: "\(historyViewModel.selectedSeason.year) season")
                                .font(.headline)
                                .accessibilityIdentifier("history-season-state")
                            Spacer()
                            Button("Back to today") {
                                historyViewModel.selectImmediately(.current(historyViewModel.currentSeason))
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityIdentifier("history-back-to-today")
                        }
                        .padding(.horizontal)
                    }
                    if !historical, let cachedAt = viewModel.cachedAt {
                        // Explicit "Saved on this device" text is required in both fresh
                        // and stale states (task-8d brief) — the stale banner below is
                        // just the additional >24h "pull to refresh" nudge on top of it.
                        // Historical rosters are on-demand reads with no cache row, so
                        // this only ever renders for the live snapshot.
                        SavedOnDeviceBanner(cachedAt: cachedAt)
                    }
                    if !historical && viewModel.isStale {
                        StaleBanner()
                    }
                    if !historical, case .failed = viewModel.loadState {
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
    }

    private func historyUnavailable(title: String, description: String, retry: Bool = false) -> some View {
        ContentUnavailableView {
            Label(title, systemImage: "clock.arrow.circlepath")
        } description: {
            Text(description)
        } actions: {
            if retry {
                Button("Retry") { Task { await historyViewModel.retry() } }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("history-retry")
            }
            Button("Back to today") {
                historyViewModel.selectImmediately(.current(historyViewModel.currentSeason))
            }
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityIdentifier("history-back-to-today")
        }
    }

    private var editableGroups: [EditableOverrideGroup] {
        guard !historyViewModel.isHistorical else { return [] }
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
        if historyViewModel.isHistorical {
            return historyViewModel.snapshot
        }
        return viewModel.snapshot.map { applyingDepthOverrides(to: $0, orders: confirmedOrders) }
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

private struct SavedOnDeviceBanner: View {
    let cachedAt: Date

    var body: some View {
        SavedOnDeviceLabel(cachedAt: cachedAt)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .padding(.horizontal)
            .accessibilityIdentifier("saved-on-device-label")
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
