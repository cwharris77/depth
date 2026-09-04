import SwiftUI

// Team depth chart — offense/defense/special-teams sections over one cached/refreshed
// `TeamSnapshot` (design spec Milestone 1 item 16). Restores the last-viewed section via
// `UserPreferences.lastUnit` and persists it on change, same pattern as the last-team
// restoration in DepthChartsTab. The header's ROSTER/SCHEDULE/STATS page switcher
// (round-4, DEP-217) turns the pushed Schedule destination into a third tab and hosts
// the new Stats page (DEP-216); Schedule's pushed-destination chrome is suppressed
// through `isEmbedded`.
struct TeamDetailView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var viewModel: TeamDetailViewModel
    @State private var unit: Unit
    @State private var page: TeamPage = .roster
    @State private var selectedPlayer: Player?
    /// DEP-231: the app-level edit-mode toggle (web's `globalEditMode`). When on, every
    /// position group's player card opens already in reorder mode. Lives in the overflow
    /// menu; disabled (not hidden) while viewing a historical season.
    @State private var editMode = DepthChartEditMode()
    /// DEP-323: the name-presentation style chosen in Settings. Shared with SettingsView
    /// through the same defaults key.
    @AppStorage(FieldNameMode.storageKey) private var fieldNameMode: FieldNameMode = .callouts
    @State private var showHistory = false
    @State private var showUniformPicker = false
    @State private var showFormations = false
    /// DEP-252: Account moved out of the tab bar (a personal affordance, not a content
    /// section) into the nav-bar trailing slot DEP-236 freed.
    @State private var showAccount = false
    @State private var selectedUniformID: String?
    /// The kit currently being live-previewed while the picker is open (DEP-256 follow-
    /// up): swiping the carousel recolors the field via this, not `selectedUniformID`,
    /// so browsing kits never touches the persisted pick. Committed into
    /// `selectedUniformID` (and `UserPreferences`) only when the sheet's `onDismiss`
    /// fires — the bug this avoids is web's UniformSheet, which persists on every drag
    /// settle instead of on close.
    @State private var previewUniformID: String?
    /// Per-unit formation pick (web's `activeFormation`). Keyed by Unit so switching
    /// between offense / defence tabs retains the last-picked formation for each side.
    /// nil for a given unit means "use the unit's top formation as the default".
    @State private var selectedFormations: [Unit: TeamFormation] = [:]
    @State private var confirmedOrders: [Position: [String]] = [:]

    private let preferences: UserPreferences
    private let repository: CachingDepthRepository
    private let sessionStore: AuthSessionStore
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording
    /// A player to open once this team's snapshot resolves — set by DepthChartsTab when
    /// a player is picked from the switcher's cross-team search. Cleared after present.
    @Binding var requestedPlayerID: String?
    /// DEP-329: the uniform the user was viewing when they tapped "Open depth
    /// chart" from the uniform kit sheet — applied once on appear so the
    /// depth chart shows the originating kit, not whatever was last persisted.
    @Binding var requestedUniformId: String?
    /// Opens the team switcher. Required, not optional: `DepthChartsTab` is the only
    /// place this view is constructed now that it is a tab's stack root rather than a
    /// pushed destination, so an unset case would be dead code.
    private let onOpenTeamSwitcher: () -> Void
    /// DEP-405: bubbles a schedule-card tap up through DepthChartsTab to RootTabView,
    /// which owns the tab selection — it routes the matchup to CompareRouteStore and
    /// switches to the Compare tab (DEP-280's push into this tab's stack is gone; the
    /// tab switch is its replacement). Carries this team's id and the tapped game's
    /// opponent id, matching web's `?a=<teamId>&b=<opponentId>` compare-link params.
    private let onOpenCompare: (String, String) -> Void
    @State private var historyViewModel: HistoryViewModel
    /// DEP-278 follow-up: refined with the resolved kit color (`resolvedUiAccentHex`)
    /// whenever it changes, so Stats/Schedule (which read this same store) follow a
    /// picked kit the way the roster field and tab tint already do.
    private let currentTeamStore: CurrentTeamStore

    init(
        viewModel: TeamDetailViewModel,
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        requestedPlayerID: Binding<String?> = .constant(nil),
        requestedUniformId: Binding<String?> = .constant(nil),
        currentTeamStore: CurrentTeamStore,
        onOpenTeamSwitcher: @escaping () -> Void,
        onOpenCompare: @escaping (String, String) -> Void = { _, _ in }
    ) {
        _viewModel = State(initialValue: viewModel)
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.overrideService = overrideService
        self.events = events
        self._requestedPlayerID = requestedPlayerID
        self._requestedUniformId = requestedUniformId
        self.currentTeamStore = currentTeamStore
        self.onOpenTeamSwitcher = onOpenTeamSwitcher
        self.onOpenCompare = onOpenCompare
        _unit = State(initialValue: preferences.lastUnit ?? .offense)
        _selectedUniformID = State(initialValue: preferences.uniformSelection(for: viewModel.teamId))
        _historyViewModel = State(initialValue: HistoryViewModel(teamId: viewModel.teamId, repository: repository))
    }

    private var navigationTitleText: String {
        viewModel.snapshot.map { "\($0.team.city) \($0.team.name)" } ?? "Team"
    }



    /// The selected uniform's palette recolors the field dots (web's kit selection);
    /// nil keeps the team's own colors. Prefers the live-previewed kit (while the picker
    /// is open) over the committed/persisted one, so swiping the carousel recolors the
    /// field immediately without touching the saved pick.
    private var fieldColors: TeamColors? {
        guard let id = previewUniformID ?? selectedUniformID,
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
        selectedFormations[unit] ?? defaultFormation(for: unit)
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
            // DEP-236: the team identity lives in the switcher pill (full "City Name"),
            // so the centered inline title would be a redundant second copy of the same
            // text. The bar keeps the inline layout for its toolbar items.
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            // Compare and Uniforms both set this explicitly (CompareView.swift,
            // UniformsTab.swift) — this screen (DepthChartsTab's root, the app's actual
            // launch screen) never did, so it fell through to the system default
            // (plain black in dark mode) instead of the app's dark-navy bg token.
            .background(DesignTokens.Colors.bg)
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
                // DEP-329: apply the uniform the user was viewing in the kit sheet,
                // so the depth chart shows the originating kit, not whatever was
                // last persisted for this team.
                presentRequestedUniform(requestedUniformId)
            }
            .onChange(of: requestedPlayerID) { _, id in
                // Also covers picking a player on the already-current team, where
                // `.id(teamId)` doesn't change and `.task` won't re-run.
                presentRequestedPlayer(id)
            }
            .onChange(of: requestedUniformId) { _, id in
                presentRequestedUniform(id)
            }
            // DEP-278 follow-up: publish the resolved accent (kit pick, or the team's
            // own once the snapshot loads) so Stats/Schedule — which read this same
            // store — follow a kit switch the same render pass the field does.
            // `initial: true` covers the very first resolution, not just later changes.
            .onChange(of: activeJerseyColors, initial: true) { _, colors in
                if let colors {
                    currentTeamStore.refine(colors: colors)
                }
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
                editMode.exitForContextChange()
            }
            .onChange(of: page) { _, _ in
                editMode.exitForContextChange()
            }
            .onChange(of: historyViewModel.selectedSeason) { _, _ in
                selectedPlayer = nil
                editMode.exitForContextChange()
            }
            .onDisappear {
                editMode.exitForContextChange()
            }
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
            // DEP-236/DEP-252/DEP-277 (Cooper review): the shared app-wide top nav —
            // see `depthTopNavToolbar` for why this isn't hand-rolled per screen anymore.
            // The team pill is this screen's contribution to the "conditional" half.
            .toolbar {
                depthTopNavToolbar(teamPill: {
                    if !dynamicTypeSize.isAccessibilitySize { teamSwitcherPill }
                }) {
                    showAccount = true
                }
            }
            .sheet(item: $selectedPlayer) { player in
                let editable = !historyViewModel.isHistorical
                let position = player.position
                PlayerDetailView(
                    player: player,
                    team: displayedSnapshot?.team,
                    kitColors: activeJerseyColors,
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
                    globalEditMode: editable && editMode.isActive
                )
                    .id(player.id)
                    // `.sheet()` content gets a fresh UITraitCollection rather than
                    // inheriting ContentView's UI_TESTING_DYNAMIC_TYPE override — see
                    // that modifier's doc comment. Re-applied here so
                    // `PlayerDetailView`'s accessibility-size header stacking (T10) is
                    // actually driven by the override in both real use and tests.
                    .modifier(UITestingDynamicTypeOverride())
            }
            .sheet(isPresented: $showAccount) {
                // DEP-252: SettingsView's content is unchanged from its old tab-bar
                // home (AccountTab) — it just stops being always-reachable and becomes
                // a sheet again, opened from the nav-bar icon instead. `onboarding` reads
                // the same shared instance ContentView owns (DEP-251's "Take the Tour"
                // row needs it to replay the coachmark sequence) — TeamDetailView has no
                // reason to receive its own copy threaded down through RootTabView when
                // every other screen-level singleton here (`authService`, `events`) is
                // already read straight from `DepthEnvironment`.
                SettingsView(
                    sessionStore: sessionStore,
                    authService: DepthEnvironment.authService,
                    events: events,
                    onboarding: DepthEnvironment.onboarding,
                    settingsStore: DepthEnvironment.userSettingsStore
                )
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
            .sheet(
                isPresented: $showUniformPicker,
                onDismiss: {
                    // Commit exactly once, however the sheet closed (X button or
                    // swipe-down) — see `previewUniformID`'s doc comment.
                    if let previewUniformID {
                        selectedUniformID = previewUniformID
                        preferences.setUniformSelection(previewUniformID, for: viewModel.teamId)
                    }
                    previewUniformID = nil
                }
            ) {
                UniformPickerSheet(
                    uniforms: displayedSnapshot?.uniforms ?? [],
                    selectedID: selectedUniformID
                ) { uniformID in
                    previewUniformID = uniformID
                }
                // Jersey-only cards are short — DepthSheet's `.medium` sizing keeps the
                // picker compact like FormationsSheetView; still draggable up to `.large`
                // for a11y text-size growth.
            }
            .sheet(isPresented: $showFormations) {
                FormationsSheetView(
                    unit: unit,
                    formations: currentUnitFormations,
                    activeFormation: activeFormation,
                    accent: teamAccentColor,
                    onSelect: selectFormation,
                    onClose: { showFormations = false }
                )
            }
    }

    // DEP-228: a plain VStack sizes each child to its "ideal" height rather than
    // expanding it to fill available space, so the Stats page's own ScrollView (nested
    // two levels down) was getting clipped instead of scrolling. maxHeight: .infinity
    // here propagates the real available height down to it.
    //
    // DEP-236: the ROSTER/SCHEDULE/STATS switcher is content-level sub-navigation, so it
    // now lives here — pinned above the page content, switching between all three pages
    // (web's TeamPageHeader PAGE_TABS stays sticky while content scrolls under it). It no
    // longer shares the nav bar with the team pill, which frees the trailing slot for the
    // account affordance (DEP-252) and room for the pill's full team name (DEP-222).
    private var content: some View {
        VStack(spacing: 0) {
            if dynamicTypeSize.isAccessibilitySize {
                teamSwitcherPill
                    .padding(.horizontal, DesignTokens.Spacing.screenMargin)
            }
            pageSwitcher
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.top, 8)
                .padding(.bottom, 4)
            pageContent
                .frame(maxHeight: .infinity)
                .id(page)
                .transition(.opacity)
        }
        .frame(maxHeight: .infinity)
    }

    private enum TeamPage: String, CaseIterable {
        case roster
        case schedule
        case stats

        var label: String { rawValue.uppercased() }
    }

    /// DEP-236/222: the switcher trigger is a team-fill pill — `colors.primary`
    /// background with a `colors.secondary` ring (web's TeamBadge vocabulary, DEP-237)
    /// and the full "City Name", since the page switcher left the nav bar and there's
    /// room again. Text is readableTextOn(primary) (web: `readableTextOn(team.colors.primary)`).
    private var teamSwitcherPill: some View {
        let colors = viewModel.snapshot?.team.colors
        let fill = (colors?.primary).map(Color.init(hex:)) ?? DesignTokens.Colors.surfaceChip
        let ring = (colors?.secondary).map(Color.init(hex:)) ?? DesignTokens.Colors.accent
        let textColor = (colors?.primary).map { Color(hex: readableTextOn($0)) } ?? DesignTokens.Colors.textPrimary
        return Button(action: onOpenTeamSwitcher) {
            HStack(spacing: 4) {
                Text(navigationTitleText)
                    .font(.headline)
                    .foregroundStyle(textColor)
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                    .minimumScaleFactor(dynamicTypeSize.isAccessibilitySize ? 1 : 0.7)
                Image(systemName: "chevron.down")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(textColor)
            }
            .padding(.leading, 12)
            .padding(.trailing, 8)
            .padding(.vertical, 6)
            .background(Capsule().fill(fill))
            .overlay {
                Capsule().strokeBorder(ring, lineWidth: 1)
            }
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("team-switcher-button")
        .accessibilityLabel("\(navigationTitleText), change team")
        .accessibilityHint("Opens the team switcher")
        // DEP-251: first-run tutorial's first coachmark target.
        .coachmarkAnchor(.teamPill)
    }

    /// Web parity (components/TeamPageHeader.tsx PAGE_TABS): the ROSTER/SCHEDULE/STATS
    /// switcher. DEP-236 moved it out of the nav bar into the page body (`content`) as a
    /// full-width bar — content-level sub-navigation rendered as a distinct layer between
    /// the nav bar and the page, so it can't be mistaken for a second picker beside the
    /// unit tabs (web's `SegmentedControl size="sm"` sits in the header row; native has no
    /// row to spare, so the bar carries `fullWidth`).
    private var pageSwitcher: some View {
        DepthSegmentedControl(
            options: TeamPage.allCases.map {
                DepthSegmentedOption(value: $0, label: $0.label, identifier: "page-switcher-\($0.rawValue)")
            },
            selection: page,
            onChange: { page = $0 },
            activeColor: teamFillColor,
            // Plain black/white against the fill rather than textOnFill's prefer-the-kit's-
            // own-contrast-color rule (Cooper 2026-09-01: "the text can just be black or
            // white, like the currently built app"), and always derived from that same fill.
            activeTextColor: activeJerseyColors
                .map { Color(hex: readableTextOn(TeamSurfaces.fill($0))) }
                ?? DesignTokens.Colors.onAccent,
            fullWidth: true
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("page-switcher")
    }

    /// Web parity (components/ui/ActionChip.tsx as used by FieldHeader.tsx): an
    /// accent-outlined pill, same visual language as `teamSwitcherPill`'s ring treatment
    /// but team-accent rather than team-primary since this is an interactive control, not
    /// a brand surface (AGENTS.md invariant 4).
    private var customOrderChip: some View {
        Button(action: resetAllOverrides) {
            HStack(spacing: 6) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.caption2.weight(.bold))
                Text("Custom order · Reset all")
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(teamAccentColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Capsule().fill(teamAccentColor.opacity(0.12)))
            .overlay {
                Capsule().strokeBorder(teamAccentColor.opacity(0.4), lineWidth: 1)
            }
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("custom-order-reset-all")
    }

    private var editingChip: some View {
        Button {
            editMode.exitForContextChange()
        } label: {
            HStack(spacing: 6) {
                Circle()
                    .fill(teamAccentColor)
                    .frame(width: 6, height: 6)
                Text("Editing")
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(teamAccentColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Capsule().fill(teamAccentColor.opacity(0.12)))
            .overlay {
                Capsule().strokeBorder(teamAccentColor.opacity(0.4), lineWidth: 1)
            }
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("depth-chart-editing-active")
        .accessibilityLabel("Editing depth chart")
        .accessibilityValue(isMotionReduced ? "Motion reduced" : "Player dots moving")
        .accessibilityHint("Exits edit mode without discarding saved changes")
    }

    private var isMotionReduced: Bool {
        reduceMotion || ProcessInfo.processInfo.arguments.contains("UI_TESTING_REDUCE_MOTION")
    }

    private var editStatusRow: some View {
        HStack {
            if !confirmedOrders.isEmpty {
                customOrderChip
            }
            Spacer()
            if editMode.isActive {
                editingChip
            }
        }
    }

    /// Web parity (components/FieldHeaderMenu.tsx): actions beyond the page switcher's
    /// tabs live behind a single ••• overflow menu. DEP-230 correction: this used to
    /// live in the nav-bar toolbar, a different row than the unit tabs it belongs
    /// beside — web puts both in the same `justify-between` row directly above the
    /// field. Schedule is not a menu item — round-4 (DEP-217) made it a page-switcher tab.
    private var overflowMenu: some View {
        Menu {
            // DEP-231: app-level edit-mode toggle, folded into the overflow menu instead of
            // its own row (web's FieldHeaderMenu.tsx single checked "Edit depth chart"
            // item). Puts every position group's card into reorder mode at once — no
            // per-card Reorder taps needed; off exits all of them together. Disabled (not
            // omitted) while viewing a past season, matching web's disabled + disabledReason.
            // Previously this was a per-position submenu opening OverrideEditorSheet —
            // DEP-226 gave the player card inline reorder, so the toggle now drives that
            // instead and the standalone editor is gone.
            Button {
                editMode.toggle()
            } label: {
                // Web parity (FieldHeaderMenu's "Edit depth chart" row): the label stays
                // constant and the leading glyph flips to a Check while active — no
                // redundant "Done Editing" rename. While a past season is selected the row
                // is disabled (not hidden), and a muted second line states *why* — the iOS
                // equivalent of web's `disabledReason` tooltip, which would otherwise be
                // silent on a bare disabled item.
                HStack(spacing: 8) {
                    Image(systemName: editMode.isActive ? "checkmark" : "pencil")
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Edit Depth Chart")
                            .font(.body)
                        if historyViewModel.isHistorical {
                            Text("Historical seasons are read-only")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                }
            }
            .disabled(historyViewModel.isHistorical)
            .accessibilityIdentifier("edit-depth-order")

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

            Button("Seasons", systemImage: "clock.arrow.circlepath") {
                showHistory = true
            }
            .accessibilityIdentifier("history-destination")

            // Live snapshot only (design spec locked decision #10) — historical
            // rosters have no equivalent share-card visual contract yet.
            if !historyViewModel.isHistorical, let snapshot = displayedSnapshot {
                DepthChartShareButton(snapshot: snapshot)
            }
        } label: {
            // Icon-only — a "•••" overflow glyph is self-explanatory; a trailing
            // "More" label is redundant text (Cooper's round-5 feedback).
            Image(systemName: "ellipsis")
                // `.frame(minWidth:minHeight:)` alone pads the *layout* box, not the
                // hit-testable one — a bare icon with no fill only registers taps on
                // its glyph, well under the 44pt minimum (the touch-target bug). This
                // is the same fix PlayerDot already carries for the field dots
                // (DepthChartFieldView's `.frame` + `.contentShape` pair) — apply it
                // here too so every tap inside the 44×44 box, not just the glyph
                // itself, opens the menu.
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("More")
        .accessibilityIdentifier("depth-chart-overflow")
        // DEP-251: first-run tutorial's overflow-menu coachmark target.
        .coachmarkAnchor(.overflowMenu)
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
            TeamStatsView(teamId: viewModel.teamId, repository: repository, currentTeamStore: currentTeamStore)
        case .schedule:
            ScheduleView(
                teamId: viewModel.teamId,
                repository: repository,
                currentTeamStore: currentTeamStore,
                isEmbedded: true,
                onSelectOpponent: { opponent in
                    onOpenCompare(viewModel.teamId, opponent.id)
                }
            )
        }
    }

    /// The active kit's jersey colors, or nil before a team resolves.
    private var activeJerseyColors: JerseyColors? {
        (fieldColors ?? displayedSnapshot?.team.colors)?.jersey
    }

    /// The page switcher's active segment is a team-colored *fill*, so it takes the jersey
    /// body and its label is a plain black/white pick against that same fill (see
    /// pageSwitcher) — always derived from the exact color behind it.
    private var teamFillColor: Color {
        activeJerseyColors.map { Color(hex: TeamSurfaces.fill($0)) } ?? DesignTokens.Colors.accent
    }

    /// The accent for everything drawn on the page ground: the outlined chips (a 12%-alpha
    /// wash is not a fill, so their label is effectively on the page), the unit-tab
    /// underline, and the formations sheet. TeamSurfaces.mark, not ring — a ring may borrow
    /// contrast from the fill it encloses, so it can return a hex that vanishes here.
    private var teamAccentColor: Color {
        activeJerseyColors.map { Color(hex: TeamSurfaces.mark($0)) } ?? DesignTokens.Colors.accent
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

    @ViewBuilder
    private func rosterContent(snapshot: TeamSnapshot, historical: Bool) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            ScrollView {
                rosterStack(snapshot: snapshot, historical: historical)
            }
        } else {
            rosterStack(snapshot: snapshot, historical: historical)
        }
    }

    private func rosterStack(snapshot: TeamSnapshot, historical: Bool) -> some View {
            VStack(spacing: 16) {
                    if historical {
                        // Web parity (DEP-245): rather than the roster's own bare "Back to
                        // today" text button, use the same `SeasonPickerTrigger` Stats and
                        // Schedule render — a glass capsule showing the picked season with a
                        // "Back to current season" escape beside it, reachable without
                        // reopening the Seasons sheet. The trigger opens the roster's own
                        // HistorySeasonSheet (its current/past distinction), while the
                        // escape returns to the live roster the same way the sheet's own
                        // back-to-current does.
                        SeasonPickerTrigger(
                            season: historyViewModel.selectedSeason.year,
                            identifier: "roster-history-season-trigger",
                            isHistorical: true,
                            onBackToCurrent: {
                                historyViewModel.selectImmediately(.current(historyViewModel.currentSeason))
                            }
                        ) {
                            showHistory = true
                        }
                        .padding(.horizontal)
                    }
                    // DEP-326: cache-first reads (CachingDepthRepository.teamSnapshot) already
                    // kick off a background refresh on every visit, so a stale cache while
                    // online resolves itself silently within moments — telling the user
                    // "showing saved data, pull to refresh" in that case just describes an
                    // implementation detail they can't act on. The banner only earns its
                    // place when there's genuinely no network to refresh from.
                    if !historical && viewModel.isStale && DepthEnvironment.networkMonitor.isOffline {
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

                    // Web parity (FieldHeader.tsx's "Custom order · Reset all" chip): tells
                    // the user this team's depth is their own edited order, with one-tap
                    // revert. Hidden for a past season, same as web (neither order is
                    // theirs to reset).
                    if !historical && (!confirmedOrders.isEmpty || editMode.isActive) {
                        editStatusRow
                            .padding(.horizontal)
                    }

                    DepthChartFieldView(
                        snapshot: snapshot,
                        unit: unit,
                        colors: fieldColors,
                        formation: activeFormation,
                        nameMode: fieldNameMode,
                        isEditing: editMode.isActive
                    ) { player in
                        selectedPlayer = player
                    }
                    // The field is the screen's primary content, so it fills the
                    // available height instead of capping at a fixed ~1.4:1 aspect and
                    // leaving a large blank area beneath it (DEP-207). Width still comes
                    // from the horizontal padding; only the vertical axis is sized here.
                    //
                    // `containerRelativeFrame(.vertical)` measured the ScrollView's full
                    // viewport height and ignored the unit tabs / chips / attribution that
                    // sit above the field — so on tall phones (iPhone 17) the field's
                    // bottom rows (special teams, offense backfield) were pushed beneath
                    // the tab bar. `frame(maxHeight: .infinity)` makes the field flex to
                    // the *remaining* height inside the VStack, so it fills the space
                    // between the chrome and the tab bar without ever extending under it.
                    //
                    // No horizontal padding: the field fills the full safe-area width so
                    // it sits as close to the screen edges as possible (the roster chrome
                    // above it keeps its own inset, so only the field goes edge-to-edge).
                    .frame(maxHeight: .infinity)

                    // FTN charting is CC-BY-SA 4.0, so the notice follows the field
                    // content it attributes. Keep it in the scroll stack rather than
                    // pinning it to the viewport, and omit it for historical snapshots
                    // that carry no real formation data.
                    if !historical && snapshot.formations.contains(where: { $0.unit == unit }) {
                        FTNAttributionText()
                            .padding(.top, DesignTokens.Spacing.sm)
                            .padding(.horizontal)
                            .accessibilityIdentifier("field-attribution")
                    }
                }
                .padding(.vertical)
                // Pin the stack to the page's available height (the parent already
                // constrains it to the area above the tab bar) so the field's flexible
                // `frame(maxHeight: .infinity)` resolves to the *remaining* space after
                // the chrome above it. A ScrollView can't do this — it proposes an
                // infinite height on its scroll axis, which collapses a flexible child to
                // zero instead of filling (DEP-207 height fix, iPhone 17).
                .frame(maxHeight: .infinity)
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

    /// DEP-329: select the uniform the user was viewing in the kit sheet,
    /// so the depth chart shows the originating kit instead of whatever was
    /// last persisted for this team. Cleared after applying so it doesn't
    /// re-apply on subsequent renders (e.g. pull-to-refresh).
    private func presentRequestedUniform(_ id: String?) {
        guard let id else { return }
        selectedUniformID = id
        requestedUniformId = nil
    }

    /// The sheet delegates its state change here to keep the main SwiftUI body small
    /// enough for the compiler while preserving the field's formation-settle animation.
    private func selectFormation(_ formation: TeamFormation) {
        withAnimation(reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.formation) {
            selectedFormations[unit] = formation
        }
        showFormations = false
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

    // Web parity (FieldHeader.tsx's "Custom order · Reset all" chip / handleResetTeam):
    // clears every overridden position at once. Reuses resetPosition per-position rather
    // than a bulk server call — DepthOverrideWriting only exposes a per-position clear,
    // and this keeps the local/remote sync path identical to the single-position Reset
    // button in PlayerDetailView.
    private func resetAllOverrides() {
        for position in Array(confirmedOrders.keys) {
            resetPosition(position)
        }
    }
}

// Only ever shown while genuinely offline (see the call site) — "pull to refresh" would be
// bad advice with no connection to refresh from, so the copy tells the user what will
// actually fix it instead.
private struct StaleBanner: View {
    var body: some View {
        Label("You're offline — showing saved data. Reconnect to refresh.", systemImage: "wifi.slash")
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
// active pick carries a check. Selection writes into the per-unit
// `selectedFormations` dictionary in TeamDetailView (persists across tab switches,
// cleared on app launch).
private struct FormationsSheetView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
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

    // DEP-261: a real List, matching UniformPickerSheet/HistorySeasonSheet — the two
    // other picker sheets opened from the same ••• menu — instead of a ScrollView +
    // hand-rolled card-highlight row. Section headers give header/row alignment for
    // free (both siblings rely on the same default List section inset).
    var body: some View {
        DepthSheet(title: "Formations", sizing: .medium, closeAction: onClose) {
            List {
                ForEach(grouped, id: \.header) { group in
                    Section {
                        ForEach(group.rows, id: \.self) { f in
                            row(f)
                        }
                    } header: {
                        Text(group.header.uppercased())
                            .textCase(nil)
                    }
                }

                // This is the final List row, not viewport chrome: the notice appears
                // underneath every formation and scrolls naturally with the sheet.
                FTNAttributionText()
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .accessibilityIdentifier("formations-attribution")
            }
            .scrollIndicators(.hidden)
        }
    }

    private func row(_ f: TeamFormation) -> some View {
        let isActive = f == activeFormation
        return Button {
            onSelect(f)
        } label: {
            let layout = dynamicTypeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.sm))
                : AnyLayout(HStackLayout())
            layout {
                Text(title(f))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isActive ? accent : DesignTokens.Colors.textPrimary)
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                if !dynamicTypeSize.isAccessibilitySize { Spacer() }
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
            // DEP-281: without this, the trailing Spacer between the formation name
            // and the pct/checkmark trailing content doesn't register taps.
            .contentShape(Rectangle())
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("formation-row")
        .accessibilityLabel(title(f))
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }
}

// DEP-309: the team-detail screen owns one temporary edit session. Keeping the state in
// a small value type makes the entry/exit contract testable without widening it into an
// app-level store; saved player orders continue to live in UserPreferences.
struct DepthChartEditMode: Equatable {
    private(set) var isActive = false

    mutating func toggle() {
        isActive.toggle()
    }

    mutating func exitForContextChange() {
        isActive = false
    }
}

struct PlayerDotWiggleMotion: Equatable {
    let angle: Double
    let delay: Double
    let duration: Double
}

// DEP-309: a deterministic stagger keeps the dots from moving as one rigid formation.
// Reduce Motion removes the effect entirely while leaving edit state and controls intact.
enum PlayerDotWigglePolicy {
    static func motion(
        isEditing: Bool,
        reduceMotion: Bool,
        index: Int
    ) -> PlayerDotWiggleMotion? {
        guard isEditing, !reduceMotion else { return nil }
        return PlayerDotWiggleMotion(
            angle: index.isMultiple(of: 2) ? 1.35 : -1.35,
            delay: Double(index % 4) * 0.035,
            duration: 0.23
        )
    }
}
