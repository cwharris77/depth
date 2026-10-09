import SwiftUI

// The Stats page overview: season picker, coach, the record hero with its pace against
// last season, one verified season story, the facts behind it (expanded inline), the
// defense's recent form when it stands out, and the lens rows that push the full ledger
// (`TeamStatsReferenceView`). Renders entirely from
// the cached `TeamStatsPage`; season selection is local state with no refetch. Owns a
// feature-local `TeamStatsViewModel` and loads lazily on first visit.
struct TeamStatsView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var viewModel: TeamStatsViewModel
    @State private var showSeasonPicker = false
    @State private var evidenceExpanded = false
    @State private var scopeExpanded = false
    @State private var openLens: TeamStatsLens?
    @State private var profilePlayer: Player?
    private let repository: DepthRepository
    /// Stats fetches no uniform data of its own (lightweight read,
    /// invariant 5), so it reads the kit-resolved accent TeamDetailView publishes here
    /// instead — same store the tab tint and Schedule read.
    private let currentTeamStore: CurrentTeamStore

    /// Takes its view model rather than building one so the embedding team page can keep
    /// the selected season alive across page switches.
    init(
        viewModel: TeamStatsViewModel, repository: DepthRepository,
        currentTeamStore: CurrentTeamStore
    ) {
        _viewModel = State(initialValue: viewModel)
        self.repository = repository
        self.currentTeamStore = currentTeamStore
    }

    var body: some View {
        content
            // The roster and schedule pages paint no explicit background, so they
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
                        accent: teamAccent,
                        identifierPrefix: "stats"
                    ) { season in
                        showSeasonPicker = false
                        viewModel.selectSeason(season)
                    }
                }
            }
            .navigationDestination(item: $openLens) { lens in
                if let stats = viewModel.selectedSeasonStats {
                    TeamStatsReferenceView(
                        lens: lens,
                        stats: stats,
                        ranks: ranks(for: stats),
                        allowed: viewModel.statHistory?.season(stats.season)?.allowed,
                        leaders: viewModel.selectedSeasonLeaders,
                        storyMetricIds: storyMetricIds,
                        accent: teamAccent,
                        onSelectPlayer: { profilePlayer = $0 }
                    )
                    // Declared on the pushed lens, not the overview, so the profile stacks on
                    // top of it and Back returns to the lens rather than replacing it.
                    .navigationDestination(item: $profilePlayer) { player in
                        PlayerProfileView(
                            player: player,
                            team: viewModel.page?.team,
                            kitColors: currentTeamStore.colors,
                            repository: repository
                        )
                    }
                }
            }
    }

    /// Ledger rows the overview's story cites, only when the story is this season's own.
    private var storyMetricIds: Set<String> {
        guard let story = viewModel.selectedStory, !story.isCarryover else { return [] }
        return story.story.metricIds
    }

    /// The accent that drives chips, DIFF (positive), and the next-game card border.
    /// `currentTeamStore` carries the kit-resolved color once TeamDetailView publishes
    /// it (web parity: `useKitColors`); falls back to this page's
    /// own team read while that hasn't happened yet (e.g. Stats opened before the
    /// roster page's snapshot has loaded for this team).
    /// The page's team accent, from the actively-picked kit when one is resolved, else this
    /// team's own. The ring color is a real kit color, the same one the field dots
    /// and the tab tint use, with legibility deliberately not gated.
    private var teamAccent: Color {
        if let colors = currentTeamStore.colors {
            return Color(hex: TeamSurfaces.mark(colors))
        }
        guard let page = viewModel.page else { return DesignTokens.Colors.accent }
        return Color(hex: TeamSurfaces.mark(page.team.colors.jersey))
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            TeamStatsSkeleton()
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
                Button("Try again") { Task { await viewModel.load() } }
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
                        // The roster and schedule pages start their content 16pt
                        // below the scroll top (`.padding(.vertical)` / `.padding()`);
                        // this page's first element is the trigger row, so it needs the
                        // same 16pt inset or it sits flush against the page switcher above.
                        .padding(.top, 16)
                    if viewModel.refreshFailed {
                        refreshFailedRow
                    }
                    teamNameBlock(
                        page.team,
                        coach: viewModel.selectedSeasonStats?.coach,
                        incomingCoach: viewModel.isViewingCurrentOrUpcomingSeason
                            ? page.incomingCoach : nil
                    )
                    if let active = viewModel.selectedSeasonStats {
                        heroRecord(active)
                    } else if let upcoming = viewModel.upcomingSeason {
                        degradedUpcomingHero(upcoming)
                    }
                    if let overview = viewModel.selectedStory {
                        storySection(overview)
                        evidenceSection(overview.story)
                    }
                    if let form = viewModel.selectedRecentForm {
                        recentFormRow(form)
                    }
                    if viewModel.selectedSeasonStats != nil {
                        lensRows
                    }
                }
                .padding(.bottom, DesignTokens.Spacing.xl)
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
                isUpcoming: viewModel.upcomingSeasonHasRealRow
                    && stats.season == viewModel.upcomingSeason
            )
        }
        return items
    }

    /// Web parity: the eyebrow and the season-scoped coach are one block above the hero
    /// record, not a labelled section further down the page.
    private func teamNameBlock(
        _ team: Team, coach: TeamSeasonCoach?, incomingCoach: TeamIncomingCoach?
    ) -> some View {
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
                        .foregroundStyle(teamAccent)
                }
                .padding(.top, 11)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("stats-coach")
            } else if let incomingCoach {
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: incomingCoach.name)
                        .font(.title3.weight(.heavy))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text("HEAD COACH · INCOMING")
                        .font(.caption.bold())
                        .tracking(0.6)
                        .foregroundStyle(teamAccent)
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

    /// Shared "hero section" container: horizontal inset + bottom hairline +
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
            let layout =
                dynamicTypeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.sm))
                : AnyLayout(HStackLayout(alignment: .firstTextBaseline))
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                layout {
                    Text(verbatim: record(stats))
                        .font(.largeTitle.weight(.black))
                        .accessibilityIdentifier("stats-record")
                    if !dynamicTypeSize.isAccessibilitySize {
                        Spacer(minLength: DesignTokens.Spacing.md)
                    }
                    VStack(alignment: .trailing, spacing: 1) {
                        if let streak = displayStreak(stats.streak) {
                            Text(verbatim: streak)
                                .font(.footnote.bold())
                                .foregroundStyle(teamAccent)
                        }
                        if let caption = teamStatsRankLabel(
                            ranks(for: stats)?.winPercent, lastRank: leagueSize, qualifier: .overall
                        ) {
                            Text(verbatim: caption)
                                .font(.caption.bold())
                                .foregroundStyle(DesignTokens.Colors.textMuted)
                        }
                        if let current = viewModel.currentSeason, stats.season < current,
                            let team = viewModel.page?.team
                        {
                            Text(verbatim: playoffLine(stats, conference: team.conference))
                                .font(.caption)
                                .foregroundStyle(DesignTokens.Colors.textFaint)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("stats-hero-meta")
                }
                if let pace = viewModel.selectedSeasonPace {
                    paceLine(pace)
                }
                if let opener = viewModel.selectedSeasonOpener {
                    openerLine(opener)
                }
            }
            .padding(.top, DesignTokens.Spacing.sm)
        }
    }

    /// "+2 wins on 2025 through 11 games (6-5)", the signed lead in the win/loss color.
    private func paceLine(_ pace: TeamSeasonPace) -> some View {
        let leadColor =
            pace.winDelta > 0 ? DesignTokens.Colors.statusWin : DesignTokens.Colors.statusInjured
        let lead = pace.lead.map {
            Text(verbatim: "\($0) ").bold().foregroundStyle(leadColor)
        }
        return ((lead ?? Text(verbatim: "")) + Text(verbatim: pace.detail))
            .font(.subheadline)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .accessibilityIdentifier("stats-pace")
    }

    private func openerLine(_ opener: TeamSeasonOpener) -> some View {
        Text(verbatim: opener.summary)
            .font(.subheadline)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .accessibilityIdentifier("stats-opener")
    }

    private func playoffLine(_ stats: TeamSeasonStats, conference: String) -> String {
        guard isPlayoffSeed(stats.playoffSeed, season: stats.season),
            let seed = stats.playoffSeed
        else {
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

    // MARK: Refresh failure

    /// A failed refresh over stats already on screen: keep them, say so, offer a retry.
    private var refreshFailedRow: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Text("Showing saved stats. Couldn't refresh.")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            Spacer(minLength: 0)
            Button {
                Task { await viewModel.load() }
            } label: {
                Text("Retry")
                    .font(.footnote.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("stats-refresh-retry")
        }
        .overlay(alignment: .top) { hairline(DesignTokens.Colors.borderDefault) }
        .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderDefault) }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.sm)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("stats-refresh-failed")
    }

    // MARK: Story

    /// The overview's one verified story: overline, headline, the rank that earns it, and
    /// a scope line that opens how it is measured.
    private func storySection(_ overview: TeamStatsOverviewStory) -> some View {
        let story = overview.story
        return VStack(alignment: .leading, spacing: 0) {
            Text(verbatim: overview.isCarryover ? carryoverOverline(story) : "SEASON IDENTITY")
                .font(.caption.bold())
                .tracking(1.0)
                .foregroundStyle(
                    overview.isCarryover ? DesignTokens.Colors.textFaint : teamAccent)
            Text(verbatim: story.headline)
                .font(.title2.weight(.black))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, DesignTokens.Spacing.sm)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("stats-story-headline")
            lockup(story)
                .padding(.top, DesignTokens.Spacing.md)
            if overview.isCarryover, let selected = viewModel.selectedSeason {
                Text(verbatim: "\(selected) ranks start after two games.")
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .padding(.top, DesignTokens.Spacing.md)
            }
            scopeButton(story)
            if scopeExpanded {
                Text(
                    "Ranks compare NFL teams over the same span; line metrics rank only teams with enough charted plays. Records and points come from ESPN standings; EPA, yards allowed, sacks, takeaways and line metrics come from nflverse play-by-play, with pressure charted by FTN."
                )
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, DesignTokens.Spacing.sm)
                .accessibilityIdentifier("stats-story-method")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.xs)
        .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderInput) }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("stats-story")
    }

    private func carryoverOverline(_ story: TeamSeasonStory) -> String {
        "LAST SEASON · \(story.season)\(story.isFinal ? " FINAL" : "")"
    }

    private func lockup(_ story: TeamSeasonStory) -> some View {
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.xs))
            : AnyLayout(HStackLayout(alignment: .center, spacing: DesignTokens.Spacing.md))
        return layout {
            Text(verbatim: ordinal(story.lead.rank))
                .font(.title.weight(.black))
                .monospacedDigit()
                .foregroundStyle(teamAccent)
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: story.lockupLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                if let context = story.leadContext {
                    Text(verbatim: context)
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("stats-story-lockup")
    }

    private func scopeButton(_ story: TeamSeasonStory) -> some View {
        Button {
            withAnimation(DesignTokens.Motion.feedback) { scopeExpanded.toggle() }
        } label: {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Image(systemName: "info.circle")
                Text(verbatim: story.scope)
                    .multilineTextAlignment(.leading)
            }
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.top, DesignTokens.Spacing.xs)
        .accessibilityHint(
            scopeExpanded ? "Hides how this is measured" : "Shows how this is measured"
        )
        .accessibilityIdentifier("stats-story-scope")
    }

    // MARK: Evidence

    /// "Behind the story": the facts that earn the headline, expanded in place.
    private func evidenceSection(_ story: TeamSeasonStory) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(DesignTokens.Motion.selection) { evidenceExpanded.toggle() }
            } label: {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Text("Behind the story")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Spacer(minLength: DesignTokens.Spacing.sm)
                    Text(
                        verbatim:
                            "\(story.evidence.count) \(story.evidence.count == 1 ? "STAT" : "STATS")"
                    )
                    .font(.caption.bold())
                    .tracking(0.6)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                    Image(systemName: evidenceExpanded ? "chevron.up" : "chevron.down")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderSubtle) }
            .accessibilityValue(evidenceExpanded ? "Expanded" : "Collapsed")
            .accessibilityIdentifier("stats-evidence-toggle")
            if evidenceExpanded {
                rankLegend(story)
                ForEach(story.evidence) { fact in
                    evidenceRow(fact)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("stats-evidence")
    }

    private func rankLegend(_ story: TeamSeasonStory) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            HStack(spacing: 6) {
                Circle().fill(teamAccent).frame(width: 8, height: 8)
                Text(verbatim: String(story.season))
            }
            if story.evidence.contains(where: { $0.priorRank != nil }) {
                HStack(spacing: 6) {
                    Circle().strokeBorder(DesignTokens.Colors.textFaint, lineWidth: 1)
                        .frame(width: 8, height: 8)
                    Text(verbatim: String(story.season - 1))
                }
            }
            Spacer(minLength: 0)
            Text("1st ← NFL rank → last")
        }
        .font(.caption2)
        .foregroundStyle(DesignTokens.Colors.textFaint)
        .padding(.top, DesignTokens.Spacing.sm)
        .accessibilityHidden(true)
    }

    private func evidenceRow(_ fact: TeamStoryFact) -> some View {
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.xs))
            : AnyLayout(
                HStackLayout(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm))
        let rankText =
            ordinal(fact.rank) + (fact.priorRank.map { " · was \(ordinal($0))" } ?? "")
        return VStack(alignment: .leading, spacing: 6) {
            layout {
                Text(verbatim: fact.label)
                    .font(.body.weight(.medium))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                if !dynamicTypeSize.isAccessibilitySize {
                    Spacer(minLength: DesignTokens.Spacing.sm)
                }
                Text(verbatim: fact.display)
                    .font(.body.weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
            }
            RankStrip(
                rank: fact.rank, priorRank: fact.priorRank, population: fact.population,
                accent: teamAccent)
            layout {
                Text(verbatim: fact.blurb)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                if !dynamicTypeSize.isAccessibilitySize {
                    Spacer(minLength: DesignTokens.Spacing.sm)
                }
                Text(verbatim: rankText)
                    .font(.caption.bold())
                    .foregroundStyle(teamAccent)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
        .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderSubtle) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "\(fact.label), \(fact.display), \(ordinal(fact.rank)) of \(fact.population)"
                + (fact.priorRank.map { ", \(ordinal($0)) last season" } ?? "")
        )
        .accessibilityIdentifier("stats-evidence-\(fact.id)")
    }

    // MARK: Recent form

    /// The defense over its most recent games, only when that window ranks top or bottom
    /// five.
    private func recentFormRow(_ form: TeamRecentForm) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(verbatim: form.overline)
                .font(.caption.bold())
                .tracking(1.0)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Text(verbatim: form.headline)
                .font(.body.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            Text(verbatim: form.detail)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, DesignTokens.Spacing.md)
        .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderSubtle) }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("stats-recent-form")
    }

    // MARK: Lens rows

    /// The reference layer's entry points: one row per lens, each pushing the ledger.
    private var lensRows: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("SEASON STATS")
                .font(.caption.weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, DesignTokens.Spacing.sm)
                .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderDefault) }
            ForEach(TeamStatsLens.allCases) { lens in
                Button {
                    openLens = lens
                } label: {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Text(lens.title)
                            .font(.body.weight(.medium))
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                        Spacer(minLength: DesignTokens.Spacing.sm)
                        Image(systemName: "chevron.right")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(DesignTokens.Colors.textFaint)
                    }
                    .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderSubtle) }
                .accessibilityIdentifier("stats-lens-row-\(lens.rawValue)")
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    private func hairline(_ color: Color) -> some View {
        Rectangle().fill(color).frame(height: 1)
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
                if let opener = viewModel.selectedSeasonOpener {
                    openerLine(opener)
                        .padding(.top, DesignTokens.Spacing.sm)
                }
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

}

/// The one eyebrow style shared by the team-name block and the footer ticker —
/// caption2.bold, tracking 0.8, textMuted.
private struct StatsEyebrow: View {
    let text: String

    var body: some View {
        Text(verbatim: text)
            .font(.caption2.bold())
            .tracking(0.8)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }
}

/// A 1st-to-last league rank strip: this season's rank as a filled dot, last season's as a
/// hollow one.
private struct RankStrip: View {
    let rank: Int
    let priorRank: Int?
    let population: Int
    let accent: Color

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DesignTokens.Colors.surfacePlaceholder)
                    .frame(height: 2)
                if let priorRank {
                    Circle()
                        .fill(DesignTokens.Colors.bg)
                        .overlay(Circle().strokeBorder(DesignTokens.Colors.textFaint, lineWidth: 1))
                        .frame(width: 8, height: 8)
                        .offset(x: position(priorRank, width: geometry.size.width) - 4)
                }
                Circle()
                    .fill(accent)
                    .frame(width: 10, height: 10)
                    .offset(x: position(rank, width: geometry.size.width) - 5)
            }
            .frame(height: 12)
        }
        .frame(height: 12)
        .accessibilityHidden(true)
    }

    /// The dot's center, inset by its radius so the first and last ranks stay on the track.
    private func position(_ rank: Int, width: CGFloat) -> CGFloat {
        let inset: CGFloat = 5
        guard population > 1 else { return inset }
        let fraction = CGFloat(min(max(rank, 1), population) - 1) / CGFloat(population - 1)
        return inset + fraction * (width - inset * 2)
    }
}

/// Placeholder bars sized to the overview's real layout, so content does not jump in.
private struct TeamStatsSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            bar(120, 32)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                bar(140, 10)
                bar(160, 20)
                bar(180, 10)
            }
            .padding(.top, DesignTokens.Spacing.lg)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                bar(128, 40)
                bar(220, 12)
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                bar(110, 10)
                bar(nil, 22)
                bar(240, 22)
                bar(180, 28).padding(.top, DesignTokens.Spacing.sm)
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
            ForEach(0..<4, id: \.self) { _ in
                bar(120, 14).frame(minHeight: 52)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading stats")
    }

    private func bar(_ width: CGFloat?, _ height: CGFloat) -> some View {
        Capsule()
            .fill(DesignTokens.Colors.surfacePlaceholder)
            .frame(width: width, height: height)
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
    }
}
