import SwiftUI

// Native two-team compare (DEP-258) — a port of web's components/CompareView.tsx,
// replacing the navigation-parity placeholder. Two team-slot pickers feed two sections
// behind a Matchup/By-position segmented control: the matchup card (record, points,
// home/road splits + a "deepest room" teaser row) and the per-position depth table
// (rank-aligned side-by-side columns). All content derives from the CompareViewModel's
// resolved TeamStatsPage/TeamSnapshot reads through DepthRepository — no new data seam.
// The repository is a `CachingDepthRepository` (concrete, like every tab) so the
// team-picker sheet can reuse TeamListView.
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
                NavigationStack {
                    TeamListView(
                        repository: repository,
                        selectedTeamId: currentTeamId ?? ""
                    ) { teamId in
                        if let slot = viewModel.pickingSlot {
                            Task { await viewModel.pickTeam(teamId, into: slot) }
                        }
                        viewModel.endPicking()
                    }
                    .navigationTitle("Pick a team")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button { viewModel.endPicking() } label: {
                                Image(systemName: "xmark")
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityLabel("Close")
                        }
                    }
                    .presentationBackground(DesignTokens.Colors.bg)
                    // `.sheet()` content gets a fresh UITraitCollection rather than
                    // inheriting ContentView's UI_TESTING_DYNAMIC_TYPE override — see
                    // that modifier's doc comment. Re-applied here so the picker's
                    // team-row scaling reflects the accessibility size in tests.
                    .modifier(UITestingDynamicTypeOverride())
                }
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
            VStack(alignment: .leading, spacing: 0) {
                teamSlotRow
                    .padding(.horizontal, 16)
                    .padding(.top, 16)

                tabSwitcher
                    .padding(.horizontal, 16)
                    .padding(.top, 16)

                tabContent
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("compare-content")
    }

    private var teamSlotRow: some View {
        HStack(spacing: 12) {
            teamSlotButton(viewModel.teamA, slot: .a)
            Text("VS")
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .accessibilityHidden(true)
            teamSlotButton(viewModel.teamB, slot: .b)
        }
    }

    @ViewBuilder
    private func teamSlotButton(_ team: Team?, slot: CompareViewModel.Slot) -> some View {
        Button {
            viewModel.beginPicking(slot)
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                if let team {
                    Text(team.abbrev.uppercased())
                        .font(.caption.weight(.black))
                        .tracking(1)
                        .foregroundStyle(Color(hex: team.colors.uiAccent))
                }
                Text(team.map { "\($0.city) \($0.name)" } ?? "Pick a team")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(team != nil ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textFaint)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                team.map { Color(hex: $0.colors.uiAccent).opacity(0.10) } ?? Color.clear,
                in: RoundedRectangle(cornerRadius: 16)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(
                        team.map { Color(hex: $0.colors.uiAccent).opacity(0.33) } ?? DesignTokens.Colors.borderInput,
                        lineWidth: 1
                    )
            }
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .accessibilityIdentifier("compare-slot-\(slot == .a ? "a" : "b")")
    }

    private var tabSwitcher: some View {
        DepthSegmentedControl(
            options: [
                DepthSegmentedOption(value: CompareViewModel.Tab.matchup, label: "MATCHUP", identifier: "compare-tab-matchup"),
                DepthSegmentedOption(value: CompareViewModel.Tab.position, label: "BY POSITION", identifier: "compare-tab-position"),
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
                VStack(spacing: 12) {
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
            HStack(spacing: 8) {
                teamHeader(teamA, stats: viewModel.effectiveStatsA)
                Text("VS")
                    .font(.caption.bold())
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                    .accessibilityHidden(true)
                teamHeader(teamB, stats: viewModel.effectiveStatsB)
            }
            .padding(.vertical, 12)

            statLine(label: "RECORD", a: record(viewModel.effectiveStatsA), b: record(viewModel.effectiveStatsB))
            statLine(label: "PTS FOR", a: points(viewModel.effectiveStatsA), b: points(viewModel.effectiveStatsB))
            statLine(label: "PTS AGAINST", a: against(viewModel.effectiveStatsA), b: against(viewModel.effectiveStatsB))
            statLine(label: "HOME", a: homeRecord(viewModel.effectiveStatsA), b: homeRecord(viewModel.effectiveStatsB))
            statLine(label: "ROAD", a: roadRecord(viewModel.effectiveStatsA), b: roadRecord(viewModel.effectiveStatsB))
        }
        .background(DesignTokens.Colors.surfaceCard, in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        }
        .accessibilityIdentifier("compare-matchup-card")
    }

    private func teamHeader(_ team: Team, stats: TeamSeasonStats?) -> some View {
        VStack(spacing: 3) {
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
        HStack(spacing: 8) {
            Text(a)
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .trailing)
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Text(b)
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
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
            HStack(spacing: 10) {
                HStack(spacing: -6) {
                    teamDot(color: Color(hex: teamA.colors.uiAccent))
                    teamDot(color: Color(hex: teamB.colors.uiAccent))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("DEEPEST ROOM · \(teaser.position.rawValue)")
                        .font(.caption2.weight(.bold))
                        .tracking(0.8)
                        .foregroundStyle(DesignTokens.Colors.textFaintest)
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
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(DesignTokens.Colors.surfaceCard2, in: RoundedRectangle(cornerRadius: 14))
            .overlay {
                RoundedRectangle(cornerRadius: 14).strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: 14))
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
        VStack(alignment: .leading, spacing: 14) {
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
            HStack(spacing: 8) {
                ForEach(COMPARE_POSITIONS, id: \.self) { pos in
                    let isActive = pos == viewModel.position
                    Button {
                        viewModel.selectPosition(pos)
                    } label: {
                        Text(pos.rawValue)
                            .font(.footnote.weight(isActive ? .semibold : .regular))
                            .foregroundStyle(isActive ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textSecondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(isActive ? DesignTokens.Colors.accent : DesignTokens.Colors.surfaceChip, in: Capsule())
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
        VStack(spacing: 8) {
            Image(systemName: "rectangle.split.2x1")
                .font(.title2)
                .foregroundStyle(DesignTokens.Colors.textFaintest)
            Text(pickedCount == 0 ? "Pick two teams to compare" : "Pick one more team")
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text(copy)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 280)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 16)
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(DesignTokens.Colors.borderSubtle, style: StrokeStyle(lineWidth: 1, dash: [5]))
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("compare-prompt")
    }
}

/// Web's `SameTeamBlock` — comparing a team against itself.
private struct SameTeamBlock: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "arrow.left.and.right")
                .font(.title2)
                .foregroundStyle(DesignTokens.Colors.textFaintest)
            Text("Pick two different teams")
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text("Comparing a team against itself won’t show anything new.")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 280)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 16)
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(DesignTokens.Colors.borderSubtle, style: StrokeStyle(lineWidth: 1, dash: [5]))
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("compare-same-team")
    }
}

/// Web's `EmptyPositionState` — neither team has a player at the selected position.
private struct EmptyPositionState: View {
    let position: Position

    var body: some View {
        Text("Neither team lists a \(position.rawValue)")
            .font(.subheadline)
            .foregroundStyle(DesignTokens.Colors.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
            }
            .accessibilityIdentifier("compare-empty-position")
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
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Color.clear.frame(width: 28)
                TeamHeaderCell(team: a.team)
                TeamHeaderCell(team: b.team)
            }
            .background(DesignTokens.Colors.surfaceCard)

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
        .background(DesignTokens.Colors.surfaceCard, in: RoundedRectangle(cornerRadius: 16))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
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
        .padding(.vertical, 12)
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
        HStack(spacing: 6) {
            Circle()
                .fill(rank == 1 ? Color(hex: team.colors.uiAccent) : DesignTokens.Colors.textFaintest)
                .frame(width: 6, height: 6)
            if let player {
                Text("#\(player.number) \(formatLastName(player.name))")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            } else {
                Text("—")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, minHeight: 40)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}