import SwiftUI

// Team depth chart — offense/defense/special-teams sections over one cached/refreshed
// `TeamSnapshot` (design spec Milestone 1 item 16). Restores the last-viewed section via
// `UserPreferences.lastUnit` and persists it on change, same pattern as the last-team
// restoration in DepthChartsTab. The header's ROSTER/SCHEDULE/STATS page switcher
// (round-4, DEP-217) turns the pushed Schedule destination into a third tab and hosts
// the new Stats page (DEP-216); Schedule's pushed-destination chrome is suppressed
// through `isEmbedded`.
struct TeamDetailView: View {
    @State private var viewModel: TeamDetailViewModel
    @State private var unit: Unit
    @State private var page: TeamPage = .roster
    @State private var selectedPlayer: Player?
    @State private var selectedOverrideGroup: EditableOverrideGroup?
    @State private var pendingOverrideGroup: EditableOverrideGroup?
    @State private var showAuth = false
    @State private var showHistory = false
    @State private var showUniformPicker = false
    @State private var selectedUniformID: String?
    @State private var confirmedOrders: [Position: [String]] = [:]

    private let preferences: UserPreferences
    private let repository: CachingDepthRepository
    private let sessionStore: AuthSessionStore
    private let authService: any DepthAuthServicing
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording
    /// A player to open once this team's snapshot resolves — set by DepthChartsTab when
    /// a player is picked from the switcher's cross-team search. Cleared after present.
    @Binding var requestedPlayerID: String?
    /// Opens the team switcher. Required, not optional: `DepthChartsTab` is the only
    /// place this view is constructed now that it is a tab's stack root rather than a
    /// pushed destination, so an unset case would be dead code.
    private let onOpenTeamSwitcher: () -> Void
    @State private var historyViewModel: HistoryViewModel

    init(
        viewModel: TeamDetailViewModel,
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        authService: any DepthAuthServicing,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        requestedPlayerID: Binding<String?> = .constant(nil),
        onOpenTeamSwitcher: @escaping () -> Void
    ) {
        _viewModel = State(initialValue: viewModel)
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.authService = authService
        self.overrideService = overrideService
        self.events = events
        self._requestedPlayerID = requestedPlayerID
        self.onOpenTeamSwitcher = onOpenTeamSwitcher
        _unit = State(initialValue: preferences.lastUnit ?? .offense)
        _selectedUniformID = State(initialValue: preferences.uniformSelection(for: viewModel.teamId))
        _historyViewModel = State(initialValue: HistoryViewModel(teamId: viewModel.teamId, repository: repository))
    }

    private var navigationTitleText: String {
        viewModel.snapshot.map { "\($0.team.city) \($0.team.name)" } ?? "Team"
    }

    /// Web-mobile parity (components/TeamPageHeader.tsx): the in-nav team identity is
    /// the abbrev pill, not the full "City Name" — long names like "Washington
    /// Commanders" overflow the inline toolbar otherwise (2026-08-15 visual-pass round
    /// 3). The full display name stays on the accessibility label, so VoiceOver and the
    /// team-switcher UI tests still hear/see the full name.
    private var navigationTitleAbbrev: String {
        viewModel.snapshot?.team.abbrev.uppercased() ?? "Team"
    }

    /// Team-accent-tinted border for the switcher pill (web: `${colors.uiAccent}40`, a
    /// ~25%-alpha team accent). Falls back to the app's own accent before a team resolves.
    private var teamSwitcherBorderColor: Color {
        let hex = viewModel.snapshot?.team.colors.uiAccent
        return (hex.map(Color.init(hex:)) ?? DesignTokens.Colors.accent).opacity(0.25)
    }

    /// The selected uniform's palette recolors the field dots (web's kit selection);
    /// nil keeps the team's own colors. Resolved from the persisted per-team uniform id.
    private var fieldColors: TeamColors? {
        guard let id = selectedUniformID,
              let uniform = displayedSnapshot?.uniforms.first(where: { $0.id == id }) else {
            return nil
        }
        return uniform.colors
    }

    var body: some View {
        content
            .navigationTitle(navigationTitleText)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.load()
                await loadOverrides()
                // A cross-team search pick arrives with the snapshot not yet loaded
                // (the view is recreated via `.id(teamId)`); present once it resolves.
                presentRequestedPlayer(requestedPlayerID)
            }
            .onChange(of: requestedPlayerID) { _, id in
                // Also covers picking a player on the already-current team, where
                // `.id(teamId)` doesn't change and `.task` won't re-run.
                presentRequestedPlayer(id)
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
                // Web parity (components/DepthMark.tsx): every page header carries the
                // app's own brand mark alongside team chrome. Icon-only (no "depth"
                // wordmark) — the toolbar's leading slot is far tighter than web's
                // persistent header. Non-interactive here (web's version opens the nav
                // drawer; native's equivalent destinations already live in the tab bar).
                ToolbarItem(placement: .topBarLeading) {
                    DepthBrandMark(size: 20, color: DesignTokens.Colors.accent)
                        .accessibilityHidden(true)
                }

                ToolbarItem(placement: .principal) {
                    Button(action: onOpenTeamSwitcher) {
                        HStack(spacing: 4) {
                            // Explicit textPrimary so the title stays white instead of
                            // inheriting the current team's accent tint (2026-08-15
                            // visual-pass: "roster page text team-tinted"). The abbrev
                            // pill matches web mobile and never overflows the toolbar.
                            Text(navigationTitleAbbrev)
                                .font(.headline)
                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                                .lineLimit(1)
                            Image(systemName: "chevron.down")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                        }
                        // Web parity (components/TeamPageHeader.tsx): the switcher trigger
                        // is a visible pill (surfaceChip fill + team-accent-tinted border),
                        // not plain text, so it reads as tappable rather than as a title.
                        .padding(.leading, 12)
                        .padding(.trailing, 8)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(DesignTokens.Colors.surfaceChip))
                        .overlay {
                            Capsule().strokeBorder(teamSwitcherBorderColor, lineWidth: 1)
                        }
                    }
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("team-switcher-button")
                    .accessibilityLabel("\(navigationTitleText), change team")
                    .accessibilityHint("Opens the team switcher")
                }

                // Web parity (components/FieldHeaderMenu.tsx): actions beyond the page
                // switcher's tabs live behind a single ••• overflow menu instead of a
                // row of bare icons whose meaning isn't obvious (2026-08-15 visual-pass
                // rounds 1-3). Schedule is no longer a toolbar button — round-4 (DEP-217)
                // made it the middle tab of the ROSTER/SCHEDULE/STATS page switcher.
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Menu {
                        // Live snapshot only — historical rosters carry no uniforms
                        // (SupabaseDepthRepository.teamSeason returns uniforms: []).
                        if !(displayedSnapshot?.uniforms.isEmpty ?? true) {
                            Button {
                                showUniformPicker = true
                            } label: {
                                Label("Choose Uniform", systemImage: "tshirt.fill")
                            }
                            .accessibilityIdentifier("choose-uniform")
                        }

                        Button("Seasons", systemImage: "clock.arrow.circlepath") {
                            showHistory = true
                        }
                        .accessibilityIdentifier("history-destination")

                        // Live snapshot only (design spec locked decision #10) —
                        // historical rosters have no equivalent share-card visual
                        // contract yet.
                        if !historyViewModel.isHistorical, let snapshot = displayedSnapshot {
                            DepthChartShareButton(snapshot: snapshot)
                        }

                        if !editableGroups.isEmpty {
                            Menu("Edit Depth Chart", systemImage: "arrow.up.arrow.down") {
                                ForEach(editableGroups) { group in
                                    Button(group.position.rawValue) { beginEditing(group) }
                                        .accessibilityIdentifier("edit-depth-order-\(group.position.rawValue)")
                                }
                            }
                            .accessibilityIdentifier("edit-depth-order")
                        }
                    } label: {
                        Label("More", systemImage: "ellipsis")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("depth-chart-overflow")
                }
            }
            .sheet(item: $selectedPlayer) { player in
                PlayerDetailView(
                    player: player,
                    team: displayedSnapshot?.team,
                    repository: repository,
                    depthChart: players(for: player.position),
                    onSelectPlayer: { selectedPlayer = $0 }
                )
                    .id(player.id)
                    // `.sheet()` content gets a fresh UITraitCollection rather than
                    // inheriting ContentView's UI_TESTING_DYNAMIC_TYPE override — see
                    // that modifier's doc comment. Re-applied here so
                    // `PlayerDetailView`'s accessibility-size header stacking (T10) is
                    // actually driven by the override in both real use and tests.
                    .modifier(UITestingDynamicTypeOverride())
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
            .sheet(isPresented: $showUniformPicker) {
                UniformPickerSheet(
                    uniforms: displayedSnapshot?.uniforms ?? [],
                    selectedID: selectedUniformID
                ) { uniformID in
                    selectedUniformID = uniformID
                    preferences.setUniformSelection(uniformID, for: viewModel.teamId)
                }
            }
            .sheet(isPresented: $showAuth, onDismiss: finishAuthentication) {
                AuthSheet(service: authService, sessionStore: sessionStore, events: events)
            }
            .sheet(item: $selectedOverrideGroup) { group in
                let players = players(for: group.position)
                OverrideEditorSheet(
                    viewModel: OverrideEditorViewModel(
                        teamId: viewModel.teamId,
                        position: group.position.rawValue,
                        playerIds: players.map(\.id),
                        writer: overrideService,
                        events: events
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
        VStack(spacing: 0) {
            pageSwitcherRow
            pageContent
        }
    }

    private enum TeamPage: String, CaseIterable {
        case roster
        case stats
        case schedule

        var label: String { rawValue.uppercased() }
    }

    /// Web parity (components/TeamPageHeader.tsx PAGE_TABS): the ROSTER/SCHEDULE/STATS
    /// switcher replaces the old calendar button, so all three pages share one nav bar
    /// and keep the team identity. Leading-aligned (recorded decision #7 — the brand
    /// mark already lives in the nav bar, so web's right-aligned layout would leave an
    /// unexplained gap on native).
    private var pageSwitcherRow: some View {
        DepthSegmentedControl(
            options: TeamPage.allCases.map {
                DepthSegmentedOption(value: $0, label: $0.label, identifier: "page-switcher-\($0.rawValue)")
            },
            selection: page,
            onChange: { page = $0 },
            activeColor: teamAccentColor
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("page-switcher")
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(DesignTokens.Colors.bg)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
        }
    }

    @ViewBuilder
    private var pageContent: some View {
        switch page {
        case .roster:
            if historyViewModel.isHistorical {
                historicalContent
            } else {
                currentContent
            }
        case .stats:
            TeamStatsView(teamId: viewModel.teamId, repository: repository)
        case .schedule:
            ScheduleView(teamId: viewModel.teamId, repository: repository, isEmbedded: true)
        }
    }

    /// Team- or kit-driven accent for the page switcher and unit tabs (web: `activeColors`
    /// = the active kit's colors, else the team's). Falls back to the app's own accent
    /// before a team resolves.
    private var teamAccentColor: Color {
        let colors = fieldColors ?? displayedSnapshot?.team.colors
        guard let colors else { return DesignTokens.Colors.accent }
        return Color(hex: colors.uiAccent)
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
                    if !historical && viewModel.isStale {
                        StaleBanner()
                    }
                    if !historical, case .failed = viewModel.loadState {
                        // Only reachable if a refresh failed after we already had data —
                        // last-good snapshot stays on screen (design spec's failure-mode
                        // table), this just surfaces that a background refresh didn't land.
                        RefreshFailedBanner()
                    }
                    DepthUnitTabBar(
                        selection: unit,
                        onChange: { unit = $0 },
                        activeColor: teamAccentColor
                    )
                    .padding(.horizontal)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
                    }

                    DepthChartFieldView(snapshot: snapshot, unit: unit, colors: fieldColors) { player in
                        selectedPlayer = player
                    }
                    // The field is the screen's primary content, so it fills the
                    // available height instead of capping at a fixed ~1.4:1 aspect and
                    // leaving a large blank area beneath it (DEP-207). Width still comes
                    // from the horizontal padding; only the vertical axis is sized here.
                    .containerRelativeFrame(.vertical)
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

    private func presentRequestedPlayer(_ id: String?) {
        guard let id,
              let player = displayedSnapshot?.players.first(where: { $0.id == id }) else {
            return
        }
        selectedPlayer = player
        requestedPlayerID = nil
    }

    private func beginEditing(_ group: EditableOverrideGroup) {
        // App Store screenshot capture (task-9d-screenshots-brief.md) needs to reach
        // this sheet without a real authenticated session — "without exposing an email
        // or test secret" rules out fabricating a real sign-in. The editor itself does
        // nothing network-bound until Save is tapped (OverrideEditorViewModel loads its
        // draft from the caller-supplied playerIds, not a fetch), so opening it here
        // just previews the unsaved-drag reorder UI; a screenshot run never taps Save.
        if sessionStore.user == nil && !isAppStoreScreenshotMode {
            pendingOverrideGroup = group
            showAuth = true
        } else {
            selectedOverrideGroup = group
        }
    }

    private var isAppStoreScreenshotMode: Bool {
        ProcessInfo.processInfo.arguments.contains("UI_TESTING_APPSTORE_SCREENSHOTS")
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
