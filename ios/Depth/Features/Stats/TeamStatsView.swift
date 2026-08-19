import SwiftUI

// Native round-4 Stats page — a literal port of the mobile-visible portion of web's
// `components/TeamStatsView.tsx`: season-chips row, team name block, hero record,
// HOME/ROAD · DIV/CONF · PTS FOR/PTS AGAINST · DIFF breakdown, footer ticker, degraded
// upcoming-season hero, and the NEXT GAME card. Renders entirely from the cached
// `TeamStatsPage` plus the derived next game; season selection is local state with no
// refetch. Owns a feature-local `TeamStatsViewModel` and loads lazily on first visit.
struct TeamStatsView: View {
    @State private var viewModel: TeamStatsViewModel
    @State private var showSeasonPicker = false
    /// DEP-278 follow-up: Stats fetches no uniform data of its own (lightweight read,
    /// invariant 5), so it reads the kit-resolved accent TeamDetailView publishes here
    /// instead — same store the tab tint and Schedule read.
    private let currentTeamStore: CurrentTeamStore

    init(teamId: String, repository: DepthRepository, currentTeamStore: CurrentTeamStore) {
        _viewModel = State(initialValue: TeamStatsViewModel(teamId: teamId, repository: repository))
        self.currentTeamStore = currentTeamStore
    }

    var body: some View {
        content
            // DEP-236: the roster and schedule pages paint no explicit background, so they
            // render on the system dark bg (pure black under the app's forced dark scheme);
            // the stats page must match, or it reads as a slightly-navy island between the
            // other two pages. No explicit background here = the same surface they use.
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
            .sheet(isPresented: $showSeasonPicker) {
                if let selectedSeason = viewModel.selectedSeason, let currentSeason = viewModel.currentSeason {
                    SeasonPickerSheet(
                        items: seasonPickerItems,
                        selectedSeason: selectedSeason,
                        currentSeason: currentSeason,
                        accent: uiAccent,
                        identifierPrefix: "stats"
                    ) { season in
                        showSeasonPicker = false
                        viewModel.selectSeason(season)
                    }
                }
            }
    }

    /// The accent that drives chips, DIFF (positive), and the next-game card border.
    /// `currentTeamStore` carries the kit-resolved color once TeamDetailView publishes
    /// it (DEP-278 follow-up, web parity: `useKitColors`); falls back to this page's
    /// own team read while that hasn't happened yet (e.g. Stats opened before the
    /// roster page's snapshot has loaded for this team).
    private var uiAccent: Color {
        if let hex = currentTeamStore.uiAccent {
            return Color(hex: hex)
        }
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
                    seasonPickerTrigger
                        // DEP-236: the roster and schedule pages start their content 16pt
                        // below the scroll top (`.padding(.vertical)` / `.padding()`);
                        // this page's first element is the trigger row, so it needs the
                        // same 16pt inset or it sits flush against the page switcher above.
                        .padding(.top, 16)
                    // A season-state line, shown only while a past season is selected —
                    // the trigger button alone doesn't make clear you're off the current
                    // season. "Back to current" itself now lives in the sheet's toolbar
                    // (SeasonPickerSheet), reachable from any scroll position in the long
                    // 1999→present list, rather than a second on-page button here.
                    if viewModel.isViewingPastSeason, let year = viewModel.selectedSeason {
                        Text(verbatim: "\(year) season")
                            .font(.headline)
                            .accessibilityIdentifier("stats-season-state")
                            .padding(.horizontal, DesignTokens.Spacing.md)
                            .padding(.top, DesignTokens.Spacing.sm)
                    }
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
            }
            .scrollIndicators(.hidden)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("stats-content")
        }
    }

    /// Opens the season-picker sheet. Replaced the old horizontally-scrolling chip row —
    /// that pattern stopped scaling once team_stats ingest landed seasons back to 1999
    /// (~25+ entries no longer fit a swipeable strip).
    private var seasonPickerTrigger: some View {
        SeasonPickerTrigger(
            season: viewModel.selectedSeason,
            accent: uiAccent,
            identifier: "stats-season-trigger"
        ) {
            showSeasonPicker = true
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
    }

    private var seasonPickerItems: [SeasonPickerItem] {
        var items: [SeasonPickerItem] = []
        if viewModel.hasUpcomingChip, let upcoming = viewModel.upcomingSeason {
            items.append(SeasonPickerItem(season: upcoming, isUpcoming: true))
        }
        items += viewModel.seasons.map { stats in
            SeasonPickerItem(
                season: stats.season,
                isUpcoming: viewModel.upcomingSeasonHasRealRow && stats.season == viewModel.upcomingSeason
            )
        }
        return items
    }

    private func teamNameBlock(_ team: Team) -> some View {
        StatsEyebrow(text: "\(team.city.uppercased()) \(team.name.uppercased())")
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.md)
    }

    /// Shared "hero section" container (DEP-265): horizontal inset + bottom hairline +
    /// fixed bottom spacing, used by both `heroRecord` and `degradedUpcomingHero` — they
    /// used to repeat this chrome and had drifted (bottom padding 18 vs 22, borderInput
    /// vs a wider inset). One container, one value, applied to both.
    private func heroSection(@ViewBuilder content: () -> some View) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.bottom, DesignTokens.Spacing.lg)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(DesignTokens.Colors.borderInput)
                    .frame(height: 1)
                    .padding(.horizontal, DesignTokens.Spacing.md)
            }
    }

    /// Web's hero record (lines 413-443). Phase-1 has no streak/ranks/playoff-seed data,
    /// so the right column of the web hero is absent and the record stands alone.
    private func heroRecord(_ stats: TeamSeasonStats) -> some View {
        heroSection {
            Text(verbatim: record(stats))
                .font(.largeTitle.bold())
                .accessibilityIdentifier("stats-record")
                .padding(.top, DesignTokens.Spacing.sm)
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
            // DEP-265: DIFF has no right-hand stat, so it runs through the same
            // statRow/statCell two-column path (right: nil) instead of a hand-rolled
            // phantom-spacer HStack.
            statRow(
                left: ("DIFF", diffLabel(stats.pointDifferential)),
                right: nil,
                leftColor: diffColor(stats.pointDifferential)
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.sm)
    }

    private func statRow(
        left: (label: String, value: String),
        right: (label: String, value: String)?,
        leftColor: Color = DesignTokens.Colors.textPrimary,
        rightColor: Color = DesignTokens.Colors.textPrimary
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.lg) {
            statCell(label: left.label, value: left.value, valueColor: leftColor)
            if let right {
                statCell(label: right.label, value: right.value, valueColor: rightColor)
            } else {
                Color.clear
            }
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
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private func hairline(_ color: Color) -> some View {
        Rectangle().fill(color).frame(height: 1)
    }

    /// Web's footer ticker (lines 519-524): `"{season} SEASON · {games} GAMES PLAYED"`.
    private func footerTicker(_ stats: TeamSeasonStats) -> some View {
        let games = stats.overallWins + stats.overallLosses + stats.overallTies
        return StatsEyebrow(text: "\(stats.season) SEASON · \(games) GAMES PLAYED")
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.md)
            .padding(.bottom, DesignTokens.Spacing.lg)
            .accessibilityIdentifier("stats-games-played")
    }

    /// Web's degraded upcoming-season hero (lines 526-534): a real chip exists but no
    /// games are played yet, so degrade instead of faking a 0-0 record (invariant 6).
    private func degradedUpcomingHero(_ upcoming: Int) -> some View {
        heroSection {
            VStack(alignment: .leading, spacing: 0) {
                Text(verbatim: "\(upcoming) season upcoming")
                    .font(.title.bold())
                    .padding(.top, DesignTokens.Spacing.sm)
                    .padding(.bottom, DesignTokens.Spacing.xs)
                Text("No games played yet this season")
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                Text(verbatim: "\(upcoming) SEASON · NOT YET STARTED")
                    .font(.caption2)
                    .tracking(0.6)
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
                    .padding(.top, DesignTokens.Spacing.md)
            }
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

    /// DEP-264: matches ScheduleGameCard's win/loss/tie colors — a positive DIFF is the
    /// same `statusWin` green as a schedule-card win, not the team accent.
    private func diffColor(_ diff: Int) -> Color {
        diff > 0
            ? DesignTokens.Colors.statusWin
            : diff < 0 ? DesignTokens.Colors.statusInjured : DesignTokens.Colors.textMuted
    }
}

/// DEP-265: the one eyebrow style shared by the team-name block, the NEXT GAME card, and
/// the footer ticker — caption2.bold, tracking 0.8, textMuted.
private struct StatsEyebrow: View {
    let text: String

    var body: some View {
        Text(verbatim: text)
            .font(.caption2.bold())
            .tracking(0.8)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }
}

/// Web's NEXT GAME card (lines 545-578): `depthCard()` fill/radius with an added
/// accent-tinted border overlay (web parity — a plain `depthCard()` alone would drop the
/// "this card is special" cue), the week/opponent/date line on the left and an
/// opponent-abbrev color tile on the right.
private struct NextGameCard: View {
    let game: ScheduleGame
    let accent: Color

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                StatsEyebrow(text: "NEXT GAME · WEEK \(game.week)")
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
                // Team icon (logo) instead of the plain color square; the abbrev tile
                // remains the fallback for a team with no logo URL.
                if (opponent.logoDark ?? opponent.logo) != nil {
                    // DEP-264: TeamIconView's default size (28), matching the schedule
                    // game card's opponent icon.
                    TeamIconView(team: opponent)
                } else {
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
        }
        .depthCard()
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .strokeBorder(accent.opacity(0.20), lineWidth: 1)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.md)
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