import SwiftUI

// Native two-team compare (DEP-258) — a port of web's components/CompareView.tsx,
// replacing the navigation-parity placeholder. Two team-slot pickers feed two sections
// behind a By-team/By-position segmented control: the By-team tab's unit-metrics lenses,
// and the per-position depth table (rank-aligned side-by-side columns). All content
// derives from the CompareViewModel's resolved TeamStatsPage/TeamSnapshot reads through
// DepthRepository — no new data seam. The repository is a `CachingDepthRepository`
// (concrete, like every tab) so the team-picker sheet can reuse TeamListView.
//
// DEP-266 (Compare page unification): every bounded surface composes the shared
// `depthCard()` treatment (no hand-rolled background/border/radius literals), spacing
// sits on the 8pt `DesignTokens.Spacing` scale. Web cards are `rounded-2xl` (16pt), so
// Compare passes `radius: .md` to `depthCard` to keep exact parity rather than the
// app-wide 24pt.
//
// Aug 2026 feedback pass (two rounds): the Forecast lens, Roster lens, and Deepest Room
// teaser were removed outright (not reworded) — see CompareViewModel.swift's Lens doc
// comment and Domain/Compare.swift's header for why. The room→role position picker lost
// its "1 OF 2 / 2 OF 2" step labels and each room's redundant detail caption, the depth
// table lost its "Dot = row rank" legend and per-row dot (the numbered gutter chip is
// the only rank indicator now), and each team slot grew an explicit clear affordance.
struct CompareView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var viewModel: CompareViewModel
    private let repository: CachingDepthRepository

    init(repository: CachingDepthRepository, preselectedTeamIds: (a: String, b: String)? = nil) {
        self.repository = repository
        _viewModel = State(initialValue: CompareViewModel(repository: repository, preselectedTeamIds: preselectedTeamIds))
    }

    var body: some View {
        // Cooper review (DEP-252/DEP-277): RootTabView's Compare tab instantiates this
        // view directly with no ambient NavigationStack (unlike DepthChartsTab/
        // UniformsTab, which each wrap themselves) — so `.navigationTitle` and the
        // shared top-nav toolbar below were silent no-ops until this was added.
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
                            currentSeason: viewModel.currentSeason ?? selected,
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
                    // Matches TeamDetailView's account sheet exactly (DEP-252) — same
                    // SettingsView, same three dependencies, just sourced from
                    // DepthEnvironment directly since CompareView (unlike
                    // TeamDetailView) doesn't already thread sessionStore/events in.
                    SettingsView(
                        sessionStore: DepthEnvironment.authSessionStore,
                        authService: DepthEnvironment.authService,
                        events: DepthEnvironment.appEvents,
                        onboarding: DepthEnvironment.onboarding,
                        settingsStore: DepthEnvironment.userSettingsStore
                    )
                }
        }
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

    /// The season picker. Hidden until at least one team resolves, because the season list
    /// is read off the picked teams' own `teamStats` payloads — there is no team-independent
    /// season source here, and a chip that opens an empty sheet is worse than no chip.
    ///
    /// Aug 26 (Cooper): the provenance stamp that sat opposite this chip is gone — "I don't
    /// need to see that the season already happened or how many games it had or when it
    /// ended." The season chip itself already answers which season you are looking at, which
    /// was the gap worth closing; the FINAL/LIVE/UPCOMING badge and its date line were
    /// answering a question nobody asked. The thin-sample caution strip stays: that one is a
    /// warning about the numbers below it, not a provenance claim.
    @ViewBuilder
    private var seasonRow: some View {
        if !viewModel.seasonOptions.isEmpty {
            SeasonPickerTrigger(
                season: viewModel.resolvedSeason,
                accent: DesignTokens.Colors.accent,
                identifier: "compare-season-trigger"
            ) {
                showSeasonPicker = true
            }
        }
    }

    private var teamSlotRow: some View {
        // Aug 26 (Cooper): the "Clear selection" control is gone — each slot's own X is a
        // clear enough way to change a pick now that both slots carry one ("it'll be a couple
        // more clicks, but I'm not worried about it"). That also buys back the vertical space
        // this row used to spend on a label.
        HStack(spacing: DesignTokens.Spacing.sm) {
            teamSlotButton(viewModel.teamA, slot: .a)
            // Web parity: the VS separator is a `surfaceChip` capsule (web CompareView
            // wraps "VS" in a `rounded-full` span with `surfaceChip` bg + `textFaint`
            // caption text). Restored in DEP-266 after the first port drew it as bare text.
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
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                if let team {
                    Text(team.abbrev.uppercased())
                        .font(.caption.weight(.black))
                        .tracking(1)
                        .foregroundStyle(Color(hex: team.colors.uiAccent))
                }
                Text(slotLabel(team))
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(team != nil ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textFaint)
                    .lineLimit(1)
                if team != nil {
                    slotRecord(slot)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, team != nil ? DesignTokens.Spacing.sm : DesignTokens.Spacing.lg)
            .background(
                team.map { Color(hex: $0.colors.uiAccent).opacity(0.10) }
                    ??
                    // DEP-266: the unpicked slot is a dashed `borderInput` border on
                    // transparent — web parity — so it reads as a "fill this in" hole
                    // rather than a solid-but-wrong slot. The `.overlay` below draws it.
                    Color.clear,
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .overlay {
                if let team {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .strokeBorder(Color(hex: team.colors.uiAccent).opacity(0.33), lineWidth: 1)
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

    /// The picked team's W-L at the resolved season, under its name (vault canvas 1b) —
    /// "the filled side already shows its record, so the page starts paying off before the
    /// second pick" (canvas 2b). While the side is still resolving this is a placeholder bar
    /// of the same height (canvas 2e), never a "0-0" that would flash and then jump
    /// (AGENTS.md mistake #16). A resolved season the team has no row for shows nothing
    /// rather than borrowing another year's record.
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
    /// illegible strike-through that `.minimumScaleFactor` produced (DEP-266).
    private func slotLabel(_ team: Team?) -> String {
        guard let team else { return "Pick a team" }
        return "\(team.city) \(team.name)"
    }

    private var tabSwitcher: some View {
        DepthSegmentedControl(
            options: [
                // DEP-266: web's tab copy is "By team"/"By position" — the first port
                // used all-caps "MATCHUP"/"BY POSITION"; restored to the web labels.
                DepthSegmentedOption(value: CompareViewModel.Tab.matchup, label: "By team", identifier: "compare-tab-matchup"),
                DepthSegmentedOption(value: CompareViewModel.Tab.position, label: "By position", identifier: "compare-tab-position"),
            ],
            selection: viewModel.tab,
            onChange: { viewModel.selectTab($0) },
            // Web's CompareView passes `<SegmentedControl fullWidth …>` — the Matchup/
            // By-position switcher is a standalone full-width bar (DEP-236 added
            // `fullWidth` after this port began; adopted for parity).
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
            PositionDepthSection(viewModel: viewModel)
        }
    }
}

// MARK: - Matchup tab

/// DEP-317's five-lens matchup briefing plus the existing DEP-311 drilldown path.
private struct TeamMatchupSection: View {
    let viewModel: CompareViewModel

    var body: some View {
        if !viewModel.bothPicked {
            ComparePrompt(pickedCount: viewModel.pickedCount, copy: "Offense, defense, and special teams metrics line up side by side.")
        } else if viewModel.sameTeam {
            SameTeamBlock()
        } else if viewModel.teamA != nil, viewModel.teamB != nil {
            CompareLensesView(viewModel: viewModel)
        } else {
            // Unreachable given bothPicked, but degrade rather than crash.
            ComparePrompt(pickedCount: viewModel.pickedCount, copy: "Offense, defense, and special teams metrics line up side by side.")
        }
    }
}

// MARK: - Position tab

/// Web's `PositionDepth` (components/CompareView.tsx): the two-step room→role position
/// picker (DEP-311, replacing the horizontal chip row) plus the rank-aligned depth table
/// (or the prompt/same-team/empty states).
private struct PositionDepthSection: View {
    let viewModel: CompareViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            RoomPositionPicker(viewModel: viewModel)

            if !viewModel.bothPicked {
                ComparePrompt(pickedCount: viewModel.pickedCount, copy: "Their depth at the selected position lines up side by side, rank for rank.")
            } else if viewModel.sameTeam {
                SameTeamBlock()
            } else if viewModel.positionGroupA.isEmpty && viewModel.positionGroupB.isEmpty {
                EmptyPositionState(position: viewModel.position)
            } else if let teamA = viewModel.teamA, let teamB = viewModel.teamB {
                CompareRows(
                    a: (team: teamA, players: viewModel.positionGroupA),
                    b: (team: teamB, players: viewModel.positionGroupB)
                )
            } else {
                // Unreachable given bothPicked, but degrade rather than crash (AGENTS.md
                // invariant 6): a team slot that somehow went nil after bothPicked.
                ComparePrompt(pickedCount: viewModel.pickedCount, copy: "Their depth at the selected position lines up side by side, rank for rank.")
            }
        }
    }
}

/// The DEP-311 two-step position picker that replaces the old horizontal chip scroller: a
/// balanced unit→room grid followed by an exact-role panel. All 29 `COMPARE_POSITIONS`
/// values stay reachable with no horizontal scrolling; every interactive tile keeps a 44pt
/// minimum tap target, selected state is never color-only, and VoiceOver labels come from
/// `Position.fullName`. Aug 2026: dropped the "1 OF 2 · ROOM" / "2 OF 2 · POSITION" step
/// labels (Cooper: the two steps read fine without narrating themselves).
private struct RoomPositionPicker: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let viewModel: CompareViewModel

    /// The combined height of the room grid + exact-role panel, reserved regardless of which
    /// unit/room is active, so the depth table below never jumps (Cooper, Aug 26: "I don't
    /// like how the compare table in the by position gets moved around... it should be fixed
    /// to one spot"). Sized to the tallest real combination: a 2-row room grid (Offense and
    /// Defense both have 4 rooms) plus a single row of role pills — the widest room is five
    /// roles, which now fits one row since the pills hug their labels. Special Teams' 1-row
    /// grid and Quarterback's no-panel selection leave blank space below at this same height.
    ///
    /// Aug 26 (Cooper): down from 250. The old value reserved two rows of full-width role
    /// tiles plus the container box around them; with both gone, the surplus was pure dead
    /// space between the picker and the table, and the ask was for the By-position view to
    /// fit without scrolling.
    private static let reservedPickerHeight: CGFloat = 176

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Unit lens drives the room grid. Styled as a segmented unit switcher reusing the
            // depth-chart field's unit tab treatment.
            unitLensRow

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                // The balanced room grid is always present (DEP-298 refined.html keeps the
                // `.rooms` grid with the active `.room` highlighted while the selection panel
                // sits below it — not a grid-or-panel either/or). Picking a multi-role room
                // expands its exact-role panel beneath; picking it again collapses it.
                roomGrid

                if let room = viewModel.expandedRoom {
                    exactRolePanel(room)
                }
            }
            .frame(minHeight: Self.reservedPickerHeight, alignment: .top)
        }
        // NB: no `.accessibilityIdentifier` on this container — DepthUnitTabBar's buttons
        // carry their own `unit-tab-*` ids, and a container-level identifier on the VStack
        // overrode those (probed under DEP-311), leaving every lens unreachable by id.
        .animation(reduceMotion ? nil : DesignTokens.Motion.selection, value: viewModel.expandedRoomID)
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
    /// the design locked (DEP-298 refined.html `.rooms` is `1fr 1fr`), which keeps every room
    /// tile ≥ ~44pt tall without horizontal scrolling. Aug 2026: dropped the per-room detail
    /// caption (Cooper: it duplicated what the exact-role panel already spells out one tap
    /// later) — name plus a trailing position count is enough.
    private var roomGrid: some View {
        LazyVGrid(
            columns: [GridItem(.flexible(), spacing: DesignTokens.Spacing.sm), GridItem(.flexible())],
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
            withAnimation(reduceMotion ? DesignTokens.Motion.feedback : DesignTokens.Motion.selection) {
                viewModel.selectRoom(room)
            }
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(room.name)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(isActive ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textPrimary)
                Spacer(minLength: 0)
                Text("\(room.positions.count)")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(isActive ? DesignTokens.Colors.onAccent.opacity(0.7) : DesignTokens.Colors.textFaint)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            .background(isActive ? DesignTokens.Colors.accent : DesignTokens.Colors.surfaceCard2, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .strokeBorder(
                        isActive ? DesignTokens.Colors.onAccent.opacity(0.40) : DesignTokens.Colors.borderDefault,
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
    /// single-position room (Cooper: "since there's only one position in the QB group, don't
    /// add the secondary positions container for that one" — `CompareViewModel.selectRoom`
    /// never expands one). A room with 3 or fewer roles (Backfield's RB/FB, etc.) centers its
    /// tiles in a fixed-width row instead of sitting left-stuck in a 3-column grid with an
    /// empty trailing cell; a room with more roles keeps the grid. Aug 2026: padding and tile
    /// size both pulled back in — the previous round's "more space" pass over-corrected into
    /// tiles that read as oversized (Cooper: "way smaller... They're pretty huge right now").
    ///
    /// No `.accessibilityIdentifier` on this container (there was one, "compare-exact-role-
    /// panel", with no test or code ever reading it): applying an identifier to a `Group`
    /// whose content structurally switches between two different view trees (`HStack` vs.
    /// `LazyVGrid`, above) let that identifier bleed onto every child `roleTile` button the
    /// instant a room→room transition crossed that branch — e.g. expanding a >3-role room
    /// then immediately a ≤3-role one — so every role tile inside reported
    /// "compare-exact-role-panel" instead of its own "compare-position-<code>" (caught by
    /// `testMatchupRoomsReachEveryUnitWithoutHorizontalScrolling`, reproduced locally via
    /// `xcodebuild test`: the accessibility snapshot showed all three Safeties role buttons
    /// carrying the panel's identifier). Each `roleTile` already carries its own identifier
    /// and `.accessibilityElement(children: .combine)`; the container needs none.
    private func exactRolePanel(_ room: CompareRoom) -> some View {
        // Aug 26 (Cooper): the canvas's By-position artboard (1d) draws these as a plain row
        // of small hugging chips with no container behind them — "I like those better than
        // ours... also remove the outer box around the pills." The widest room is five roles
        // (Line, Defensive Line, Linebackers), which fits one row at this size, so the
        // grid/HStack branch that used to switch on role count is gone too: it exists only
        // when tiles are wide enough to wrap.
        HStack(spacing: DesignTokens.Spacing.xs + 2) {
            ForEach(room.positions, id: \.self) { pos in
                roleTile(pos)
            }
            Spacer(minLength: 0)
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
                    .foregroundStyle(isSelected ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textPrimary)
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.caption2.weight(.black))
                        .foregroundStyle(DesignTokens.Colors.onAccent)
                        .accessibilityHidden(true)
                }
            }
            // The painted chip hugs its label (canvas 1d: 8x12px padding), while the button
            // around it still reserves the 44pt HIG tap target. Splitting the two is what
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
        // DEP-266: web's EmptyPositionState is a `surfaceCard2` box with a solid
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

/// The one empty/placeholder treatment shared by Compare's three states (DEP-266, which
/// previously had three divergent hand-rolled boxes: ComparePrompt and SameTeamBlock used
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
/// table: a header cell per team, one row per depth rank. Uneven depth renders a dim "—" on
/// the shorter side by leaving that player nil. Aug 2026: dropped the leading rank-number
/// gutter column entirely (Cooper: "I don't like the gray column to the left of the first
/// team... it should just be the two team columns" — split evenly, each centered within its
/// half). Depth order is now conveyed purely by row order, top to bottom.
private struct CompareRows: View {
    let a: (team: Team, players: [Player])
    let b: (team: Team, players: [Player])

    private var rowCount: Int { max(a.players.count, b.players.count) }

    var body: some View {
        // Compact vertical rhythm: VStack of the header band then the rank rows, without
        // the outer `depthCard` hit on the row hairlines. Web wraps the whole thing in an
        // `overflow-hidden rounded-2xl` box with a `borderDefault` border, `surfaceCard`
        // rows alternating `surfaceCard2`, and a `surfaceCard2` header band (DEP-266).
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                TeamHeaderCell(team: a.team)
                TeamHeaderCell(team: b.team)
            }
            // DEP-266: the header band was painted the same `surfaceCard` as the table,
            // reading as one blob; web paints it `surfaceCard2` so it reads as a distinct
            // band above the rows.
            .background(DesignTokens.Colors.surfaceCard2)

            ForEach(0..<rowCount, id: \.self) { rank in
                HStack(spacing: 0) {
                    PlayerCell(player: a.players[safe: rank])
                    PlayerCell(player: b.players[safe: rank])
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
/// with that team's uiAccent.
private struct TeamHeaderCell: View {
    let team: Team

    var body: some View {
        VStack(spacing: 2) {
            Text(team.abbrev.uppercased())
                .font(.caption.weight(.black))
                .tracking(1)
                .foregroundStyle(Color(hex: team.colors.uiAccent))
            Text(team.city)
                .font(.caption2)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.sm + 4)
        .background(Color(hex: team.colors.uiAccent).opacity(0.07))
    }
}

/// Web's `PlayerCell` — one cell in a depth column: `#number LastName`. Web shows the
/// full name past 480pt; native keeps the last-name form everywhere (the two compare
/// columns are always narrow). Aug 2026: dropped the per-row rank dot (it duplicated the
/// now-removed gutter's rank number) and centered the text within the column — with the
/// gutter gone, each cell is exactly half the table's width, and a left-aligned label in
/// a half-width column read off-center.
private struct PlayerCell: View {
    let player: Player?

    var body: some View {
        Group {
            if let player {
                Text("#\(player.number) \(formatLastName(player.name))")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
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
