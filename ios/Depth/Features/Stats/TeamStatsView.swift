import SwiftUI

// Native round-4 Stats page — a literal port of the mobile-visible portion of web's
// `components/TeamStatsView.tsx`: season-chips row, team name block, hero record,
// HOME/ROAD · DIV/CONF · PTS FOR/PTS AGAINST · DIFF breakdown, footer ticker, degraded
// upcoming-season hero, and the NEXT GAME card. Renders entirely from the cached
// `TeamStatsPage` plus the derived next game; season selection is local state with no
// refetch. Owns a feature-local `TeamStatsViewModel` and loads lazily on first visit.
struct TeamStatsView: View {
    @State private var viewModel: TeamStatsViewModel

    init(teamId: String, repository: DepthRepository) {
        _viewModel = State(initialValue: TeamStatsViewModel(teamId: teamId, repository: repository))
    }

    var body: some View {
        content
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
    }

    /// The accent that drives chips, DIFF, and the next-game card border. Web uses the
    /// active kit's `uiAccent` (useKitColors); native's Stats page doesn't know the
    /// uniform selection, so it falls back to the team's curated `uiAccent` — the same
    /// value web uses when no kit has been picked this session.
    private var uiAccent: Color {
        guard let page = viewModel.page else { return DesignTokens.Colors.accent }
        return Color(hex: page.team.colors.uiAccent)
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            ProgressView("Loading stats…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityIdentifier("stats-loading")

        case .loaded:
            if let page = viewModel.page {
                statsContent(page)
            }

        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load stats", systemImage: "wifi.slash")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("stats-retry")
            }
            .accessibilityIdentifier("stats-error")
        }
    }

    @ViewBuilder
    private func statsContent(_ page: TeamStatsPage) -> some View {
        if page.seasons.isEmpty && page.upcomingSeason == nil {
            // Web's "No stats available for this team yet." (lines 227-238) — an unknown
            // team or one with no ingested seasons and no off-season chip.
            ContentUnavailableView {
                Label("No Stats", systemImage: "chart.bar")
            } description: {
                Text("No stats available for this team yet.")
            }
            .accessibilityIdentifier("stats-empty")
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    seasonChipsRow
                    teamNameBlock(page.team)
                    if let active = viewModel.selectedSeasonStats {
                        heroRecord(active)
                        breakdownTable(active)
                        footerTicker(active)
                    } else if let upcoming = viewModel.upcomingSeason {
                        degradedUpcomingHero(upcoming)
                    }
                    if viewModel.isViewingCurrentOrUpcomingSeason, let nextGame = viewModel.nextGame {
                        NextGameCard(game: nextGame, accent: uiAccent)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DesignTokens.Colors.bg)
            }
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("stats-content")
        }
    }

    /// Web's season switcher (lines 338-397): real rows reversed back to ascending
    /// display order, newest first on the right; the current-season chip carries the
    /// accent "latest" dot (unless a real upcoming row carries the UPCOMING badge
    /// instead); the synthetic upcoming chip renders dashed during the off-season.
    private var seasonChipsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(viewModel.seasons.reversed(), id: \.season) { stats in
                    let isSelected = stats.season == viewModel.selectedSeason
                    let isLatest = stats.season == viewModel.seasons.first?.season
                    let isUpcomingRow = viewModel.upcomingSeasonHasRealRow
                        && stats.season == viewModel.upcomingSeason
                    SeasonChip(
                        label: String(stats.season),
                        isSelected: isSelected,
                        accent: uiAccent,
                        leading: isLatest && !isUpcomingRow ? .latestDot : nil,
                        trailing: isUpcomingRow ? .upcomingBadge : nil
                    ) {
                        viewModel.selectSeason(stats.season)
                    }
                    .accessibilityIdentifier("stats-season-\(stats.season)")
                }
                if viewModel.hasUpcomingChip, let upcoming = viewModel.upcomingSeason {
                    SeasonChip(
                        label: String(upcoming),
                        isSelected: upcoming == viewModel.selectedSeason,
                        accent: uiAccent,
                        leading: nil,
                        trailing: .upcomingBadge,
                        dashed: true
                    ) {
                        viewModel.selectSeason(upcoming)
                    }
                    .accessibilityIdentifier("stats-season-\(upcoming)")
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 10)
        }
        .background(DesignTokens.Colors.bgFilterbar)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderStrong).frame(height: 1)
        }
    }

    private func teamNameBlock(_ team: Team) -> some View {
        Text(verbatim: "\(team.city.uppercased()) \(team.name.uppercased())")
            .font(.caption.weight(.bold))
            .tracking(1)
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .padding(.horizontal, 20)
            .padding(.top, 18)
    }

    /// Web's hero record (lines 413-443). Phase-1 has no streak/ranks/playoff-seed data,
    /// so the right column of the web hero is absent and the record stands alone.
    private func heroRecord(_ stats: TeamSeasonStats) -> some View {
        Text(verbatim: record(stats))
            .font(.largeTitle.bold())
            .accessibilityIdentifier("stats-record")
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 18)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(DesignTokens.Colors.borderInput)
                    .frame(height: 1)
                    .padding(.horizontal, 20)
            }
    }

    /// Web's breakdown table (lines 446-517): HOME/ROAD · DIV/CONF · PTS FOR/PTS AGAINST
    /// · DIFF, with strong hairlines between the first three rows. DIFF is accent when
    /// positive, `statusInjured` when negative, muted at zero (web lines 323).
    private func breakdownTable(_ stats: TeamSeasonStats) -> some View {
        VStack(spacing: 0) {
            statRow(left: ("HOME", record(stats.homeWins, stats.homeLosses)), right: ("ROAD", record(stats.roadWins, stats.roadLosses)))
            hairline(DesignTokens.Colors.borderStrong)
            statRow(left: ("DIV", record(stats.divisionWins, stats.divisionLosses)), right: ("CONF", record(stats.conferenceWins, stats.conferenceLosses)))
            hairline(DesignTokens.Colors.borderStrong)
            statRow(left: ("PTS FOR", String(stats.pointsFor)), right: ("PTS AGAINST", String(stats.pointsAgainst)))
            hairline(DesignTokens.Colors.borderStrong)
            HStack {
                statCell(label: "DIFF", value: diffLabel(stats.pointDifferential), valueColor: diffColor(stats.pointDifferential))
                Color.clear.frame(width: 24)
                Color.clear
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
    }

    private func statRow(left: (label: String, value: String), right: (label: String, value: String)) -> some View {
        HStack(spacing: 24) {
            statCell(label: left.label, value: left.value)
            statCell(label: right.label, value: right.value)
        }
    }

    private func statCell(label: String, value: String, valueColor: Color = DesignTokens.Colors.textPrimary) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Spacer(minLength: 4)
            Text(value)
                .font(.caption.bold())
                .foregroundStyle(valueColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
    }

    private func hairline(_ color: Color) -> some View {
        Rectangle().fill(color).frame(height: 1)
    }

    /// Web's footer ticker (lines 519-524): `"{season} SEASON · {games} GAMES PLAYED"`.
    private func footerTicker(_ stats: TeamSeasonStats) -> some View {
        let games = stats.overallWins + stats.overallLosses + stats.overallTies
        return Text(verbatim: "\(stats.season) SEASON · \(games) GAMES PLAYED")
            .font(.caption2)
            .tracking(0.6)
            .foregroundStyle(DesignTokens.Colors.textFaintest)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.top, 14)
            .padding(.bottom, 22)
            .accessibilityIdentifier("stats-games-played")
    }

    /// Web's degraded upcoming-season hero (lines 526-534): a real chip exists but no
    /// games are played yet, so degrade instead of faking a 0-0 record (invariant 6).
    private func degradedUpcomingHero(_ upcoming: Int) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(verbatim: "\(upcoming) season upcoming")
                .font(.title.bold())
                .padding(.top, 8)
                .padding(.bottom, 4)
            Text("No games played yet this season")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Text(verbatim: "\(upcoming) SEASON · NOT YET STARTED")
                .font(.caption2)
                .tracking(0.6)
                .foregroundStyle(DesignTokens.Colors.textFaintest)
                .padding(.top, 14)
                .padding(.bottom, 22)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(DesignTokens.Colors.borderInput)
                .frame(height: 1)
                .padding(.horizontal, 20)
        }
    }

    private func record(_ stats: TeamSeasonStats) -> String {
        if stats.overallTies != 0 {
            return "\(stats.overallWins)-\(stats.overallLosses)-\(stats.overallTies)"
        }
        return "\(stats.overallWins)-\(stats.overallLosses)"
    }

    private func record(_ wins: Int, _ losses: Int) -> String {
        "\(wins)-\(losses)"
    }

    private func diffLabel(_ diff: Int) -> String {
        diff > 0 ? "+\(diff)" : String(diff)
    }

    private func diffColor(_ diff: Int) -> Color {
        diff > 0 ? uiAccent : diff < 0 ? DesignTokens.Colors.statusInjured : DesignTokens.Colors.textMuted
    }
}

/// A single season switcher chip (web lines 354-373 real rows, 381-396 synthetic chip).
/// `leading`/`trailing` are the optional latest-dot and UPCOMING badge decorations.
private struct SeasonChip: View {
    enum Decoration {
        case latestDot
        case upcomingBadge
    }

    let label: String
    let isSelected: Bool
    let accent: Color
    let leading: Decoration?
    let trailing: Decoration?
    var dashed: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if leading == .latestDot {
                    Circle()
                        .fill(isSelected ? DesignTokens.Colors.bg : accent)
                        .frame(width: 6, height: 6)
                }
                Text(label)
                    .font(.caption.bold())
                if trailing == .upcomingBadge {
                    UpcomingBadge(isSelected: isSelected, accent: accent)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? accent : Color.clear, in: RoundedRectangle(cornerRadius: 3))
            .overlay {
                RoundedRectangle(cornerRadius: 3)
                    .strokeBorder(
                        isSelected ? accent : DesignTokens.Colors.borderInput,
                        style: StrokeStyle(lineWidth: 1, dash: dashed ? [3] : [])
                    )
            }
            .foregroundStyle(isSelected ? DesignTokens.Colors.bg : DesignTokens.Colors.textMuted)
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
    }
}

/// Web's `UpcomingBadge` (lines 73-85) — selected inverts to the app bg with a `bg55`
/// border; unselected is accent text on `accent1a` with an `accent55` border.
private struct UpcomingBadge: View {
    let isSelected: Bool
    let accent: Color

    var body: some View {
        Text("UPCOMING")
            .font(.caption2.bold())
            .tracking(0.4)
            .padding(.horizontal, 6)
            .padding(.vertical, 1)
            .foregroundStyle(isSelected ? DesignTokens.Colors.bg : accent)
            .background(isSelected ? DesignTokens.Colors.bg.opacity(0.33) : accent.opacity(0.10))
            .overlay {
                Capsule().strokeBorder(isSelected ? DesignTokens.Colors.bg.opacity(0.55) : accent.opacity(0.55), lineWidth: 1)
            }
    }
}

/// Web's NEXT GAME card (lines 545-578): `surfaceRaised` fill, `accent33` border, the
/// week/opponent/date line on the left and an opponent-abbrev color tile on the right.
private struct NextGameCard: View {
    let game: ScheduleGame
    let accent: Color

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(verbatim: "NEXT GAME · WEEK \(game.week)")
                    .font(.caption2.bold())
                    .tracking(0.8)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                HStack(spacing: 4) {
                    Text(verbatim: opponentLabel)
                        .font(.subheadline.weight(.heavy))
                    if let date = formattedDate {
                        Text(verbatim: "· \(date)")
                            .font(.subheadline.weight(.heavy))
                    }
                }
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            }
            Spacer()
            if let opponent = game.opponent {
                Text(opponent.abbrev.uppercased())
                    .font(.caption2.weight(.black))
                    .foregroundStyle(Color(hex: readableTextOn(opponent.colors.primary)))
                    .frame(width: 28, height: 28)
                    .background(Color(hex: opponent.colors.primary))
                    .overlay {
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(Color(hex: opponent.colors.secondary), lineWidth: 1)
                    }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(DesignTokens.Colors.surfaceRaised, in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).strokeBorder(accent.opacity(0.20), lineWidth: 1)
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .accessibilityIdentifier("stats-next-game")
    }

    private var opponentLabel: String {
        guard let opponent = game.opponent else { return "" }
        return game.isHome ? "vs \(opponent.abbrev)" : "@ \(opponent.abbrev)"
    }

    private var formattedDate: String? {
        guard let date = game.date, let parsed = Self.inputFormatter.date(from: date) else {
            return nil
        }
        return parsed.formatted(.dateTime.month(.abbreviated).day())
    }

    private static let inputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}