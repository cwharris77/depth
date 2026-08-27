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
                if let selectedSeason = viewModel.selectedSeason {
                    SeasonPickerSheet(
                        items: seasonPickerItems,
                        selectedSeason: selectedSeason,
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
                    teamNameBlock(page.team, coach: viewModel.selectedSeasonStats?.coach)
                    if let active = viewModel.selectedSeasonStats {
                        heroRecord(active)
                        breakdownTable(active)
                    } else if let upcoming = viewModel.upcomingSeason {
                        degradedUpcomingHero(upcoming)
                    }
                    if viewModel.isViewingCurrentOrUpcomingSeason, let nextGame = viewModel.nextGame {
                        NextGameCard(game: nextGame, accent: uiAccent)
                    }
                    if let active = viewModel.selectedSeasonStats {
                        metricSections(active)
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
            identifier: "stats-season-trigger",
            isHistorical: viewModel.isViewingPastSeason,
            onBackToCurrent: viewModel.backToCurrentSeason
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

    /// Web parity: the eyebrow and the season-scoped coach are one block above the hero
    /// record, not a labelled section further down the page.
    private func teamNameBlock(_ team: Team, coach: TeamSeasonCoach?) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            StatsEyebrow(text: "\(team.city.uppercased()) \(team.name.uppercased())")
            if let coach {
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: coach.name)
                        .font(.title3.weight(.heavy))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text(verbatim: "HEAD COACH · \(ordinal(coach.experience).uppercased()) SEASON")
                        .font(.caption.bold())
                        .tracking(0.6)
                        .foregroundStyle(uiAccent)
                }
                .padding(.top, 11)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("stats-coach")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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

    /// Web's hero record: the record at display size with streak, league rank, and
    /// playoff seed stacked to its right. The playoff line is suppressed for a season
    /// that has not finished — `playoffSeed` is 0 for a team that missed, so rendering it
    /// mid-season would falsely claim they already had.
    private func heroRecord(_ stats: TeamSeasonStats) -> some View {
        heroSection {
            HStack(alignment: .firstTextBaseline) {
                Text(verbatim: record(stats))
                    .font(.largeTitle.bold())
                    .accessibilityIdentifier("stats-record")
                Spacer(minLength: DesignTokens.Spacing.md)
                VStack(alignment: .trailing, spacing: 1) {
                    if let streak = stats.streak, !streak.isEmpty {
                        Text(verbatim: streak)
                            .font(.footnote.bold())
                            .foregroundStyle(uiAccent)
                    }
                    if let caption = teamStatsRankLabel(
                        ranks(for: stats)?.winPercent, lastRank: leagueSize, qualifier: .overall
                    ) {
                        Text(verbatim: caption)
                            .font(.caption.bold())
                            .foregroundStyle(DesignTokens.Colors.textMuted)
                    }
                    if let current = viewModel.currentSeason, stats.season < current, let team = viewModel.page?.team {
                        Text(verbatim: playoffLine(stats, conference: team.conference))
                            .font(.caption)
                            .foregroundStyle(DesignTokens.Colors.textFaint)
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("stats-hero-meta")
            }
            .padding(.top, DesignTokens.Spacing.sm)
        }
    }

    private func playoffLine(_ stats: TeamSeasonStats, conference: String) -> String {
        guard let seed = stats.playoffSeed, seed > 0 else {
            return "MISSED PLAYOFFS · \(conference)"
        }
        return "SEED \(seed) · \(conference)"
    }

    /// This team's ranks for a season. Absent until the league-wide read resolves, and
    /// absent for a season with no games played — a rank off an empty record is noise.
    private func ranks(for stats: TeamSeasonStats) -> TeamStatsRanks? {
        let played = stats.overallWins + stats.overallLosses + stats.overallTies
        guard played > 0 else { return nil }
        return viewModel.page?.leagueRanksBySeason[stats.season]
    }

    /// League size, so a last-place rank reads "Last in NFL" rather than "32nd most".
    /// Web passes `teams.length` here; this page never loads the full team list, and the
    /// NFL has been 32 teams since 2002 — the earliest season team_stats carries.
    private var leagueSize: Int { 32 }

    /// Web's breakdown table (lines 446-517): HOME/ROAD · DIV/CONF · PTS FOR/PTS AGAINST
    /// · DIFF, with strong hairlines between the first three rows. DIFF is accent when
    /// positive, `statusInjured` when negative, muted at zero (web lines 323).
    private func breakdownTable(_ stats: TeamSeasonStats) -> some View {
        let r = ranks(for: stats)
        let metrics = stats.matchupMetrics
        return VStack(spacing: 0) {
            statRow(
                left: StatCellSpec("HOME", record(stats.homeWins, stats.homeLosses)),
                right: StatCellSpec("ROAD", record(stats.roadWins, stats.roadLosses))
            )
            hairline(DesignTokens.Colors.borderStrong)
            statRow(
                left: StatCellSpec("DIV", record(stats.divisionWins, stats.divisionLosses)),
                right: StatCellSpec("CONF", record(stats.conferenceWins, stats.conferenceLosses))
            )
            hairline(DesignTokens.Colors.borderStrong)
            statRow(
                left: StatCellSpec(
                    "PTS FOR", String(stats.pointsFor),
                    rank: teamStatsRankLabel(r?.pointsFor, lastRank: leagueSize, qualifier: .most)
                ),
                right: StatCellSpec(
                    "PTS AGAINST", String(stats.pointsAgainst),
                    rank: teamStatsRankLabel(r?.pointsAgainst, lastRank: leagueSize, qualifier: .least)
                )
            )
            hairline(DesignTokens.Colors.borderStrong)
            // Turnover margin is a team-level signed number like DIFF, not a unit metric,
            // so it sits beside it rather than under a section heading — and this cell was
            // previously empty. Absent when the season has no nflverse row.
            statRow(
                left: StatCellSpec(
                    "DIFF", diffLabel(stats.pointDifferential),
                    color: diffColor(stats.pointDifferential),
                    rank: teamStatsRankLabel(r?.pointDifferential, lastRank: leagueSize, qualifier: .most)
                ),
                right: metrics?.turnoverMargin.map { margin in
                    StatCellSpec(
                        "TO MARGIN", diffLabel(margin), color: diffColor(margin),
                        rank: showMetricRanks(stats)
                            ? teamStatsRankLabel(r?.turnoverMargin, lastRank: leagueSize, qualifier: .most)
                            : nil
                    )
                }
            )
            // The nflverse yardage pair, behind its own lighter rule the way web separates
            // it from the ESPN standings rows above. Present when either half is.
            if stats.passingYards != nil || stats.rushingYards != nil {
                hairline(DesignTokens.Colors.borderInput)
                statRow(
                    left: stats.passingYards.map {
                        StatCellSpec(
                            "PASS YDS", String($0),
                            rank: teamStatsRankLabel(r?.passingYards, lastRank: leagueSize, qualifier: .most)
                        )
                    },
                    right: stats.rushingYards.map {
                        StatCellSpec(
                            "RUSH YDS", String($0),
                            rank: teamStatsRankLabel(r?.rushingYards, lastRank: leagueSize, qualifier: .most)
                        )
                    }
                )
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.sm)
    }

    /// Below a two-game sample the values still show but nothing is ranked — a league
    /// position off one game is noise presented as fact (Compare's `isThinSample`).
    private func showMetricRanks(_ stats: TeamSeasonStats) -> Bool {
        stats.overallWins + stats.overallLosses + stats.overallTies > 1
    }

    /// One label/value pair in the breakdown table or a metric section. `rank` is the
    /// caption beneath the value — the league position that, on a single-team page,
    /// replaces Compare's second team column. Nil renders no caption rather than a dash.
    private struct StatCellSpec {
        let label: String
        let value: String
        var color: Color = DesignTokens.Colors.textPrimary
        var rank: String?

        init(_ label: String, _ value: String, color: Color = DesignTokens.Colors.textPrimary, rank: String? = nil) {
            self.label = label
            self.value = value
            self.color = color
            self.rank = rank
        }
    }

    /// A two-column row. A nil side leaves its half blank — the DIFF row has done this
    /// since DEP-265, and an odd-length metric group now does the same.
    private func statRow(left: StatCellSpec?, right: StatCellSpec?) -> some View {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.lg) {
            if let left { statCell(left) } else { Color.clear }
            if let right { statCell(right) } else { Color.clear }
        }
    }

    private func statCell(_ spec: StatCellSpec) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(spec.label)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 2) {
                Text(spec.value)
                    .font(.caption.bold())
                    .foregroundStyle(spec.color)
                if let rank = spec.rank {
                    Text(rank)
                        .font(.caption2.bold())
                        .foregroundStyle(DesignTokens.Colors.textFaintest)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .accessibilityElement(children: .combine)
    }

    private func hairline(_ color: Color) -> some View {
        Rectangle().fill(color).frame(height: 1)
    }

    /// The nflverse metrics, grouped by unit, in the breakdown table's own vocabulary —
    /// same statCell, same hairline, same inset, no card chrome. The catalog drops
    /// metrics whose source column is missing before they are paired into rows, so a gap
    /// closes rather than leaving a hole; a group left with nothing renders no heading.
    @ViewBuilder
    private func metricSections(_ stats: TeamSeasonStats) -> some View {
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: stats.matchupMetrics,
            ranks: ranks(for: stats),
            lastRank: leagueSize,
            showRanks: showMetricRanks(stats)
        )
        ForEach(groups) { group in
            VStack(alignment: .leading, spacing: 0) {
                Text(group.title)
                    .font(.caption.weight(.semibold))
                    .tracking(1.2)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .padding(.bottom, DesignTokens.Spacing.xs)
                ForEach(Array(metricRows(group.metrics).enumerated()), id: \.offset) { index, pair in
                    if index > 0 { hairline(DesignTokens.Colors.borderStrong) }
                    statRow(
                        left: StatCellSpec(pair.0.label, pair.0.display, rank: pair.0.rankCaption),
                        right: pair.1.map { StatCellSpec($0.label, $0.display, rank: $0.rankCaption) }
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.lg)
            .accessibilityIdentifier("stats-metrics-\(group.id)")
        }
    }

    /// Pairs resolved metrics two per row; an odd count leaves the final right cell blank.
    private func metricRows(
        _ metrics: [ResolvedTeamStatsMetric]
    ) -> [(ResolvedTeamStatsMetric, ResolvedTeamStatsMetric?)] {
        stride(from: 0, to: metrics.count, by: 2).map { i in
            (metrics[i], i + 1 < metrics.count ? metrics[i + 1] : nil)
        }
    }

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