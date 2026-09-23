import SwiftUI

// Native two-team compare. Two team-slot pickers feed two sections
// behind a By-team/By-position segmented control: the By-team tab's unit-metrics lenses,
// and the per-position depth table (rank-aligned side-by-side columns). All content
// derives from the CompareViewModel's resolved TeamStatsPage/TeamSnapshot reads through
// DepthRepository — no new data seam. The repository is a `CachingDepthRepository`
// (concrete, like every tab) so the team-picker sheet can reuse TeamListView.
//
// Every bounded surface composes the shared `depthCard()` treatment, with spacing on the
// 8pt `DesignTokens.Spacing` scale. Compare passes `radius: .md` to `depthCard` so its
// metric and picker cards use the same bounded-surface geometry.
//
// The matchup section uses season-stable offense, defense, and special-teams lenses. The
// position section uses a room-to-role picker and a rank-aligned depth table; each team slot
// also has an explicit clear affordance.
struct CompareView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var viewModel: CompareViewModel
    /// The matchup this tab was routed to by a schedule-card tap, or nil for a plain tab-bar
    /// visit. Non-nil re-seeds the view model's preselection and gates the "Back to schedule"
    /// pill because the tab switch has no pushed-view back chevron. Consumed from
    /// `compareRouteStore`; cleared when the pill is tapped, which resets the tab to its
    /// empty root state.
    @State private var scheduleMatchup: CompareRouteStore.CompareRouteRequest?
    private let repository: CachingDepthRepository
    private let compareRouteStore: CompareRouteStore

    init(repository: CachingDepthRepository, compareRouteStore: CompareRouteStore) {
        self.repository = repository
        self.compareRouteStore = compareRouteStore
        _viewModel = State(initialValue: CompareViewModel(repository: repository))
        _scheduleMatchup = State(initialValue: nil)
    }

    var body: some View {
        // RootTabView instantiates Compare directly without an ambient NavigationStack, so
        // the view owns the navigation title and shared top-nav toolbar configuration.
        NavigationStack {
            content
                .navigationTitle("Compare")
                .navigationBarTitleDisplayMode(.inline)
                .background(DesignTokens.Colors.bg)
                .task { await viewModel.load() }
                .refreshable { await viewModel.load() }
                .toolbar {
                    depthTopNavToolbar(teamPill: { EmptyView() }) {
                        showAccount = true
                    }
                }
                .sheet(isPresented: pickerPresented) {
                    TeamListPickerSheet(
                        repository: repository,
                        title: "Pick a team",
                        selectedTeamId: currentTeamId ?? "",
                        onSelectTeam: { teamId in
                            if let slot = viewModel.pickingSlot {
                                Task { await viewModel.pickTeam(teamId, into: slot) }
                            }
                            viewModel.endPicking()
                        },
                        dismissOnSelect: false
                    )
                }
                .sheet(isPresented: $showSeasonPicker) {
                    // Same shared control Stats and Schedule use, so Compare's season
                    // vocabulary matches theirs (SeasonPickerTrigger above, this sheet here).
                    if let selected = viewModel.resolvedSeason {
                        SeasonPickerSheet(
                            items: viewModel.seasonOptions,
                            selectedSeason: selected,
                            accent: DesignTokens.Colors.accent,
                            identifierPrefix: "compare",
                            onSelect: { season in
                                viewModel.selectSeason(season)
                                showSeasonPicker = false
                            }
                        )
                    }
                }
                .sheet(isPresented: $showAccount) {
                    // CompareView does not already thread sessionStore/events through its
                    // initializer, so source the account sheet's dependencies here.
                    SettingsView(
                        sessionStore: DepthEnvironment.authSessionStore,
                        authService: DepthEnvironment.authService,
                        events: DepthEnvironment.appEvents,
                        onboarding: DepthEnvironment.onboarding,
                        settingsStore: DepthEnvironment.userSettingsStore
                    )
                }
        }
        // A schedule-card tap writes the matchup to the store and switches the active tab in
        // the same callback, so the request is pending by the time
        // this tab appears. `.onAppear` catches a first-ever visit (the store changed
        // before this view existed, so `.onChange` never saw it); `.onChange` catches an
        // already-visited instance the store update reaches while it's installed. Both
        // run `applyPendingCompareRequest`, whose `consume()` makes the second a no-op.
        .onAppear { applyPendingCompareRequest() }
        .onChange(of: compareRouteStore.pendingRequest) { _, _ in
            applyPendingCompareRequest()
        }
        // Rebuild the view model whenever the schedule-origin matchup changes — the
        // `.id(teamId)` key-reset idiom applied to Compare's preselection, so a new
        // schedule tap re-seeds both slots and the pill's tap returns the tab to its
        // empty root state rather than carrying a stale matchup forward.
        .onChange(of: scheduleMatchup) { _, matchup in
            viewModel = CompareViewModel(
                repository: repository,
                preselectedTeamIds: matchup.map { (a: $0.teamAId, b: $0.teamBId) }
            )
            Task { await viewModel.load() }
        }
    }

    /// Consumes a pending schedule-origin matchup from the store, if any, and applies it
    /// as this tab's `scheduleMatchup` (which re-seeds the view model and shows the
    /// "Back to schedule" pill). Idempotent: the store's `consume()` returns nil for any
    /// later call, so a tab re-appearance never re-applies a consumed request.
    private func applyPendingCompareRequest() {
        guard let request = compareRouteStore.consume() else { return }
        scheduleMatchup = request
    }

    @State private var showAccount = false
    @State private var showSeasonPicker = false

    /// The sheet presents when a slot is mid-pick (`pickingSlot != nil`).
    private var pickerPresented: Binding<Bool> {
        Binding(
            get: { viewModel.pickingSlot != nil },
            set: { if !$0 { viewModel.endPicking() } }
        )
    }

    private var currentTeamId: String? {
        switch viewModel.pickingSlot {
        case .a: viewModel.teamA?.id
        case .b: viewModel.teamB?.id
        case nil: nil
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            ProgressView("Loading teams…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityIdentifier("compare-loading")

        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load teams", systemImage: "wifi.slash")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("compare-retry")
            }
            .accessibilityIdentifier("compare-error")

        case .loaded:
            compareContent
        }
    }

    private var compareContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 6) {
                if scheduleMatchup != nil {
                    backToScheduleButton
                }

                seasonRow

                teamSlotRow

                tabSwitcher

                tabContent
                    .id(viewModel.tab)
                    .transition(.opacity)
                    .animation(
                        reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.selection,
                        value: viewModel.tab
                    )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.md)
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("compare-content")
    }

    /// The "Back to schedule" control is shown when the schedule-origin compare lives on
    /// the Compare tab rather than as a push. The tab switch has no system back chevron, so
    /// this pill is the schedule-origin escape. It mirrors the schedule link
    /// (`/team/<id>/schedule`) and the original pill's `surfaceChip` vocabulary; instead
    /// of popping, it clears the schedule-origin session and switches back to the Depth
    /// Charts tab, whose TeamDetailView still has the Schedule page selected.
    private var backToScheduleButton: some View {
        Button {
            scheduleMatchup = nil
            DepthEnvironment.onboarding.activeTab = .depthCharts
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "arrow.left")
                    .font(.caption2.weight(.bold))
                Text("Back to schedule")
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .padding(.horizontal, DesignTokens.Spacing.sm + 4)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(DesignTokens.Colors.surfaceChip, in: Capsule())
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("compare-back-to-schedule")
    }

    /// The season picker. Hidden until at least one team resolves, because the season list
    /// is read off the picked teams' own `teamStats` payloads — there is no team-independent
    /// season source here, and a chip that opens an empty sheet is worse than no chip.
    ///
    /// The season chip identifies the selected season. The thin-sample caution strip remains
    /// separate because it explains how to interpret the numbers below it.
    @ViewBuilder
    private var seasonRow: some View {
        if !viewModel.seasonOptions.isEmpty {
            SeasonPickerTrigger(
                season: viewModel.resolvedSeason,
                identifier: "compare-season-trigger",
                isHistorical: viewModel.resolvedSeason != nil
                    && viewModel.resolvedSeason != viewModel.currentSeason,
                onBackToCurrent: {
                    if let currentSeason = viewModel.currentSeason {
                        viewModel.selectSeason(currentSeason)
                    }
                }
            ) {
                showSeasonPicker = true
            }
        }
    }

    private var teamSlotRow: some View {
        // Each filled slot owns its clear action, so the row needs no separate clear control
        // or additional label.
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: DesignTokens.Spacing.sm))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.sm))
        return layout {
            teamSlotButton(viewModel.teamA, slot: .a)
            // The VS separator uses the web CompareView's surface-chip capsule: rounded
            // background with faint caption text.
            Text("VS")
                .font(.caption.weight(.black))
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xs)
                .background(DesignTokens.Colors.surfaceChip, in: Capsule())
                .accessibilityHidden(true)
            teamSlotButton(viewModel.teamB, slot: .b)
        }
    }

    @ViewBuilder
    private func teamSlotButton(_ team: Team?, slot: CompareViewModel.Slot) -> some View {
        Button {
            viewModel.beginPicking(slot)
        } label: {
            // Center the slot's contents rather than left-aligning them. The abbrev, name,
            // and record have different widths, while the clear button occupies a corner.
            VStack(spacing: DesignTokens.Spacing.xs) {
                if let team {
                    Text(team.abbrev.uppercased())
                        .font(.caption.weight(.black))
                        .tracking(1)
                        .foregroundStyle(Color(hex: TeamSurfaces.mark(team.colors.jersey)))
                }
                Text(slotLabel(team))
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(
                        team != nil
                            ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textFaint
                    )
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                if team != nil {
                    slotRecord(slot)
                }
            }
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, team != nil ? DesignTokens.Spacing.sm : DesignTokens.Spacing.lg)
            .background(
                team.map { Color(hex: TeamSurfaces.mark($0.colors.jersey)).opacity(0.10) }

                    // The unpicked slot is a dashed `borderInput` border on transparent, so
                    // it reads as a "fill this in" hole
                    // rather than a solid-but-wrong slot. The `.overlay` below draws it.
                    ?? Color.clear,
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .overlay {
                if let team {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .strokeBorder(
                            Color(hex: TeamSurfaces.mark(team.colors.jersey)).opacity(0.33),
                            lineWidth: 1)
                } else {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .strokeBorder(
                            DesignTokens.Colors.borderInput,
                            style: StrokeStyle(lineWidth: 1, dash: [5])
                        )
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .accessibilityIdentifier("compare-slot-\(slot == .a ? "a" : "b")")
        .overlay(alignment: .topTrailing) {
            if team != nil {
                Button {
                    viewModel.clearTeam(slot)
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                        .frame(width: 22, height: 22)
                        .background(DesignTokens.Colors.navy, in: Circle())
                        .overlay {
                            Circle().strokeBorder(DesignTokens.Colors.borderInput, lineWidth: 1)
                        }
                }
                .offset(x: 6, y: -6)
                .accessibilityLabel("Clear \(slotLabel(team))")
                .accessibilityIdentifier("compare-slot-\(slot == .a ? "a" : "b")-clear")
            }
        }
    }

    /// The picked team's W-L at the resolved season, under its name. While the side is still
    /// resolving, a same-height placeholder prevents a transient "0-0"; a resolved season
    /// with no row shows nothing rather than borrowing another year's record.
    @ViewBuilder
    private func slotRecord(_ slot: CompareViewModel.Slot) -> some View {
        if viewModel.evidenceLoadState == .loading {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(width: 40, height: 11)
        } else if let stats = slot == .a ? viewModel.effectiveStatsA : viewModel.effectiveStatsB {
            Text(
                verbatim: CompareRecordCatalog.recordText(
                    wins: stats.overallWins,
                    losses: stats.overallLosses,
                    ties: stats.overallTies
                )
            )
            .font(.caption.weight(.semibold))
            .monospacedDigit()
            .foregroundStyle(DesignTokens.Colors.textMuted)
        }
    }

    /// Final-indicator for the slot label. Web shows "City Name" at ≥480px and the
    /// short name below (web CompareView's `min-[480px]` swap). Native has no CSS
    /// breakpoint, but at phone widths the two columns are always narrow, so the city is
    /// dropped on compact layouts to match web's <480px rendering and avoid the
    /// illegible strike-through that `.minimumScaleFactor` can produce.
    private func slotLabel(_ team: Team?) -> String {
        guard let team else { return "Pick a team" }
        return "\(team.city) \(team.name)"
    }

    private var tabSwitcher: some View {
        DepthSegmentedControl(
            options: [
                // Use the same concise tab labels as the web surface.
                DepthSegmentedOption(
                    value: CompareViewModel.Tab.matchup, label: "By team",
                    identifier: "compare-tab-matchup"),
                DepthSegmentedOption(
                    value: CompareViewModel.Tab.position, label: "By position",
                    identifier: "compare-tab-position"),
            ],
            selection: viewModel.tab,
            onChange: { viewModel.selectTab($0) },
            // The Matchup/By-position switcher is a standalone full-width bar, matching
            // the web surface's `fullWidth` control.
            fullWidth: true
        )
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var tabContent: some View {
        switch viewModel.tab {
        case .matchup:
            TeamMatchupSection(viewModel: viewModel)
        case .position:
            PositionDepthSection(viewModel: viewModel, repository: repository)
        }
    }
}

// MARK: - Matchup tab

/// The matchup section's metric lenses and the position drilldown path.
private struct TeamMatchupSection: View {
    let viewModel: CompareViewModel

    var body: some View {
        if !viewModel.bothPicked {
            ComparePrompt(
                pickedCount: viewModel.pickedCount,
                copy: "Offense, defense, and special teams metrics line up side by side.")
        } else if viewModel.sameTeam {
            SameTeamBlock()
        } else if viewModel.teamA != nil, viewModel.teamB != nil {
            CompareLensesView(viewModel: viewModel)
        } else {
            // Unreachable given bothPicked, but degrade rather than crash.
            ComparePrompt(
                pickedCount: viewModel.pickedCount,
                copy: "Offense, defense, and special teams metrics line up side by side.")
        }
    }
}

// MARK: - Position tab

/// Web's `PositionDepth` (components/CompareView.tsx): the two-step room→role position
/// picker (replacing the horizontal chip row) plus the rank-aligned depth table
/// (or the prompt/same-team/empty states).
private struct PositionDepthSection: View {
    let viewModel: CompareViewModel
    let repository: DepthRepository

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            RoomPositionPicker(viewModel: viewModel)

            if !viewModel.bothPicked {
                ComparePrompt(
                    pickedCount: viewModel.pickedCount,
                    copy:
                        "Their depth at the selected position lines up side by side, rank for rank."
                )
            } else if viewModel.sameTeam {
                SameTeamBlock()
            } else if viewModel.positionGroupA.isEmpty && viewModel.positionGroupB.isEmpty {
                EmptyPositionState(position: viewModel.position)
            } else if let teamA = viewModel.teamA, let teamB = viewModel.teamB {
                CompareRows(
                    a: (team: teamA, players: viewModel.positionGroupA),
                    b: (team: teamB, players: viewModel.positionGroupB),
                    repository: repository
                )
            } else {
                // Unreachable given bothPicked, but degrade rather than crash if a team slot
                // somehow becomes nil after bothPicked.
                ComparePrompt(
                    pickedCount: viewModel.pickedCount,
                    copy:
                        "Their depth at the selected position lines up side by side, rank for rank."
                )
            }
        }
    }
}

/// The two-step position picker that replaces the old horizontal chip scroller: a
/// balanced unit→room grid followed by an exact-role panel. All 29 `COMPARE_POSITIONS`
/// values stay reachable with no horizontal scrolling; every interactive tile keeps a 44pt
/// minimum tap target, selected state is never color-only, and VoiceOver labels come from
/// `Position.fullName`.
private struct RoomPositionPicker: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let viewModel: CompareViewModel

    /// The combined height of the room grid + exact-role panel, reserved regardless of which
    /// unit/room is active, so the depth table below never jumps. Sized to the tallest real
    /// combination: a 2-row room grid (Offense and
    /// Defense both have 4 rooms) plus a single row of role pills — the widest room is five
    /// roles, which now fits one row since the pills hug their labels. Special Teams' 1-row
    /// grid and Quarterback's no-panel selection leave blank space below at this same height.
    ///
    /// A fixed minimum leaves stable space for the picker while allowing the table below to
    /// remain stationary as the selected room changes.
    private static let reservedPickerHeight: CGFloat = 176

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Unit lens drives the room grid. Styled as a segmented unit switcher reusing the
            // depth-chart field's unit tab treatment.
            unitLensRow

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                // The balanced room grid is always present with the selection panel below it.
                // Picking a multi-role room expands its exact-role panel; picking it again
                // collapses it.
                roomGrid

                if let room = viewModel.expandedRoom {
                    exactRolePanel(room)
                }
            }
            .frame(minHeight: Self.reservedPickerHeight, alignment: .top)
        }
        // NB: no `.accessibilityIdentifier` on this container — DepthUnitTabBar's buttons
        // carry their own `unit-tab-*` ids, and a container-level identifier on the VStack
        // overrode those, leaving every lens unreachable by id.
        .animation(
            reduceMotion ? nil : DesignTokens.Motion.selection, value: viewModel.expandedRoomID)
    }

    // MARK: Unit lens

    /// A segmented unit lens (Offense / Defense / Special Teams) above the room grid. Uses
    /// the depth-chart field's `DepthUnitTabBar` treatment — underline active indicator plus
    /// a 44pt min-height — so the app's unit vocabulary reads the same way.
    private var unitLensRow: some View {
        DepthUnitTabBar(
            selection: viewModel.selectedUnit,
            onChange: { unit in viewModel.selectUnit(unit) }
        )
    }

    // MARK: Room grid

    /// The balanced aligned room grid for the selected unit. Two columns on the phone width
    /// Two columns keep every room tile at least about 44pt tall without horizontal
    /// scrolling. Each tile shows the room name and a trailing position count; the exact
    /// role panel supplies the detailed position names after selection.
    private var roomGrid: some View {
        LazyVGrid(
            columns: dynamicTypeSize.isAccessibilitySize
                ? [GridItem(.flexible())]
                : [GridItem(.flexible(), spacing: DesignTokens.Spacing.sm), GridItem(.flexible())],
            spacing: DesignTokens.Spacing.sm
        ) {
            ForEach(CompareMatchRooms.rooms(in: viewModel.selectedUnit), id: \.id) { room in
                roomTile(room)
            }
        }
    }

    private func roomTile(_ room: CompareRoom) -> some View {
        let isActive = room == viewModel.activeRoom
        return Button {
            withAnimation(
                reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.selection
            ) {
                viewModel.selectRoom(room)
            }
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(room.name)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(
                        isActive ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textPrimary)
                Spacer(minLength: 0)
                Text("\(room.positions.count)")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(
                        isActive
                            ? DesignTokens.Colors.onAccent.opacity(0.7)
                            : DesignTokens.Colors.textFaint)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            .background(
                isActive ? DesignTokens.Colors.accent : DesignTokens.Colors.surfaceCard2,
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .strokeBorder(
                        isActive
                            ? DesignTokens.Colors.onAccent.opacity(0.40)
                            : DesignTokens.Colors.borderDefault,
                        lineWidth: isActive ? 2 : 1
                    )
            }
            .contentShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(room.name)
        .accessibilityAddTraits(isActive ? [.isSelected] : [.isButton])
        .accessibilityIdentifier("compare-room-\(room.id)")
    }

    // MARK: Exact-role panel

    /// The exact-role selection panel, shown only while its room is expanded — never for a
    /// single-position room. A room with 3 or fewer roles (Backfield's RB/FB, etc.) centers
    /// its tiles in a fixed-width row instead of sitting left-stuck in a 3-column grid with
    /// an empty trailing cell; a room with more roles keeps the grid.
    ///
    /// No `.accessibilityIdentifier` belongs on this container. Its content switches between
    /// `HStack` and `LazyVGrid`, and a container identifier can bleed onto child `roleTile`
    /// buttons when that branch changes. Each `roleTile` already carries its own identifier
    /// and `.accessibilityElement(children: .combine)`; the container needs none.
    private func exactRolePanel(_ room: CompareRoom) -> some View {
        // Keep role tiles as a plain row of compact chips without an outer container. The
        // widest room fits on one row at this size; the flow layout remains for accessibility
        // sizes where tiles may need to wrap.
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(DepthFlowLayout(spacing: DesignTokens.Spacing.xs + 2))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.xs + 2))
        return layout {
            ForEach(room.positions, id: \.self) { pos in
                roleTile(pos)
            }
            if !dynamicTypeSize.isAccessibilitySize { Spacer(minLength: 0) }
        }
        .animation(reduceMotion ? nil : DesignTokens.Motion.selection, value: viewModel.position)
    }

    private func roleTile(_ pos: Position) -> some View {
        let isSelected = pos == viewModel.position
        return Button {
            viewModel.selectPosition(pos)
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Text(pos.rawValue)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(
                        isSelected ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textPrimary)
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.caption2.weight(.black))
                        .foregroundStyle(DesignTokens.Colors.onAccent)
                        .accessibilityHidden(true)
                }
            }
            // The painted chip hugs its label, while the button around it still reserves the
            // 44pt HIG tap target. Splitting the two is what
            // lets the pill read small without shrinking what you actually have to hit.
            .padding(.horizontal, DesignTokens.Spacing.sm + 4)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                isSelected ? DesignTokens.Colors.accent : DesignTokens.Colors.surfaceChip,
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            )
            .overlay {
                if isSelected {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .strokeBorder(DesignTokens.Colors.onAccent.opacity(0.40), lineWidth: 1)
                }
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(pos.fullName)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [.isButton])
        .accessibilityIdentifier("compare-position-\(pos.rawValue)")
    }
}

// MARK: - Shared states

/// Web's `ComparePrompt` (components/CompareView.tsx) — the no/partially-picked
/// placeholder, shown inside whichever tab is active with that tab's copy line.
private struct ComparePrompt: View {
    let pickedCount: Int
    let copy: String

    var body: some View {
        // Web's ComparePrompt is a dashed `borderSubtle` box on `surfaceCard2`
        // (components/CompareView.tsx lines 250-264).
        CompareEmptyState(dashed: true) {
            Image(systemName: "rectangle.split.2x1")
                .font(.title2)
                .foregroundStyle(DesignTokens.Colors.textFaintest)
            Text(pickedCount == 0 ? "Pick two teams to compare" : "Pick one more team")
                .font(.footnote.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text(copy)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 280)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("compare-prompt")
    }
}

/// Web's `SameTeamBlock` — comparing a team against itself.
private struct SameTeamBlock: View {
    var body: some View {
        // Web's SameTeamBlock is a dashed `borderSubtle` box (components/CompareView.tsx
        // lines 266-280).
        CompareEmptyState(dashed: true) {
            Image(systemName: "arrow.left.and.right")
                .font(.title2)
                .foregroundStyle(DesignTokens.Colors.textFaintest)
            Text("Pick two different teams")
                .font(.footnote.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text("Comparing a team against itself won’t show anything new.")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 280)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("compare-same-team")
    }
}

/// Web's `EmptyPositionState` — neither team has a player at the selected position.
private struct EmptyPositionState: View {
    let position: Position

    var body: some View {
        // The web EmptyPositionState is a `surfaceCard2` box with a solid
        // `borderDefault` border (web CompareView lines 460-472) — distinct from the
        // dashed `ComparePrompt`/`SameTeamBlock`, which web draws with a dashed
        // `borderSubtle` border. Separated by the shared container's `dashed` flag.
        CompareEmptyState {
            Text("Neither team lists a \(position.rawValue)")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textMuted)
        }
        .accessibilityIdentifier("compare-empty-position")
    }
}

/// The one empty/placeholder treatment shared by Compare's three states. ComparePrompt and
/// SameTeamBlock use
/// a dashed `borderSubtle` radius-16 with no fill, EmptyPositionState a solid
/// `borderDefault` radius-16 text-only). Web renders all three as a `surfaceCard2`
/// `rounded-2xl` box with a dashed `borderSubtle` border; `dashed: false` opts out to the
/// solid border for states web draws solid.
private struct CompareEmptyState<Content: View>: View {
    let dashed: Bool
    @ViewBuilder let content: Content

    init(dashed: Bool = false, @ViewBuilder content: () -> Content) {
        self.dashed = dashed
        self.content = content()
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            content
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl + DesignTokens.Spacing.sm)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.surfaceCard2)
        .overlay {
            // Web's dashed states use `borderSubtle`; the solid EmptyPositionState uses
            // `borderDefault` (components/CompareView.tsx).
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(
                    dashed ? DesignTokens.Colors.borderSubtle : DesignTokens.Colors.borderDefault,
                    style: StrokeStyle(lineWidth: 1, dash: dashed ? [5] : [])
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
}

/// Web's `CompareRows` (components/CompareView.tsx) — the two-column (one per team) depth
/// table: a header cell per team and one row per depth rank. Uneven depth renders a dim "—"
/// on the shorter side by leaving that player nil. The two team columns share the available
/// width, and depth order is conveyed by row order from top to bottom.
private struct CompareRows: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let a: (team: Team, players: [Player])
    let b: (team: Team, players: [Player])
    let repository: DepthRepository

    private var rowCount: Int { max(a.players.count, b.players.count) }

    var body: some View {
        // Compact vertical rhythm: VStack of the header band then the rank rows, without
        // the outer `depthCard` hit on the row hairlines. Web wraps the whole thing in an
        // `overflow-hidden rounded-2xl` box with a `borderDefault` border, `surfaceCard`
        // rows alternating `surfaceCard2`, and a `surfaceCard2` header band.
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                TeamHeaderCell(team: a.team)
                TeamHeaderCell(team: b.team)
            }
            // Use `surfaceCard2` for the header so it reads as a distinct band above the
            // table rows.
            .background(DesignTokens.Colors.surfaceCard2)

            ForEach(0..<rowCount, id: \.self) { rank in
                let layout =
                    dynamicTypeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(spacing: 0))
                    : AnyLayout(HStackLayout(spacing: 0))
                layout {
                    if dynamicTypeSize.isAccessibilitySize {
                        Text(a.team.abbrev).font(.caption.bold())
                    }
                    PlayerCell(player: a.players[safe: rank], team: a.team, repository: repository)
                    if dynamicTypeSize.isAccessibilitySize {
                        Text(b.team.abbrev).font(.caption.bold())
                    }
                    PlayerCell(player: b.players[safe: rank], team: b.team, repository: repository)
                }
                .background(rank % 2 == 1 ? DesignTokens.Colors.surfaceCard2 : Color.clear)
                .overlay(alignment: .top) {
                    Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
                }
            }
        }
        .background(DesignTokens.Colors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("compare-rows")
    }
}

/// Web's `TeamHeaderCell` (components/CompareView.tsx) — the team abbrev + city tinted
/// with that team's ring color.
private struct TeamHeaderCell: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let team: Team

    var body: some View {
        VStack(spacing: 2) {
            Text(team.abbrev.uppercased())
                .font(.caption.weight(.black))
                .tracking(1)
                .foregroundStyle(Color(hex: TeamSurfaces.mark(team.colors.jersey)))
            Text(team.city)
                .font(.caption2)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.sm + 4)
        .background(Color(hex: TeamSurfaces.mark(team.colors.jersey)).opacity(0.07))
    }
}

/// Web's `PlayerCell` — one cell in a depth column: `#number LastName`. Web shows the
/// full name past 480pt; native keeps the last-name form everywhere because the two compare
/// columns are always narrow. Each cell is centered within its half of the table.
private struct PlayerCell: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let player: Player?
    let team: Team
    let repository: DepthRepository

    var body: some View {
        Group {
            if let player {
                // Compare links to the same PlayerProfileView as the depth chart, without
                // depth context because no depth chart is visible on this screen.
                NavigationLink {
                    PlayerProfileView(player: player, team: team, repository: repository)
                } label: {
                    Text("#\(player.number) \(formatLastName(player.name))")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                }
                .accessibilityIdentifier("compare-player-cell-\(player.id)")
            } else {
                Text("—")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm + 2)
        .frame(maxWidth: .infinity, minHeight: 40)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
