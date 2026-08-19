import SwiftUI

// Native schedule destination. The view owns only its feature-local observable state;
// every public read remains behind DepthRepository. A grid adapts to Dynamic Type and
// screen width instead of relying on fixed card geometry. When `isEmbedded` (round-4
// page switcher), the pushed-destination chrome is suppressed: the shared nav bar keeps
// the team identity, and the view renders as just the content column.
struct ScheduleView: View {
    @State private var viewModel: ScheduleViewModel
    @State private var showSeasonPicker = false
    private let isEmbedded: Bool

    init(teamId: String, repository: DepthRepository, isEmbedded: Bool = false) {
        _viewModel = State(initialValue: ScheduleViewModel(teamId: teamId, repository: repository))
        self.isEmbedded = isEmbedded
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
                    currentSeason: defaultSeason,
                    accent: DesignTokens.Colors.accent,
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
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 144, maximum: 260), spacing: DesignTokens.Spacing.sm)],
                    spacing: DesignTokens.Spacing.sm
                ) {
                    ForEach(schedule.games) { game in
                        ScheduleGameCard(game: game, isPastSeason: viewModel.isPastSeason)
                    }
                }
            }
            .padding()
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("schedule-content")
        }
        .scrollIndicators(.hidden)
    }

    private var seasonPicker: some View {
        Button {
            showSeasonPicker = true
        } label: {
            HStack(spacing: 4) {
                Text(viewModel.selectedSeason.map { "\($0) SEASON" } ?? "SEASON")
                    .font(.caption.bold())
                    .tracking(0.1)
                Image(systemName: "chevron.down")
                    .font(.caption2.bold())
            }
            .foregroundStyle(DesignTokens.Colors.textFaint)
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier("schedule-season-trigger")
    }
}

private struct ScheduleGameCard: View {
    let game: ScheduleGame
    let isPastSeason: Bool

    var body: some View {
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
