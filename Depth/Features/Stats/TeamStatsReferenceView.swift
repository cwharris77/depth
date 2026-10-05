import SwiftUI

/// The Stats page's reference layer: the full season ledger, one lens at a time.
enum TeamStatsLens: String, CaseIterable, Identifiable, Hashable {
    case record
    case offense
    case defense
    case specialTeams
    case line
    case leaders

    var id: String { rawValue }

    var title: String {
        switch self {
        case .record: "Record"
        case .offense: "Offense"
        case .defense: "Defense"
        case .specialTeams: "Special teams"
        case .line: "Line"
        case .leaders: "Leaders"
        }
    }
}

/// Pushed from the overview's lens rows. Renders from values already loaded for the
/// selected season, so switching lenses is pure local state with no refetch.
struct TeamStatsReferenceView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var lens: TeamStatsLens
    let stats: TeamSeasonStats
    let ranks: TeamStatsRanks?
    /// The season's defense-allowed window from the team's stat file, when it loaded.
    let allowed: TeamAllowedWindow?
    let leaders: RosterLeaders?
    /// Rows the overview's story cites, marked so the ledger stays tied to the claim.
    let storyMetricIds: Set<String>
    let accent: Color

    init(
        lens: TeamStatsLens,
        stats: TeamSeasonStats,
        ranks: TeamStatsRanks?,
        allowed: TeamAllowedWindow?,
        leaders: RosterLeaders?,
        storyMetricIds: Set<String>,
        accent: Color
    ) {
        _lens = State(initialValue: lens)
        self.stats = stats
        self.ranks = ranks
        self.allowed = allowed
        self.leaders = leaders
        self.storyMetricIds = storyMetricIds
        self.accent = accent
    }

    private let leagueSize = TeamSeasonStoryBuilder.leagueSize

    var body: some View {
        VStack(spacing: 0) {
            lensStrip
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    lensContent
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
            .scrollIndicators(.hidden)
            .accessibilityIdentifier("stats-reference-\(lens.rawValue)")
        }
        .background(DesignTokens.Colors.bg)
        .navigationTitle(Text(verbatim: "\(stats.season) season stats"))
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Lens strip

    private var lensStrip: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                HStack(spacing: DesignTokens.Spacing.lg) {
                    ForEach(TeamStatsLens.allCases) { item in
                        lensTab(item) {
                            lens = item
                            withAnimation(DesignTokens.Motion.selection) {
                                proxy.scrollTo(item, anchor: .center)
                            }
                        }
                        .id(item)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
            }
            // The lens a row pushed may sit past the screen edge (Line, Leaders).
            .onAppear { proxy.scrollTo(lens, anchor: .center) }
        }
        .scrollIndicators(.hidden)
        // A horizontal ScrollView accepts all the height a VStack offers it; pin it to the
        // tab row's own height so the ledger below gets the rest of the screen.
        .fixedSize(horizontal: false, vertical: true)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
        }
    }

    private func lensTab(_ item: TeamStatsLens, select: @escaping () -> Void) -> some View {
        let isActive = item == lens
        return Button(action: select) {
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                Text(item.title)
                    .font(.subheadline.weight(isActive ? .bold : .medium))
                    .foregroundStyle(
                        isActive ? DesignTokens.Colors.textPrimary : DesignTokens.Colors.textMuted
                    )
                    .padding(.bottom, 10)
                Capsule()
                    .fill(isActive ? accent : .clear)
                    .frame(height: 2)
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? .isSelected : [])
        .accessibilityIdentifier("stats-lens-\(item.rawValue)")
    }

    // MARK: Lens content

    @ViewBuilder
    private var lensContent: some View {
        switch lens {
        case .record:
            recordLens
        case .offense:
            yardsGroup
            catalogGroups(["offense"])
        case .defense:
            allowedGroup
            catalogGroups(["defense"])
        case .specialTeams:
            catalogGroups(["special"])
        case .line:
            lineLens
        case .leaders:
            leadersLens
        }
        if lensHasStoryRow {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Circle().fill(accent).frame(width: 6, height: 6)
                Text("Part of the season story")
            }
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.md)
            .accessibilityElement(children: .combine)
        }
        if showRanks, lens != .leaders {
            Text(
                verbatim: TeamSeasonStoryBuilder.games(stats) > 0
                    ? "Ranks among NFL teams through \(TeamSeasonStoryBuilder.games(stats)) games."
                    : "No games played yet."
            )
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.sm)
        }
    }

    private var lensHasStoryRow: Bool {
        switch lens {
        case .record:
            !storyMetricIds.isDisjoint(with: ["points-for", "points-against", "diff", "to-margin"])
        case .offense:
            !storyMetricIds.isDisjoint(
                with: Set(["pass-yds", "rush-yds"]).union(catalogIds(["offense"])))
        case .defense:
            !storyMetricIds.isDisjoint(with: catalogIds(["defense"]).union(allowedRowIds))
        case .specialTeams: !storyMetricIds.isDisjoint(with: catalogIds(["special"]))
        case .line: !storyMetricIds.isDisjoint(with: TeamLineMetricCatalog.metrics.map(\.id))
        case .leaders: false
        }
    }

    private func catalogIds(_ groupIds: Set<String>) -> Set<String> {
        Set(
            TeamStatsMetricCatalog.groups.filter { groupIds.contains($0.id) }
                .flatMap { $0.metrics.map(\.id) })
    }

    /// Below a two-game sample the values still show but nothing is ranked.
    private var showRanks: Bool {
        TeamSeasonStoryBuilder.games(stats) >= TeamSeasonStoryBuilder.minimumGamesForRanks
    }

    private func rank(_ value: Int?, _ qualifier: TeamStatsRankQualifier) -> String? {
        showRanks ? teamStatsRankLabel(value, lastRank: leagueSize, qualifier: qualifier) : nil
    }

    @ViewBuilder
    private var recordLens: some View {
        group(
            "SPLITS",
            rows: [
                LedgerRow("home", "Home", record(stats.homeWins, stats.homeLosses)),
                LedgerRow("road", "Road", record(stats.roadWins, stats.roadLosses)),
                LedgerRow("division", "Division", record(stats.divisionWins, stats.divisionLosses)),
                LedgerRow(
                    "conference", "Conference",
                    record(stats.conferenceWins, stats.conferenceLosses)),
            ])
        group(
            "POINTS",
            rows: [
                LedgerRow(
                    "points-for", "Points for", String(stats.pointsFor),
                    rank: rank(ranks?.pointsFor, .most)),
                LedgerRow(
                    "points-against", "Points against", String(stats.pointsAgainst),
                    rank: rank(ranks?.pointsAgainst, .least)),
                LedgerRow(
                    "diff", "Point differential", signed(stats.pointDifferential),
                    color: signedColor(stats.pointDifferential),
                    rank: rank(ranks?.pointDifferential, .most)),
            ]
                + (stats.matchupMetrics?.turnoverMargin.map { margin in
                    [
                        LedgerRow(
                            "to-margin", "Turnover margin", signed(margin),
                            color: signedColor(margin), rank: rank(ranks?.turnoverMargin, .most))
                    ]
                } ?? []))
    }

    @ViewBuilder
    private var yardsGroup: some View {
        let rows = [
            stats.passingYards.map {
                LedgerRow(
                    "pass-yds", "PASS YDS", String($0), rank: rank(ranks?.passingYards, .most))
            },
            stats.rushingYards.map {
                LedgerRow(
                    "rush-yds", "RUSH YDS", String($0), rank: rank(ranks?.rushingYards, .most))
            },
        ].compactMap { $0 }
        if !rows.isEmpty {
            group("YARDS", rows: rows)
        }
    }

    private let allowedRowIds: Set<String> = [
        "rush-yds-allowed", "pass-yds-allowed", "total-yds-allowed", "rush-epa-allowed",
        "pass-epa-allowed",
    ]

    /// Yards and EPA the defense allowed, per game or per play.
    @ViewBuilder
    private var allowedGroup: some View {
        let rows = allowedRows
        if !rows.isEmpty {
            group("ALLOWED", rows: rows)
        }
    }

    /// Ranks count from the fewest allowed, among the teams the file ranked.
    private var allowedRows: [LedgerRow] {
        guard let allowed else { return [] }
        let rates = allowed.rates
        let ranks = allowed.ranks
        let specs: [(String, String, Double?, (Double) -> String, Int?)] = [
            (
                "rush-yds-allowed", "RUSH YDS / GM", rates.rushingYards,
                TeamStatsMetricFormat.integer, ranks?.rushingYards
            ),
            (
                "pass-yds-allowed", "PASS YDS / GM", rates.passingYards,
                TeamStatsMetricFormat.integer, ranks?.passingYards
            ),
            (
                "total-yds-allowed", "TOTAL YDS / GM", rates.totalYards,
                TeamStatsMetricFormat.integer, ranks?.totalYards
            ),
            (
                "rush-epa-allowed", "RUSH EPA / CARRY", rates.rushingEpaPerCarry,
                TeamStatsMetricFormat.signed(2), ranks?.rushingEpaPerCarry
            ),
            (
                "pass-epa-allowed", "PASS EPA / DROPBACK", rates.passingEpaPerDropback,
                TeamStatsMetricFormat.signed(2), ranks?.passingEpaPerDropback
            ),
        ]
        let last = allowed.rankedTeams ?? leagueSize
        return specs.compactMap { id, label, value, format, rank in
            value.map {
                LedgerRow(
                    id, label, format($0),
                    rank: showRanks
                        ? teamStatsRankLabel(rank, lastRank: last, qualifier: .least) : nil)
            }
        }
    }

    @ViewBuilder
    private func catalogGroups(_ ids: Set<String>) -> some View {
        let groups = TeamStatsMetricCatalog.resolve(
            metrics: stats.matchupMetrics, ranks: ranks, lastRank: leagueSize,
            showRanks: showRanks
        ).filter { ids.contains($0.id) }
        if groups.isEmpty {
            emptyLens("No \(lens.title.lowercased()) data for this season.")
        }
        ForEach(groups) { resolved in
            group(resolved.title, rows: resolved.metrics.map(LedgerRow.init))
        }
    }

    @ViewBuilder
    private var lineLens: some View {
        let groups = TeamLineMetricCatalog.resolve(
            line: stats.lineStats, ranks: ranks, lastRank: leagueSize, showRanks: showRanks)
        if groups.isEmpty {
            emptyLens("No offensive line data for this season.")
        }
        ForEach(groups) { resolved in
            group(
                resolved.title, rows: resolved.metrics.map(LedgerRow.init),
                note: resolved.sourceNote)
        }
    }

    @ViewBuilder
    private var leadersLens: some View {
        let rows: [(label: String, leader: Leader)] = [
            leaders?.passing.map { ("PASSING", $0) },
            leaders?.rushing.map { ("RUSHING", $0) },
            leaders?.receiving.map { ("RECEIVING", $0) },
        ].compactMap { $0 }
        if rows.isEmpty {
            emptyLens("No team leaders for this season yet.")
        } else {
            groupHeader("TEAM LEADERS")
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                leaderRow(label: row.label, leader: row.leader)
            }
            .accessibilityIdentifier("stats-roster-leaders")
        }
    }

    // MARK: Rows

    private struct LedgerRow: Identifiable {
        let id: String
        let label: String
        let value: String
        var color: Color = DesignTokens.Colors.textPrimary
        var rank: String?

        init(
            _ id: String, _ label: String, _ value: String,
            color: Color = DesignTokens.Colors.textPrimary, rank: String? = nil
        ) {
            self.id = id
            self.label = label
            self.value = value
            self.color = color
            self.rank = rank
        }

        init(_ metric: ResolvedTeamStatsMetric) {
            self.init(metric.id, metric.label, metric.display, rank: metric.rankCaption)
        }
    }

    private func groupHeader(_ title: String) -> some View {
        Text(verbatim: title)
            .font(.caption.weight(.semibold))
            .tracking(1.2)
            .foregroundStyle(DesignTokens.Colors.textFaint)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, DesignTokens.Spacing.sm)
            .overlay(alignment: .bottom) {
                Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.lg)
    }

    private func group(_ title: String, rows: [LedgerRow], note: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            groupHeader(title)
            ForEach(rows) { row in
                ledgerRow(row)
            }
            if let note {
                Text(verbatim: note)
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.textFaintest)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.top, DesignTokens.Spacing.xs)
            }
        }
    }

    private func ledgerRow(_ row: LedgerRow) -> some View {
        let isStory = storyMetricIds.contains(row.id)
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.xs))
            : AnyLayout(HStackLayout(alignment: .center, spacing: DesignTokens.Spacing.md))
        return layout {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(verbatim: row.label)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                if isStory {
                    Circle().fill(accent).frame(width: 6, height: 6)
                        .accessibilityLabel("Part of the season story")
                }
            }
            if !dynamicTypeSize.isAccessibilitySize { Spacer(minLength: DesignTokens.Spacing.sm) }
            VStack(
                alignment: dynamicTypeSize.isAccessibilitySize ? .leading : .trailing, spacing: 2
            ) {
                Text(verbatim: row.value)
                    .font(.subheadline.weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(row.color)
                if let rank = row.rank {
                    Text(verbatim: rank)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(isStory ? accent : DesignTokens.Colors.textMuted)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("stats-row-\(row.id)")
    }

    private func leaderRow(label: String, leader: Leader) -> some View {
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.xs))
            : AnyLayout(HStackLayout(alignment: .center, spacing: DesignTokens.Spacing.md))
        return layout {
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: label)
                    .font(.caption2.weight(.bold))
                    .tracking(0.6)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                Text(verbatim: leader.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
            }
            if !dynamicTypeSize.isAccessibilitySize { Spacer(minLength: DesignTokens.Spacing.sm) }
            Text(verbatim: leader.line)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .multilineTextAlignment(dynamicTypeSize.isAccessibilitySize ? .leading : .trailing)
        }
        .frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .accessibilityElement(children: .combine)
    }

    private func emptyLens(_ message: String) -> some View {
        Text(verbatim: message)
            .font(.subheadline)
            .foregroundStyle(DesignTokens.Colors.textMuted)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.top, DesignTokens.Spacing.lg)
    }

    // MARK: Formatting

    private func record(_ wins: Int, _ losses: Int) -> String { "\(wins)-\(losses)" }

    private func signed(_ value: Int) -> String { value > 0 ? "+\(value)" : String(value) }

    /// A positive margin is the schedule card's win green, a negative one the injury red.
    private func signedColor(_ value: Int) -> Color {
        value > 0
            ? DesignTokens.Colors.statusWin
            : value < 0 ? DesignTokens.Colors.statusInjured : DesignTokens.Colors.textMuted
    }
}
