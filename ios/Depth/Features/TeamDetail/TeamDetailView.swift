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
    /// DEP-231: the app-level edit-mode toggle (web's `globalEditMode`). When on, every
    /// position group's player card opens already in reorder mode. Lives in the overflow
    /// menu; disabled (not hidden) while viewing a historical season.
    @State private var editModeEnabled = false
    @State private var showHistory = false
    @State private var showUniformPicker = false
    @State private var showFormations = false
    @State private var selectedUniformID: String?
    /// The user's chosen real formation for the active unit (web's `activeFormation`, an
    /// ephemeral pick — not persisted, not in the URL). nil means "use the unit's top
    /// formation as the default"; reset to nil on unit change so switching units always
    /// starts at that unit's top (web's resetToTopForUnit).
    @State private var selectedFormation: TeamFormation?
    @State private var confirmedOrders: [Position: [String]] = [:]

    private let preferences: UserPreferences
    private let repository: CachingDepthRepository
    private let sessionStore: AuthSessionStore
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
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        requestedPlayerID: Binding<String?> = .constant(nil),
        onOpenTeamSwitcher: @escaping () -> Void
    ) {
        _viewModel = State(initialValue: viewModel)
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
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

    /// The active unit's real formations from the displayed snapshot (empty for special
    /// teams and every historical season).
    private var currentUnitFormations: [TeamFormation] {
        displayedSnapshot?.formations.filter { $0.unit == unit } ?? []
    }

    /// The unit's top (lowest-rank) formation from the displayed snapshot — the default
    /// pick, mirroring web's `topFormationFor`.
    private func defaultFormation(for unit: Unit) -> TeamFormation? {
        topFormation(for: unit, formations: displayedSnapshot?.formations ?? [])
    }

    /// The formation currently rendering on the field: the user's pick when one is set,
    /// otherwise the unit's top formation (web's `activeFormation`). nil for special
    /// teams / no data / historical, which render the generic layout.
    private var activeFormation: TeamFormation? {
        selectedFormation ?? defaultFormation(for: unit)
    }

    /// The overflow menu's "Formations" row shows the current pick inline (web's
    /// `formationsMeta`): offense reads "Shotgun 11", defense "Nickel (4-2-5)". nil when
    /// the unit has no formation to pick (so the row is omitted, like Choose Uniform when
    /// there are no uniforms).
    private var formationsMeta: String? {
        guard let f = activeFormation else { return nil }
        switch unit {
        case .offense: return "\(alignmentLabel(f.alignment)) \(f.personnel)"
        case .defense: return "\(f.alignment) (\(f.personnel))"
        case .special: return nil
        }
    }

    var body: some View {
        content
            .navigationTitle(navigationTitleText)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.load()
                // DEP-219: a cold launch already signed in never fires the
                // sessionStore.user onChange below (it only sees transitions) — run
                // the sign-in merge here too, matching web's effect (which re-runs on
                // mount whenever `user` is already truthy, not just on a later change).
                if sessionStore.user != nil {
                    await mergeOverridesOnSignIn()
                } else {
                    await loadOverrides()
                }
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
            .onChange(of: unit) { _, newValue in
                preferences.lastUnit = newValue
                // A formation pick is unit-specific — reset to the new unit's top rather
                // than carrying a stale offense pick onto defense (web's resetToTopForUnit).
                selectedFormation = nil
            }
            .onChange(of: historyViewModel.selectedSeason) { _, _ in selectedPlayer = nil }
            .onChange(of: sessionStore.user) { _, user in
                if user == nil {
                    // DEP-219: signing out doesn't erase local edits — web's
                    // localStorage cache is unaffected by auth state, so the local
                    // read replaces the old "clear everything" behavior.
                    confirmedOrders = preferences.teamOverride(for: viewModel.teamId)
                } else {
                    Task { await mergeOverridesOnSignIn() }
                }
            }
            .toolbar {
                // Web parity (components/DepthMark.tsx): every page header carries the
                // app's own brand mark alongside team chrome. Icon-only (no "depth"
                // wordmark) — the toolbar's leading slot is far tighter than web's
                // persistent header. Non-interactive here (web's version opens the nav
                // drawer; native's equivalent destinations already live in the tab bar).
                ToolbarItem(placement: .topBarLeading) {
                    DepthBrandMark(size: 20)
                        .accessibilityHidden(true)
                }

                // DEP-229 correction: web (components/TeamPageHeader.tsx) keeps the team
                // pill and the ROSTER/SCHEDULE/STATS switcher in one right-aligned group
                // (`flex flex-1 ... justify-end`), never a separate full-width row. The
                // leading Spacer pushes both right within the principal slot — brand mark
                // (topBarLeading) anchors the left, this group anchors the right, mirroring
                // web's single-row layout instead of native's original two-row split.
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Spacer(minLength: 0)
                        teamSwitcherPill
                        pageSwitcher
                    }
                }

            }
            .sheet(item: $selectedPlayer) { player in
                let editable = !historyViewModel.isHistorical
                let position = player.position
                PlayerDetailView(
                    player: player,
                    team: displayedSnapshot?.team,
                    repository: repository,
                    depthChart: players(for: position),
                    onSelectPlayer: { selectedPlayer = $0 },
                    // DEP-226: reorder/reset are wired only for the live roster — a
                    // historical season is read-only, matching web's readOnly prop
                    // omission. defaultDepthChart is the position's pre-override order,
                    // which Reset restores to. DEP-231: global edit mode gates whether the
                    // card opens already reordering.
                    defaultDepthChart: defaultPlayers(for: position),
                    preferences: preferences,
                    isPositionCustom: editable ? confirmedOrders[position] != nil : false,
                    onReorder: editable ? { _, ids in reorderPosition(position, ids) } : nil,
                    onResetPosition: editable ? { _ in resetPosition(position) } : nil,
                    globalEditMode: editable && editModeEnabled
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
            .sheet(isPresented: $showFormations) {
                FormationsSheetView(
                    unit: unit,
                    formations: currentUnitFormations,
                    activeFormation: activeFormation,
                    accent: teamAccentColor,
                    onSelect: { selectedFormation = $0; showFormations = false },
                    onClose: { showFormations = false }
                )
                .presentationDetents([.medium, .large])
            }
    }

    // DEP-228: a plain VStack sizes each child to its "ideal" height rather than
    // expanding it to fill available space, so the Stats page's own ScrollView (nested
    // two levels down) was getting clipped instead of scrolling. maxHeight: .infinity
    // here propagates the real available height down to it.
    private var content: some View {
        pageContent
            .frame(maxHeight: .infinity)
    }

    private enum TeamPage: String, CaseIterable {
        case roster
        case schedule
        case stats

        var label: String { rawValue.uppercased() }
    }

    /// Web parity (components/TeamPageHeader.tsx TEAM_ABBREV_PILL): the switcher trigger
    /// is a visible pill (surfaceChip fill + team-accent-tinted border), not plain text.
    private var teamSwitcherPill: some View {
        Button(action: onOpenTeamSwitcher) {
            HStack(spacing: 4) {
                // Explicit textPrimary so the title stays white instead of inheriting
                // the current team's accent tint (2026-08-15 visual-pass: "roster page
                // text team-tinted").
                Text(navigationTitleAbbrev)
                    .font(.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                Image(systemName: "chevron.down")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
            }
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

    /// Web parity (components/TeamPageHeader.tsx PAGE_TABS): the ROSTER/SCHEDULE/STATS
    /// switcher, compact/intrinsic-width (web: `SegmentedControl size="sm"`), sitting
    /// inline next to the team pill — not a stretched, full-width standalone row
    /// (DEP-229 correction; the original placement decision here was wrong).
    private var pageSwitcher: some View {
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
    }

    /// Web parity (components/FieldHeaderMenu.tsx): actions beyond the page switcher's
    /// tabs live behind a single ••• overflow menu. DEP-230 correction: this used to
    /// live in the nav-bar toolbar, a different row than the unit tabs it belongs
    /// beside — web puts both in the same `justify-between` row directly above the
    /// field. Schedule is not a menu item — round-4 (DEP-217) made it a page-switcher tab.
    private var overflowMenu: some View {
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

            // Web parity (FieldHeaderMenu's "Formations" row): opens the Formations sheet
            // for the active unit and shows the current pick inline. Omitted (like Choose
            // Uniform when there are no uniforms) whenever the active unit has no real
            // formation data — special teams, a unit the ingest judged insufficient, and
            // every historical season (whose formations array is always empty).
            if let formationsMeta {
                Button {
                    showFormations = true
                } label: {
                    HStack {
                        Label("Formations", systemImage: "square.grid.2x2")
                        Spacer()
                        Text(formationsMeta)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                .accessibilityIdentifier("choose-formation")
            }

            // Live snapshot only (design spec locked decision #10) — historical
            // rosters have no equivalent share-card visual contract yet.
            if !historyViewModel.isHistorical, let snapshot = displayedSnapshot {
                DepthChartShareButton(snapshot: snapshot)
            }

            // DEP-231: app-level edit-mode toggle, folded into the overflow menu instead of
            // its own row (web's FieldHeaderMenu.tsx single checked "Edit depth chart"
            // item). On puts every position group's card into reorder mode at once — no
            // per-card Reorder taps needed; off exits all of them together. Disabled (not
            // omitted) while viewing a past season, matching web's disabled + disabledReason.
            // Previously this was a per-position submenu opening OverrideEditorSheet —
            // DEP-226 gave the player card inline reorder, so the toggle now drives that
            // instead and the standalone editor is gone.
            Button {
                editModeEnabled.toggle()
            } label: {
                // Web parity (FieldHeaderMenu's share item): the label stays constant and
                // the leading glyph flips to a Check while active — no redundant
                // "Done Editing" rename.
                Label(
                    "Edit Depth Chart",
                    systemImage: editModeEnabled ? "checkmark" : "pencil"
                )
            }
            .disabled(historyViewModel.isHistorical)
            .accessibilityIdentifier("edit-depth-order")
        } label: {
            // Icon-only — a "•••" overflow glyph is self-explanatory; a trailing
            // "More" label is redundant text (Cooper's round-5 feedback).
            Image(systemName: "ellipsis")
        }
        .frame(minWidth: 44, minHeight: 44)
        .accessibilityLabel("More")
        .accessibilityIdentifier("depth-chart-overflow")
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
                    // DEP-230: unit tabs (left) + overflow menu (right) in one row,
                    // matching web's FieldHeaderMenu.tsx `justify-between` — previously
                    // the overflow menu lived in the nav-bar toolbar, a different row
                    // entirely, and the tabs stretched full-width with no trailing
                    // element to justify against.
                    HStack {
                        DepthUnitTabBar(
                            selection: unit,
                            onChange: { unit = $0 },
                            activeColor: teamAccentColor
                        )
                        Spacer()
                        overflowMenu
                    }
                    .padding(.horizontal)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
                    }

                    DepthChartFieldView(
                        snapshot: snapshot,
                        unit: unit,
                        colors: fieldColors,
                        formation: activeFormation
                    ) { player in
                        selectedPlayer = player
                    }
                    // The field is the screen's primary content, so it fills the
                    // available height instead of capping at a fixed ~1.4:1 aspect and
                    // leaving a large blank area beneath it (DEP-207). Width still comes
                    // from the horizontal padding; only the vertical axis is sized here.
                    .containerRelativeFrame(.vertical)
                    .padding(.horizontal)

                    // Mirrors web's FTNAttribution footer (components/FTNAttribution.tsx)
                    // — FTN charting is CC-BY-SA 4.0, so attribution is the condition of
                    // surfacing real formation data (docs/nflverse.md). Shown only when the
                    // active unit has formation data on screen; a historical season never
                    // does (its snapshot's formations array is always empty), so none here
                    // (web: `!historicalMode && unitFormationsCount > 0`).
                    if !historical && snapshot.formations.contains(where: { $0.unit == unit }) {
                        FTNAttributionText()
                            .padding(.top, 6)
                            .padding(.horizontal)
                    }
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

    private func players(for position: Position) -> [Player] {
        displayedSnapshot?.players.filter { $0.position == position }.sorted(by: byDepthOrder)
            ?? []
    }

    /// The position's default roster order, before any user override (web's
    /// `getPlayersByPosition` on the un-overridden roster). Reset restores to this.
    private func defaultPlayers(for position: Position) -> [Player] {
        viewModel.snapshot?.players.filter { $0.position == position }.sorted(by: byDepthOrder)
            ?? []
    }

    private var displayedSnapshot: TeamSnapshot? {
        if historyViewModel.isHistorical {
            return historyViewModel.snapshot
        }
        return viewModel.snapshot.map { applyingDepthOverrides(to: $0, orders: confirmedOrders) }
    }

    // DEP-219: local cache first, always — matches web's localStorage-first model
    // (lib/hooks/overrides/use-team-override.ts). No account needed to read or write;
    // the sign-in merge (mergeOverridesOnSignIn) is the only path that talks to the
    // server, exactly like web's mergeOnSignIn is the only place `user` gates anything.
    private func loadOverrides() async {
        confirmedOrders = preferences.teamOverride(for: viewModel.teamId)
    }

    /// DEP-219 sign-in merge — literal port of web's `mergeOnSignIn`
    /// (lib/utils/depth-chart/overrides-sync.ts): pull the server's overrides (server
    /// wins per team, the durable cross-device truth), push up any team edited only on
    /// this device, then reload the current team's order. Best-effort: a failed
    /// network call leaves the local cache in charge; the next sign-in signal retries.
    private func mergeOverridesOnSignIn() async {
        guard let server = try? await overrideService.loadAll() else { return }
        let plan = DepthOverrideMerge.plan(local: preferences.allOverrides(), server: server)
        for teamId in plan.pushes {
            for (position, ids) in preferences.teamOverride(for: teamId) {
                try? await overrideService.save(teamId: teamId, position: position.rawValue, playerIds: ids)
            }
        }
        for (teamId, override) in plan.pulls {
            preferences.setTeamOverride(override, for: teamId)
        }
        confirmedOrders = preferences.teamOverride(for: viewModel.teamId)
    }

    private func presentRequestedPlayer(_ id: String?) {
        guard let id,
              let player = displayedSnapshot?.players.first(where: { $0.id == id }) else {
            return
        }
        selectedPlayer = player
        requestedPlayerID = nil
    }

    // DEP-219: no auth gate — reordering is local-first, matching web (which never
    // requires sign-in to enter edit mode; only cross-device sync needs an account).

    // DEP-226: player-card reorder writes through the same local-first writer as the
    // overflow-menu editor (DEP-219) — local cache always, server mirror fire-and-forget
    // when signed in. confirmedOrders updates immediately so the field behind the sheet
    // re-renders the new order while the card stays open. DEP-231: the standalone
    // OverrideEditorViewModel is gone, so the overrideSaved event it used to fire on
    // save is recorded here instead — one per committed drop.
    private func reorderPosition(_ position: Position, _ orderedIds: [String]) {
        confirmedOrders[position] = orderedIds
        let writer = LocalFirstOverrideWriter(
            preferences: preferences,
            remote: sessionStore.user != nil ? overrideService : nil
        )
        Task {
            try? await writer.save(
                teamId: viewModel.teamId,
                position: position.rawValue,
                playerIds: orderedIds
            )
        }
        events.record(.overrideSaved)
    }

    // DEP-226: reset restores the position's default order and drops the override —
    // locally always, mirrored to the server (row delete) when signed in, matching web's
    // handleResetPosition (which pushes the position-less override through its PUT).
    private func resetPosition(_ position: Position) {
        confirmedOrders[position] = nil
        let writer = LocalFirstOverrideWriter(
            preferences: preferences,
            remote: sessionStore.user != nil ? overrideService : nil
        )
        Task {
            try? await writer.clear(teamId: viewModel.teamId, position: position.rawValue)
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

// Mirrors components/FTNAttribution.tsx — the CC-BY-SA 4.0 license-mandated attribution
// for surfacing FTN formation data (docs/nflverse.md). Shared by the field footer and the
// Formations sheet (web reuses one component across surfaces) so the string lives in one
// place.
private struct FTNAttributionText: View {
    var body: some View {
        Text("Formation data © FTN Data (CC-BY-SA 4.0)")
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .frame(maxWidth: .infinity)
    }
}

// Mirrors components/FormationsSheet.tsx — single-select list of the active unit's real
// formations, opened from the ••• menu's "Formations" row. Rows are grouped by personnel
// code (offense) or front name (defense), groups and rows ordered by share desc; the
// active pick carries a check. Selection writes the ephemeral `selectedFormation` in
// TeamDetailView (never persisted, matches web's locked decision).
private struct FormationsSheetView: View {
    let unit: Unit
    let formations: [TeamFormation]
    let activeFormation: TeamFormation?
    let accent: Color
    let onSelect: (TeamFormation) -> Void
    let onClose: () -> Void

    /// Offense reads "Shotgun 11", defense "Nickel (4-2-5)" — mirrors web's rowTitle.
    private func title(_ f: TeamFormation) -> String {
        unit == .offense
            ? "\(alignmentLabel(f.alignment)) \(f.personnel)"
            : "\(f.alignment) (\(f.personnel))"
    }

    /// Groups by the dimension the alignment label doesn't already carry (offense: the
    /// RB/TE code, defense: the front name); groups and rows ordered by share desc —
    /// mirrors web's groupedRows.
    private var grouped: [(header: String, rows: [TeamFormation])] {
        var order: [String] = []
        var byKey: [String: [TeamFormation]] = [:]
        for f in formations.sorted(by: { $0.pct > $1.pct }) {
            let key = unit == .offense ? "\(f.personnel) personnel" : f.alignment
            if byKey[key] == nil { order.append(key) }
            byKey[key, default: []].append(f)
        }
        return order.map { (header: $0, rows: byKey[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(grouped.enumerated()), id: \.offset) { _, group in
                        Text(group.header.uppercased())
                            .font(.caption.weight(.bold))
                            .foregroundStyle(DesignTokens.Colors.textFaint)
                            .padding(.horizontal, 20)
                            .padding(.top, 12)
                            .padding(.bottom, 4)
                        ForEach(group.rows, id: \.self) { f in
                            row(f)
                        }
                    }
                }
                .padding(.bottom, 8)
            }
            .navigationTitle("Formations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { onClose() }
                }
            }
            // FTN charting is CC-BY-SA 4.0 — attribution is the condition of listing these
            // rows (docs/nflverse.md). Shared with the field footer.
            .safeAreaInset(edge: .bottom) {
                FTNAttributionText()
                    .padding(.top, 6)
                    .padding(.bottom, 8)
                    .padding(.horizontal)
            }
        }
    }

    private func row(_ f: TeamFormation) -> some View {
        let isActive = f == activeFormation
        return Button {
            onSelect(f)
        } label: {
            HStack {
                Text(title(f))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isActive ? accent : DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    // Two lines, not a bare "22%" — without a personnel/utilization
                    // breakdown the number alone doesn't say what it's a share OF.
                    Text(f.pct == 0 ? "<1%" : "\(f.pct)%")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text("of plays")
                        .font(.caption2)
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
                if isActive {
                    Image(systemName: "checkmark")
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(accent)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isActive ? accent.opacity(0.15) : Color.clear)
            )
            .padding(.horizontal, 12)
        }
        .buttonStyle(.plain)
        .frame(minWidth: 44, minHeight: 44)
        .accessibilityIdentifier("formation-row")
        .accessibilityLabel(title(f))
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }
}
