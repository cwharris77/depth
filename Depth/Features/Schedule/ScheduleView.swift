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
    /// for this team and that game's opponent (web/components/TeamScheduleView.tsx's card
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
            // `defaultSeason != nil` rather than a binding: the value itself is unused here
            // (seasonOptions already derives from it and is empty without it), it is only the
            // gate that a season range exists at all.
            if viewModel.defaultSeason != nil, let selectedSeason = viewModel.selectedSeason {
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
            VStack(alignment: .leading, spacing: 12) {
                seasonPicker
                // Canvas 1a: phase tabs share the roster page's underline row (not the
                // filled page-switcher pill), so the two levels of navigation read apart.
                DepthTabBar(
                    options: SchedulePhase.allCases.map {
                        DepthSegmentedOption(value: $0, label: $0.title, identifier: "schedule-phase-\($0.rawValue)")
                    },
                    selection: phase,
                    onChange: { phase = $0 },
                    activeColor: teamAccent
                )
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(alignment: .bottom) {
                    Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
                }

                switch phase {
                case .preseason:
                    gameGrid(schedule.preseason, emptyMessage: "No preseason games are available for this season.")
                case .regular:
                    gameGrid(schedule.games, emptyMessage: "No regular-season schedule is available for this season.")
                case .playoffs:
                    playoffsContent(schedule)
                }
            }
            .padding()
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("schedule-content")
        }
        .scrollIndicators(.hidden)
    }

    @ViewBuilder
    private func playoffsContent(_ schedule: TeamSchedule) -> some View {
        switch viewModel.playoffsState {
        case .run(let run):
            PostseasonRunView(
                run: run,
                season: schedule.season,
                standing: [schedule.conference, schedule.regularSeasonRecord].compactMap { $0 }.joined(separator: " · "),
                accent: teamAccent
            )
        case .missed:
            ContentUnavailableView {
                Label("Missed the playoffs", systemImage: "flag.checkered")
            } description: {
                Text(verbatim: "Finished \(schedule.regularSeasonRecord) in the \(schedule.season) regular season.")
            }
            .accessibilityIdentifier("schedule-playoffs-empty")
        case .notStarted:
            ContentUnavailableView {
                Label("Playoffs haven't started", systemImage: "calendar.badge.clock")
            } description: {
                Text(verbatim: "The \(schedule.season) postseason begins after the regular season ends.")
            }
            .accessibilityIdentifier("schedule-playoffs-upcoming")
        case nil:
            EmptyView()
        }
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
            // Eyebrow + title hierarchy: caption2.bold eyebrow, subheadline .heavy title.
            Text(game.weekTitle.uppercased())
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
        if game.isBye { return "\(game.weekTitle), bye" }
        return "\(game.weekTitle), \(opponentLabel), \(detailLabel)"
    }

    private static let inputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// Canvas 3c's postseason treatment: a fixed four-round ladder with a rail that draws
// itself down to the round where the run ended. The outcome lands on that round — its pip
// grows a halo and a bar sweeps along its card's bottom edge — instead of being spelled
// out in a banner. Unreached rounds stay static and muted; the rail only reports
// source-backed results.
private struct PostseasonRunView: View {
    let run: PostseasonRun
    let season: Int
    /// "NFC · 11-6" — conference (when resolved) and regular-season record.
    let standing: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // The season picker above already names the year, so the seed row carries only
            // the seed and the standing that earned it.
            HStack(alignment: .firstTextBaseline) {
                Text(verbatim: "SEED \(run.seed)")
                    .font(.title.bold())
                Spacer(minLength: DesignTokens.Spacing.sm)
                Text(verbatim: standing)
                    .font(.caption.bold())
                    .foregroundStyle(accent)
            }
            .padding(.bottom, 14)
            .overlay(alignment: .bottom) {
                Rectangle().fill(DesignTokens.Colors.borderInput).frame(height: 1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("schedule-playoffs-seed")
            .padding(.bottom, DesignTokens.Spacing.md)

            PostseasonLadder(run: run, season: season, accent: accent)
        }
        .accessibilityIdentifier("schedule-playoffs-content")
    }
}

/// Canvas 3c's choreography, derived from its two frames (a Divisional exit and a Super
/// Bowl win): each reached round lands half a second after the one above, and the rail's
/// single eased draw ends just as the terminal round's pip fills and its bar sweeps.
private struct PostseasonLadderTiming {
    let terminalIndex: Int?

    static let railDelay = 0.1
    private let step = 0.5

    var railDuration: Double { 1.3 + 0.25 * Double(terminalIndex ?? 0) }
    private var railEnd: Double { Self.railDelay + railDuration }

    func cardDelay(_ index: Int) -> Double { 0.2 + step * Double(index) }

    func pipDelay(_ index: Int) -> Double {
        index == terminalIndex ? railEnd - 0.2 : 0.35 + step * Double(index)
    }

    var sweepDelay: Double { railEnd - 0.1 }
}

private enum PostseasonRoundStage {
    case reached
    case terminal
    case unreached
}

private struct PostseasonLadder: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let run: PostseasonRun
    let season: Int
    let accent: Color
    /// Flipped on appear, so every staged element animates from its entrance state. Reduce
    /// Motion renders the settled state from the first frame instead.
    @State private var hasPlayed = false

    private var isShown: Bool { hasPlayed || reduceMotion }
    private var timing: PostseasonLadderTiming { PostseasonLadderTiming(terminalIndex: run.terminalIndex) }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // The rail's column; the rail itself is drawn in the overlay below so its pips
            // can sit on each card's measured center, whatever height Dynamic Type gives it.
            Color.clear.frame(width: 2)
            VStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(Array(run.rounds.enumerated()), id: \.element.id) { index, round in
                    PostseasonRoundCard(
                        round: round,
                        season: season,
                        seed: run.seed,
                        stage: stage(index),
                        accent: accent,
                        terminalColor: terminalColor,
                        isShown: isShown,
                        timing: timing,
                        index: index
                    )
                    // Measured on a background so the card's rise-in offset never drags
                    // its pip along with it.
                    .background {
                        Color.clear.anchorPreference(key: RoundBoundsKey.self, value: .bounds) { [index: $0] }
                    }
                }
            }
        }
        .overlayPreferenceValue(RoundBoundsKey.self) { anchors in
            GeometryReader { proxy in
                rail(centers: anchors.mapValues { proxy[$0].midY })
            }
            .accessibilityHidden(true)
        }
        .onAppear { hasPlayed = true }
    }

    private func stage(_ index: Int) -> PostseasonRoundStage {
        guard let terminal = run.terminalIndex, index <= terminal else { return .unreached }
        return index == terminal ? .terminal : .reached
    }

    /// The decided round's color: a loss ends the run in the status red; a win (a title,
    /// or the latest win of a run still in progress) stays in the team's own color.
    private var terminalColor: Color {
        guard let index = run.terminalIndex else { return accent }
        switch run.rounds[index].game?.result {
        case .loss: return DesignTokens.Colors.statusInjured
        case .tie: return DesignTokens.Colors.textMuted
        case .win, nil: return accent
        }
    }

    private func rail(centers: [Int: CGFloat]) -> some View {
        ZStack(alignment: .topLeading) {
            // The line ends at the last decided round's pip — it never trails on past the
            // run's final game, so a run that has not reached a decided round draws no line
            // and its rounds show only their unreached pips.
            if let terminal = run.terminalIndex, let end = centers[terminal] {
                // The faint groove the accent fill grows into during the entrance draw.
                Capsule()
                    .fill(DesignTokens.Colors.borderDefault)
                    .frame(width: 2, height: end)
                Capsule()
                    .fill(accent)
                    .frame(width: 2, height: end)
                    .scaleEffect(x: 1, y: isShown ? 1 : 0, anchor: .top)
                    .animation(
                        reduceMotion ? nil : .timingCurve(0.4, 0, 0.2, 1, duration: timing.railDuration)
                            .delay(PostseasonLadderTiming.railDelay),
                        value: isShown
                    )
            }
            ForEach(run.rounds.indices, id: \.self) { index in
                pip(index)
                    .position(x: 1, y: centers[index] ?? 0)
                    .opacity(centers[index] == nil ? 0 : 1)
            }
        }
    }

    @ViewBuilder
    private func pip(_ index: Int) -> some View {
        switch stage(index) {
        case .unreached:
            Circle()
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(width: 8, height: 8)
        case .reached, .terminal:
            let isTerminal = stage(index) == .terminal
            let color = isTerminal ? terminalColor : accent
            Circle()
                .fill(color)
                .frame(width: isTerminal ? 14 : 10, height: isTerminal ? 14 : 10)
                .background {
                    if isTerminal {
                        Circle().fill(color.opacity(0.22)).padding(-3)
                    }
                }
                .scaleEffect(isShown ? 1 : 0.35)
                .opacity(isShown ? 1 : 0)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.3).delay(timing.pipDelay(index)), value: isShown)
        }
    }
}

private struct RoundBoundsKey: PreferenceKey {
    static var defaultValue: [Int: Anchor<CGRect>] { [:] }

    static func reduce(value: inout [Int: Anchor<CGRect>], nextValue: () -> [Int: Anchor<CGRect>]) {
        value.merge(nextValue()) { $1 }
    }
}

private struct PostseasonRoundCard: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let round: PostseasonRound
    let season: Int
    let seed: Int
    let stage: PostseasonRoundStage
    let accent: Color
    let terminalColor: Color
    let isShown: Bool
    let timing: PostseasonLadderTiming
    let index: Int

    /// An absent Wild Card game for a bye-earning seed is the bye, not an unreached round.
    private var isBye: Bool {
        round.kind == .wildCard && round.game == nil && earnsFirstRoundBye(seed: seed, season: season)
    }

    /// Only rounds with something to land rise in; empty future rounds are already there.
    private var entersWithMotion: Bool { round.game != nil || isBye }

    private var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, minHeight: 78, alignment: .leading)
            .padding(.horizontal, 14)
            .background(isEmptyRound ? DesignTokens.Colors.surfaceCard2 : DesignTokens.Colors.surfaceCard, in: cardShape)
            .overlay(alignment: .bottom) {
                if stage == .terminal {
                    Rectangle()
                        .fill(terminalColor)
                        .frame(height: 3)
                        .scaleEffect(x: isShown ? 1 : 0, y: 1, anchor: .leading)
                        .animation(
                            reduceMotion ? nil : .timingCurve(0.4, 0, 0.2, 1, duration: 0.5).delay(timing.sweepDelay),
                            value: isShown
                        )
                }
            }
            .clipShape(cardShape)
            .overlay {
                if isBye {
                    cardShape.strokeBorder(DesignTokens.Colors.borderInput, style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                } else {
                    cardShape.strokeBorder(
                        isEmptyRound ? DesignTokens.Colors.borderSubtle : DesignTokens.Colors.borderDefault,
                        lineWidth: 1
                    )
                }
            }
            .opacity(entersWithMotion && !isShown ? 0 : 1)
            .offset(y: entersWithMotion && !isShown ? 10 : 0)
            .animation(
                reduceMotion || !entersWithMotion ? nil : .easeOut(duration: 0.35).delay(timing.cardDelay(index)),
                value: isShown
            )
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("schedule-playoffs-\(round.kind.rawValue)")
    }

    private var isEmptyRound: Bool { round.game == nil }

    @ViewBuilder
    private var content: some View {
        if isBye {
            HStack {
                roundTitle
                Spacer()
                Text("FIRST-ROUND BYE")
                    .font(.caption2.bold())
                    .foregroundStyle(accent)
            }
        } else if let game = round.game {
            HStack(spacing: DesignTokens.Spacing.sm) {
                VStack(alignment: .leading, spacing: 5) {
                    roundTitle
                    if let opponent = game.opponent {
                        HStack(spacing: 6) {
                            TeamIconView(team: opponent, size: 22)
                            Text(verbatim: game.isHome ? "vs \(opponent.abbrev)" : "at \(opponent.abbrev)")
                                .font(.subheadline.weight(.heavy))
                        }
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xs) {
                    Text(verbatim: scoreLabel(game))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(resultColor(game.result))
                    Text(verbatim: dateLabel(game))
                        .font(.caption2.bold())
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
            }
        } else {
            roundTitle
        }
    }

    private var roundTitle: some View {
        Text(verbatim: round.kind.title(season: season))
            .font(.caption2.bold())
            .tracking(0.8)
            .foregroundStyle(titleColor)
    }

    private var titleColor: Color {
        switch stage {
        case .terminal: terminalColor
        case .reached: DesignTokens.Colors.textMuted
        case .unreached: isEmptyRound && !isBye ? DesignTokens.Colors.textFaintest : DesignTokens.Colors.textMuted
        }
    }

    private func resultColor(_ result: ScheduleResult?) -> Color {
        switch result {
        case .win: DesignTokens.Colors.statusWin
        case .loss: DesignTokens.Colors.statusInjured
        case .tie, nil: DesignTokens.Colors.textMuted
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
