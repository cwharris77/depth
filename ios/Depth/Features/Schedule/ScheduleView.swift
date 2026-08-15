import SwiftUI

// Native schedule destination. The view owns only its feature-local observable state;
// every public read remains behind DepthRepository. A grid adapts to Dynamic Type and
// screen width instead of relying on fixed card geometry.
struct ScheduleView: View {
    @State private var viewModel: ScheduleViewModel

    init(teamId: String, repository: DepthRepository) {
        _viewModel = State(initialValue: ScheduleViewModel(teamId: teamId, repository: repository))
    }

    var body: some View {
        content
            .navigationTitle("Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
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
                    columns: [GridItem(.adaptive(minimum: 144, maximum: 260), spacing: 12)],
                    spacing: 12
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
    }

    private var seasonPicker: some View {
        Picker(
            "Season",
            selection: Binding(
                get: { viewModel.selectedSeason ?? TeamSchedule.earliestSeason },
                set: { season in Task { await viewModel.selectSeason(season) } }
            )
        ) {
            ForEach(viewModel.seasonOptions, id: \.self) { season in
                Text(verbatim: "\(season)").tag(season)
            }
        }
        .pickerStyle(.menu)
        .frame(minHeight: 44)
        .accessibilityIdentifier("schedule-season-picker")
    }
}

private struct ScheduleGameCard: View {
    let game: ScheduleGame
    let isPastSeason: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Week \(game.week)")
                .font(.headline)

            if game.isBye {
                Text("BYE")
                    .font(.title3.bold())
                    .foregroundStyle(.secondary)
            } else {
                Text(opponentLabel)
                    .font(.title3.bold())
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                Text(game.isHome ? "HOME" : "AWAY")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)

                Text(detailLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(resultColor)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
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
        case .win: .green
        case .loss: .red
        case .tie: .orange
        case nil: .secondary
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
