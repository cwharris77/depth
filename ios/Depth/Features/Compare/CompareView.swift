import SwiftUI

// Native two-team compare (DEP-258) — a port of web's components/CompareView.tsx,
// replacing the navigation-parity placeholder. Two team-slot pickers feed two sections
// behind a Matchup/By-position segmented control: the matchup card (record, points,
// home/road splits + a "deepest room" teaser row) and the per-position depth table
// (rank-aligned side-by-side columns). All content derives from the CompareViewModel's
// resolved TeamStatsPage/TeamSnapshot reads through DepthRepository — no new data seam.
// The repository is a `CachingDepthRepository` (concrete, like every tab) so the
// team-picker sheet can reuse TeamListView.
//
// DEP-266 (Compare page unification): every bounded surface composes the shared
// `depthCard()` treatment (no hand-rolled background/border/radius literals), spacing
// sits on the 8pt `DesignTokens.Spacing` scale, and web-parity details that were dropped
// in the first port are restored — the `surfaceChip` VS capsule, the dashed unpicked
// slot, the "Dot = row rank" legend, the `surfaceCard2` depth-table header band, and the
// "By team"/"By position" tab copy. Web cards are `rounded-2xl` (16pt), so Compare passes
// `radius: .md` to `depthCard` to keep exact parity rather than the app-wide 24pt.
struct CompareView: View {
    @State private var viewModel: CompareViewModel
    private let repository: CachingDepthRepository

    init(repository: CachingDepthRepository) {
        self.repository = repository
        _viewModel = State(initialValue: CompareViewModel(repository: repository))
    }

    var body: some View {
        content
            .navigationTitle("Compare")
            .navigationBarTitleDisplayMode(.inline)
            .background(DesignTokens.Colors.bg)
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
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
    }

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
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                teamSlotRow

                tabSwitcher

                tabContent
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.md)
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("compare-content")
    }

    private var teamSlotRow: some View {
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

/// Web's `TeamMatchup` (components/CompareView.tsx): the pick/same-team prompts, the
/// matchup stat card, and the deepest-room teaser row below it.
private struct TeamMatchupSection: View {
    let viewModel: CompareViewModel

    var body: some View {
        if !viewModel.bothPicked {
            ComparePrompt(pickedCount: viewModel.pickedCount, copy: "Their record, points, and home-road splits line up side by side.")
        } else if viewModel.sameTeam {
            SameTeamBlock()
        } else {
            if let teamA = viewModel.teamA, let teamB = viewModel.teamB {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    matchupCard(teamA: teamA, teamB: teamB)
                    if let teaser = viewModel.teaser {
                        DeepestRoomTeaser(teaser: teaser, teamA: teamA, teamB: teamB) {
                            viewModel.selectTab(.position)
                            viewModel.selectPosition(teaser.position)
                        }
                    }
                }
            } else {
                // Unreachable given bothPicked, but degrade rather than crash.
                ComparePrompt(pickedCount: viewModel.pickedCount, copy: "Their record, points, and home-road splits line up side by side.")
            }
        }
    }

    private func matchupCard(teamA: Team, teamB: Team) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                teamHeader(teamA, stats: viewModel.effectiveStatsA)
                // Web parity: the in-card VS is bare `textFaint` caption text (web
                // CompareView line 422-426), distinct from the slot row's `surfaceChip`
                // capsule.
                Text("VS")
                    .font(.caption.weight(.black))
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                    .accessibilityHidden(true)
                teamHeader(teamB, stats: viewModel.effectiveStatsB)
            }
            .padding(.vertical, DesignTokens.Spacing.sm)

            statLine(label: "RECORD", a: record(viewModel.effectiveStatsA), b: record(viewModel.effectiveStatsB))
            statLine(label: "PTS FOR", a: points(viewModel.effectiveStatsA), b: points(viewModel.effectiveStatsB))
            statLine(label: "PTS AGAINST", a: against(viewModel.effectiveStatsA), b: against(viewModel.effectiveStatsB))
            statLine(label: "HOME", a: homeRecord(viewModel.effectiveStatsA), b: homeRecord(viewModel.effectiveStatsB))
            statLine(label: "ROAD", a: roadRecord(viewModel.effectiveStatsA), b: roadRecord(viewModel.effectiveStatsB))
        }
        // DEP-266: web's matchup card is `rounded-2xl` (16pt) — `depthCard(radius: .md)`.
        // `padded: false` because the header/StatLines carry their own padding (matching
        // PlayerDetailView's row-list card usage); without it the clip would inset rows.
        .depthCard(padded: false, radius: DesignTokens.Radius.md)
        .accessibilityIdentifier("compare-matchup-card")
    }

    private func teamHeader(_ team: Team, stats: TeamSeasonStats?) -> some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text(team.abbrev.uppercased())
                .font(.caption.weight(.black))
                .tracking(1)
                .foregroundStyle(Color(hex: team.colors.uiAccent))
            Text(team.city)
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .lineLimit(1)
            if let stats {
                Text(String(stats.season))
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    private func statLine(label: String, a: String, b: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(a)
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .lineLimit(1)
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Text(b)
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .lineLimit(1)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(DesignTokens.Colors.borderSubtle)
                .frame(height: 1)
        }
    }

    private func record(_ stats: TeamSeasonStats?) -> String {
        guard let stats else { return "—" }
        return stats.overallTies != 0
            ? "\(stats.overallWins)-\(stats.overallLosses)-\(stats.overallTies)"
            : "\(stats.overallWins)-\(stats.overallLosses)"
    }

    private func points(_ stats: TeamSeasonStats?) -> String { stats.map { String($0.pointsFor) } ?? "—" }
    private func against(_ stats: TeamSeasonStats?) -> String { stats.map { String($0.pointsAgainst) } ?? "—" }
    private func homeRecord(_ stats: TeamSeasonStats?) -> String { stats.map { "\($0.homeWins)-\($0.homeLosses)" } ?? "—" }
    private func roadRecord(_ stats: TeamSeasonStats?) -> String { stats.map { "\($0.roadWins)-\($0.roadLosses)" } ?? "—" }
}

/// Web's `DeepestRoomTeaser` (components/CompareView.tsx) — a tappable discoverability
/// row linking into the position tab. Overlapping team-color dots, the deepest
/// position label, and the rank-1 matchup line.
private struct DeepestRoomTeaser: View {
    let teaser: CompareTeaser
    let teamA: Team
    let teamB: Team
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: -6) {
                    teamDot(color: Color(hex: teamA.colors.uiAccent))
                    teamDot(color: Color(hex: teamB.colors.uiAccent))
                }
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text("DEEPEST ROOM · \(teaser.position.rawValue)")
                        .font(.caption2.weight(.bold))
                        .tracking(0.8)
                        // DEP-266: the canonical eyebrow color is `textMuted` (was
                        // `textFaintest`).
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                    Text(teaserRowText)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.sm)
            // DEP-266: web's teaser is `surfaceCard2` + dashed? No — `surfaceCard2` with a
            // solid `borderDefault` and `rounded-2xl` (16pt). Composed via `depthCard`
            // dense + radius .md; `padded: false` since the row carries its own padding.
            .depthCard(dense: true, padded: false, radius: DesignTokens.Radius.md)
            .contentShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("compare-deepest-room")
    }

    private func teamDot(color: Color) -> some View {
        Circle()
            .fill(color)
            .frame(width: 20, height: 20)
            .overlay {
                Circle().strokeBorder(DesignTokens.Colors.bg, lineWidth: 2)
            }
    }

    private var teaserRowText: String {
        func name(_ player: Player?) -> String {
            player.map { formatLastName($0.name) } ?? "—"
        }
        return "\(name(teaser.topA)) vs \(name(teaser.topB)) · \(teaser.countA) vs \(teaser.countB) deep"
    }
}

// MARK: - Position tab

/// Web's `PositionDepth` (components/CompareView.tsx): the position chip row plus the
/// rank-aligned depth table (or the prompt/same-team/empty states).
private struct PositionDepthSection: View {
    let viewModel: CompareViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            positionChipRow

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

    private var positionChipRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(COMPARE_POSITIONS, id: \.self) { pos in
                    let isActive = pos == viewModel.position
                    Button {
                        viewModel.selectPosition(pos)
                    } label: {
                        Text(pos.rawValue)
                            .font(.caption.weight(isActive ? .semibold : .regular))
                            .foregroundStyle(isActive ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textSecondary)
                            // DEP-266: chips were ~22-30pt (footnote + thin padding),
                            // below the 44pt minimum every other touch control keeps.
                            // Frame on the label first (the DepthUnitTabBar pattern) so
                            // the capsule background below covers the full hit area.
                            .frame(minHeight: 44)
                            .padding(.horizontal, DesignTokens.Spacing.sm + 4)
                            .background(isActive ? DesignTokens.Colors.accent : DesignTokens.Colors.surfaceChip, in: Capsule())
                            .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("compare-position-\(pos.rawValue)")
                }
            }
            .padding(.vertical, 2)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("compare-position-row")
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

/// Web's `CompareRows` (components/CompareView.tsx) — the two-column (one per team)
/// depth table: rank gutter on the left, a header cell per team, one row per depth
/// rank. Uneven depth renders a dim "—" on the shorter side by leaving that player nil.
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
            CompareRankLegend(teamA: a.team, teamB: b.team)
                .padding(.horizontal, DesignTokens.Spacing.xs)
                .padding(.bottom, DesignTokens.Spacing.xs)

            HStack(spacing: 0) {
                Color.clear.frame(width: 28)
                TeamHeaderCell(team: a.team)
                TeamHeaderCell(team: b.team)
            }
            // DEP-266: the header band was painted the same `surfaceCard` as the table,
            // reading as one blob; web paints it `surfaceCard2` so it reads as a distinct
            // band above the rows.
            .background(DesignTokens.Colors.surfaceCard2)

            ForEach(0..<rowCount, id: \.self) { rank in
                HStack(spacing: 0) {
                    rankGutter(rank + 1)
                    PlayerCell(player: a.players[safe: rank], team: a.team, rank: rank + 1)
                    PlayerCell(player: b.players[safe: rank], team: b.team, rank: rank + 1)
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

    private func rankGutter(_ rank: Int) -> some View {
        Text("\(rank)")
            .font(.caption2.weight(.bold))
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .frame(width: 28, height: 40)
            .background(
                Circle()
                    .fill(DesignTokens.Colors.surfaceChip)
                    .frame(width: 20, height: 20)
            )
    }
}

/// Web's `CompareRankLegend` (components/CompareView.tsx) — "Dot = row rank", the two
/// overlapping rank-1 team dots, and the faint "Deeper" swatch. Restored in DEP-266:
/// the first port drew the rank dots with no legend, leaving the color-code opaque.
private struct CompareRankLegend: View {
    let teamA: Team
    let teamB: Team

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs + 2) {
            Text("Dot = row rank")
                .font(.caption.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textFaint)

            HStack(spacing: -3) {
                rank1Dot(color: Color(hex: teamA.colors.uiAccent))
                rank1Dot(color: Color(hex: teamB.colors.uiAccent))
            }
            .accessibilityHidden(true)
            Text("Rank 1")
                .font(.caption.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textFaint)

            Circle()
                .fill(DesignTokens.Colors.textFaintest)
                .frame(width: 6, height: 6)
                .accessibilityHidden(true)
            Text("Deeper")
                .font(.caption.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textFaint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Dot equals row rank. Colored dot is rank one, faint dot is deeper.")
        .accessibilityIdentifier("compare-rank-legend")
    }

    private func rank1Dot(color: Color) -> some View {
        Circle()
            .fill(color)
            .frame(width: 6, height: 6)
            .overlay {
                Circle().strokeBorder(DesignTokens.Colors.bg, lineWidth: 1)
            }
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

/// Web's `PlayerCell` — one cell in a depth column: a rank dot (rank-1 = team uiAccent,
/// deeper = dim), `#number LastName`. Web shows the full name past 480pt; native keeps
/// the last-name form everywhere (the two compare columns are always narrow).
private struct PlayerCell: View {
    let player: Player?
    let team: Team
    let rank: Int

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs + 2) {
            Circle()
                .fill(rank == 1 ? Color(hex: team.colors.uiAccent) : DesignTokens.Colors.textFaintest)
                .frame(width: 6, height: 6)
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
            Spacer(minLength: 0)
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
