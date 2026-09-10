import SwiftUI

// Native schedule destination. The view owns only its feature-local observable state;
// every public read remains behind DepthRepository. A grid adapts to Dynamic Type and
// screen width instead of relying on fixed card geometry. When `isEmbedded` (round-4
// page switcher), the pushed-destination chrome is suppressed: the shared nav bar keeps
// the team identity, and the view renders as just the content column.
struct ScheduleView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var viewModel: ScheduleViewModel
    @State private var showSeasonPicker = false
    @State private var phase: SchedulePhase = .regular
    private let isEmbedded: Bool
    /// DEP-278 follow-up: Schedule fetches no team/uniform data of its own (lightweight
    /// read, invariant 5), so it reads the kit-resolved accent TeamDetailView publishes
    /// here instead — same store the tab tint and Stats read, so a kit pick on the
    /// roster page is reflected here without a page reload.
    private let currentTeamStore: CurrentTeamStore
    /// DEP-280: web parity — tapping a played/upcoming game card opens the compare view
    /// for this team and that game's opponent (components/TeamScheduleView.tsx's card
    /// `Link` into `/compare`). nil is a no-op tap (used by nothing today, but keeps the
    /// callback optional rather than forcing every call site to supply one).
    private let onSelectOpponent: ((Team) -> Void)?

    init(
        teamId: String,
        repository: DepthRepository,
        currentTeamStore: CurrentTeamStore,
        isEmbedded: Bool = false,
        onSelectOpponent: ((Team) -> Void)? = nil
    ) {
        _viewModel = State(initialValue: ScheduleViewModel(teamId: teamId, repository: repository))
        self.currentTeamStore = currentTeamStore
        self.isEmbedded = isEmbedded
        self.onSelectOpponent = onSelectOpponent
    }

    /// Falls back to the app's own accent before any team has resolved a color this
    /// session, mirroring RootTabView's identical fallback for the same store.
    /// The season-chip row's accent. DEP-424: the ring color — a real kit color, the same
    /// one the field dots and the tab tint use, with legibility deliberately not gated.
    private var teamAccent: Color {
        currentTeamStore.colors.map { Color(hex: TeamSurfaces.mark($0)) } ?? DesignTokens.Colors.accent
    }

    var body: some View {
        Group {
            if isEmbedded {
                content
            } else {
                content
                    .navigationTitle("Schedule")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .sheet(isPresented: $showSeasonPicker) {
            if let defaultSeason = viewModel.defaultSeason, let selectedSeason = viewModel.selectedSeason {
                SeasonPickerSheet(
                    items: viewModel.seasonOptions.map { SeasonPickerItem(season: $0) },
                    selectedSeason: selectedSeason,
                    accent: teamAccent,
                    identifierPrefix: "schedule"
                ) { season in
                    showSeasonPicker = false
                    Task { await viewModel.selectSeason(season) }
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            ProgressView("Loading schedule…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityIdentifier("schedule-loading")

        case .loaded:
            if let schedule = viewModel.schedule {
                scheduleContent(schedule)
            }

        case .empty:
            ContentUnavailableView {
                Label("No Schedule", systemImage: "calendar.badge.exclamationmark")
            } description: {
                Text("No regular-season schedule is available for this season.")
            } actions: {
                if viewModel.showsSeasonPicker {
                    seasonPicker
                }
            }
            .accessibilityIdentifier("schedule-empty")

        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load schedule", systemImage: "wifi.slash")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("schedule-retry")
                if viewModel.showsSeasonPicker {
                    seasonPicker
                }
            }
            .accessibilityIdentifier("schedule-error")
        }
    }

    private func scheduleContent(_ schedule: TeamSchedule) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                seasonPicker
                DepthSegmentedControl(
                    options: SchedulePhase.allCases.map {
                        DepthSegmentedOption(value: $0, label: $0.title, identifier: "schedule-phase-\($0.rawValue)")
                    },
                    selection: phase,
                    onChange: { phase = $0 },
                    activeColor: teamAccent,
                    fullWidth: true
                )

                switch phase {
                case .preseason:
                    gameGrid(schedule.preseason, emptyMessage: "No preseason games are available for this season.")
                case .regular:
                    gameGrid(schedule.games, emptyMessage: "No regular-season schedule is available for this season.")
                case .playoffs:
                    if let postseason = schedule.postseason {
                        PostseasonRunView(run: postseason)
                    } else {
                        ContentUnavailableView(
                            "Missed the playoffs",
                            systemImage: "flag.checkered",
                            description: Text("No postseason run is available for this season.")
                        )
                        .accessibilityIdentifier("schedule-playoffs-empty")
                    }
                }
            }
            .padding()
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("schedule-content")
        }
        .scrollIndicators(.hidden)
    }

    @ViewBuilder
    private func gameGrid(_ games: [ScheduleGame], emptyMessage: String) -> some View {
        if games.isEmpty {
            ContentUnavailableView(emptyMessage, systemImage: "calendar")
        } else {
            LazyVGrid(
                columns: dynamicTypeSize.isAccessibilitySize
                    ? [GridItem(.flexible())]
                    : [GridItem(.adaptive(minimum: 144, maximum: 260), spacing: DesignTokens.Spacing.sm)],
                spacing: DesignTokens.Spacing.sm
            ) {
                ForEach(games) { game in
                    ScheduleGameCard(
                        game: game,
                        isPastSeason: viewModel.isPastSeason,
                        onSelectOpponent: onSelectOpponent
                    )
                }
            }
        }
    }

    private var seasonPicker: some View {
        SeasonPickerTrigger(
            season: viewModel.selectedSeason,
            identifier: "schedule-season-trigger",
            isHistorical: viewModel.isPastSeason,
            onBackToCurrent: {
                guard let defaultSeason = viewModel.defaultSeason else { return }
                Task { await viewModel.selectSeason(defaultSeason) }
            }
        ) {
            showSeasonPicker = true
        }
    }
}

private enum SchedulePhase: String, CaseIterable {
    case preseason
    case regular
    case playoffs

    var title: String { rawValue.uppercased() }
}

private struct ScheduleGameCard: View {
    let game: ScheduleGame
    let isPastSeason: Bool
    /// DEP-280: nil (no compare destination available) for bye weeks and — matching
    /// web's TeamScheduleView.tsx guard comment ("Historical seasons have no
    /// compare-page destination yet, DEP-198") — a past season's games, even though
    /// this callback itself is compare-capable; `isTappable` folds both conditions in.
    let onSelectOpponent: ((Team) -> Void)?

    /// Web parity: the card is a `Link` into `/compare` only when there's a resolved
    /// opponent and the season isn't historical (TeamScheduleView.tsx's `!opp ||
    /// isPastSeason` guard flips to render a plain, non-interactive div instead).
    private var isTappable: Bool {
        !game.isBye && game.opponent != nil && !isPastSeason && onSelectOpponent != nil
    }

    var body: some View {
        if isTappable, let opponent = game.opponent {
            Button {
                onSelectOpponent?(opponent)
            } label: {
                cardContent
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the matchup comparison")
        } else {
            cardContent
        }
    }

    private var cardContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Eyebrow + title hierarchy matches the Stats page's NEXT GAME card
            // (TeamStatsView.swift's NextGameCard): caption2.bold eyebrow, subheadline
            // .heavy title.
            Text("WEEK \(game.week)")
                .font(.caption2.bold())
                .tracking(0.8)
                .foregroundStyle(DesignTokens.Colors.textMuted)

            if game.isBye {
                Text("BYE")
                    .font(.title3.bold())
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            } else {
                HStack(spacing: 6) {
                    if let opponent = game.opponent {
                        TeamIconView(team: opponent)
                    }
                    Text(opponentLabel)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Text(game.isHome ? "HOME" : "AWAY")
                    .font(.caption.bold())
                    .foregroundStyle(DesignTokens.Colors.textMuted)

                Text(detailLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(resultColor)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
        .depthCard()
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityIdentifier("schedule-week-\(game.week)")
    }

    private var opponentLabel: String {
        // ScheduleMapper rejects a non-bye row without an opponent before it reaches
        // feature state, so this only protects locally constructed preview/test data.
        guard let opponent = game.opponent else { return "" }
        return game.isHome ? "vs \(opponent.abbrev)" : "at \(opponent.abbrev)"
    }

    private var detailLabel: String {
        if let result = game.result, let teamScore = game.teamScore, let opponentScore = game.opponentScore {
            return "\(result.rawValue) \(teamScore)-\(opponentScore)"
        }
        if isPastSeason { return "No result" }
        return formattedDate
    }

    private var formattedDate: String {
        guard let date = game.date, let parsedDate = Self.inputFormatter.date(from: date) else {
            return "Date unavailable"
        }
        return parsedDate.formatted(.dateTime.month(.abbreviated).day())
    }

    private var resultColor: Color {
        switch game.result {
        case .win: DesignTokens.Colors.statusWin
        case .loss: DesignTokens.Colors.statusInjured
        case .tie: DesignTokens.Colors.textMuted
        case nil: DesignTokens.Colors.textMuted
        }
    }

    private var accessibilityLabel: String {
        if game.isBye { return "Week \(game.week), bye" }
        return "Week \(game.week), \(opponentLabel), \(detailLabel)"
    }

    private static let inputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// 3c's postseason treatment: a fixed ladder makes the season's end visible at a glance.
// The rail only reports source-backed results; unplayed rounds stay deliberately muted.
private struct PostseasonRunView: View {
    let run: PostseasonRun

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(alignment: .firstTextBaseline) {
                Text("SEED \(run.seed)")
                    .font(.title2.bold())
                Spacer()
                Text("THE RUN")
                    .font(.caption.bold())
                    .tracking(0.8)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("schedule-playoffs-seed")

            HStack(alignment: .top, spacing: 12) {
                PostseasonRail(rounds: run.rounds, terminalRound: run.terminalRound)
                VStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(run.rounds) { round in
                        PostseasonRoundCard(
                            round: round,
                            seed: run.seed,
                            isTerminal: run.terminalRound == round.kind
                        )
                    }
                }
            }
        }
        .accessibilityIdentifier("schedule-playoffs-content")
    }
}

private struct PostseasonRail: View {
    let rounds: [PostseasonRound]
    let terminalRound: PostseasonRoundKind?

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(rounds) { round in
                Circle()
                    .fill(pipColor(for: round))
                    .frame(width: round.kind == terminalRound ? 14 : 10, height: round.kind == terminalRound ? 14 : 10)
                    .frame(height: 78)
                    .frame(maxWidth: .infinity)
                    .background(alignment: .center) {
                        if round.kind != .superBowl {
                            Rectangle()
                                .fill(DesignTokens.Colors.borderDefault)
                                .frame(width: 2)
                                .padding(.top, 45)
                        }
                    }
            }
        }
        .frame(width: 14)
        .accessibilityHidden(true)
    }

    private func pipColor(for round: PostseasonRound) -> Color {
        switch round.game?.result {
        case .win: DesignTokens.Colors.statusWin
        case .loss: DesignTokens.Colors.statusInjured
        case .tie: DesignTokens.Colors.textMuted
        case nil: DesignTokens.Colors.surfaceCard2
        }
    }
}

private struct PostseasonRoundCard: View {
    let round: PostseasonRound
    let seed: Int
    let isTerminal: Bool

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(round.kind.title)
                    .font(.caption2.bold())
                    .tracking(0.8)
                    .foregroundStyle(resultColor)
                if let game = round.game, let opponent = game.opponent {
                    HStack(spacing: 6) {
                        TeamIconView(team: opponent)
                        Text(game.isHome ? "vs \(opponent.abbrev)" : "at \(opponent.abbrev)")
                            .font(.subheadline.weight(.heavy))
                    }
                } else if round.kind == .wildCard, seed == 1 {
                    Text("FIRST-ROUND BYE")
                        .font(.caption.bold())
                        .foregroundStyle(DesignTokens.Colors.statusWin)
                }
            }
            Spacer()
            if let game = round.game {
                VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xs) {
                    Text(scoreLabel(game))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(resultColor)
                    Text(dateLabel(game))
                        .font(.caption2.bold())
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 78, alignment: .leading)
        .padding(.horizontal, 14)
        .background(DesignTokens.Colors.surfaceCard, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(alignment: .bottom) {
            if isTerminal {
                Capsule()
                    .fill(resultColor)
                    .frame(height: 3)
                    .padding(.horizontal, 2)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("schedule-playoffs-\(round.kind.rawValue)")
    }

    private var resultColor: Color {
        switch round.game?.result {
        case .win: DesignTokens.Colors.statusWin
        case .loss: DesignTokens.Colors.statusInjured
        case .tie: DesignTokens.Colors.textMuted
        case nil: DesignTokens.Colors.textMuted
        }
    }

    private func scoreLabel(_ game: ScheduleGame) -> String {
        guard let result = game.result, let teamScore = game.teamScore, let opponentScore = game.opponentScore else {
            return "Upcoming"
        }
        return "\(result.rawValue) \(teamScore)-\(opponentScore)"
    }

    private func dateLabel(_ game: ScheduleGame) -> String {
        guard let date = game.date, let parsed = Self.inputFormatter.date(from: date) else { return "DATE TBD" }
        return parsed.formatted(.dateTime.month(.abbreviated).day()).uppercased()
    }

    private static let inputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}
