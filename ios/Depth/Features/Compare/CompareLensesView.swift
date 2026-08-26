import SwiftUI

// DEP-317's native Compare briefing: five horizontally-paged, auditable lenses driven
// entirely by CompareViewModel's bounded repository reads. The view never invents an
// opaque score, health state, or proprietary forecast; missing feeds stay visibly
// unavailable and every displayed metric carries nflverse season/freshness context.
struct CompareLensesView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let viewModel: CompareViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            lensSelector

            ScrollView(.horizontal) {
                LazyHStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                    ForEach(CompareViewModel.Lens.allCases) { lens in
                        lensPage(lens)
                            .containerRelativeFrame(.horizontal)
                            .id(lens)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollPosition(id: lensPosition)
            .scrollTargetBehavior(.viewAligned(limitBehavior: .always))
            .scrollIndicators(.hidden)
            .accessibilityLabel("Compare matchup lenses")
        }
    }

    private var lensSelector: some View {
        DepthSegmentedControl(
            options: CompareViewModel.Lens.allCases.map { lens in
                DepthSegmentedOption(
                    value: lens,
                    label: lens.accessibilityLabel,
                    identifier: "compare-lens-\(lens.rawValue)"
                )
            },
            selection: viewModel.lens,
            onChange: { lens in
                if reduceMotion {
                    viewModel.selectLens(lens)
                } else {
                    withAnimation(DesignTokens.Motion.selection) {
                        viewModel.selectLens(lens)
                    }
                }
            },
            fullWidth: true
        )
        .accessibilityElement(children: .contain)
    }

    private var lensPosition: Binding<CompareViewModel.Lens?> {
        Binding(
            get: { viewModel.lens },
            set: { lens in
                if let lens { viewModel.selectLens(lens) }
            }
        )
    }

    @ViewBuilder
    private func lensPage(_ lens: CompareViewModel.Lens) -> some View {
        switch viewModel.evidenceLoadState {
        case .loading:
            CompareLensSkeleton(lens: lens)
        case .idle, .loaded:
            switch lens {
            case .forecast:
                ForecastLens(viewModel: viewModel)
            case .roster:
                RosterLens(viewModel: viewModel)
            case .offense:
                UnitMetricsLens(viewModel: viewModel, unit: .offense)
            case .defense:
                UnitMetricsLens(viewModel: viewModel, unit: .defense)
            case .specialTeams:
                UnitMetricsLens(viewModel: viewModel, unit: .special)
            }
        }
    }
}

private struct ForecastLens: View {
    let viewModel: CompareViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let game = viewModel.matchup,
                let perspectiveTeamId = viewModel.matchupPerspectiveTeamId,
                let forecast = buildMarketForecast(game: game, perspectiveTeamId: perspectiveTeamId),
                let favorite = [viewModel.teamA, viewModel.teamB]
                    .compactMap({ $0 })
                    .first(where: { $0.id == forecast.favoriteTeamId })
            {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    LensEyebrow(text: "MARKET FORECAST")
                    HStack(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm) {
                        Text(forecast.favoriteProbability, format: .percent.precision(.fractionLength(0)))
                            .font(.system(.largeTitle, design: .rounded, weight: .black))
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text("\(favorite.city) favored")
                                .font(.headline)
                                .foregroundStyle(Color(hex: favorite.colors.uiAccent))
                            if let spread = forecast.spread {
                                Text("Market · \(favorite.abbrev) \(signed(spread))")
                                    .font(.caption.bold())
                                    .foregroundStyle(DesignTokens.Colors.textMuted)
                            }
                        }
                    }

                    Divider().overlay(DesignTokens.Colors.borderSubtle)

                    Text("No Depth forecast is available")
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text("Depth’s evaluated model did not outperform the market, so this lens reports the attributed market view without inventing a prediction.")
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .depthCard(radius: DesignTokens.Radius.md)

                LensSourceLine(
                    leading: "Market view · \(forecast.source)",
                    trailing: sourceDate(forecast.updatedAt)
                )
            } else {
                LensUnavailableCard(
                    eyebrow: "MARKET FORECAST",
                    title: "No market forecast available",
                    detail: "These teams do not have an upcoming matchup with a complete two-sided market line. Depth does not create a probability without one.",
                    identifier: "compare-forecast-unavailable"
                )
            }

            Text("For informational and entertainment purposes. Depth does not accept wagers or provide betting services.")
                .font(.caption2)
                .foregroundStyle(DesignTokens.Colors.textFaint)
        }
        .accessibilityIdentifier("compare-lens-forecast-card")
    }

    private func signed(_ value: Double) -> String {
        let number = value.formatted(.number.precision(.fractionLength(1)))
        return value > 0 ? "+\(number)" : number
    }
}

private struct RosterLens: View {
    let viewModel: CompareViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                LensEyebrow(text: "ROSTER LENS")
                Text(rosterTakeaway)
                    .font(.title3.weight(.heavy))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text("Recent snap share confirms usage only. It does not establish health or game availability.")
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)

                HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
                    if let team = viewModel.teamA {
                        participationTile(team: team, summary: summaryA)
                    }
                    if let team = viewModel.teamB {
                        participationTile(team: team, summary: summaryB)
                    }
                }

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text("INJURY REPORT")
                        .font(.caption2.bold())
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                    Text("Current injury detail is unavailable")
                        .font(.subheadline.bold())
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text("The approved live source is unavailable, so Depth does not infer injuries from roster status or participation.")
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
                .padding(DesignTokens.Spacing.sm)
                .depthCard(dense: true, padded: false, radius: DesignTokens.Radius.sm)
            }
            .depthCard(radius: DesignTokens.Radius.md)

            LensSourceLine(
                leading: "Participation · nflverse",
                trailing: participationWindow
            )
        }
        .accessibilityIdentifier("compare-lens-roster-card")
    }

    private var summaryA: StarterParticipationSummary? {
        guard let snapshot = viewModel.snapshotA else { return nil }
        return summarizeStarterParticipation(snapshot: snapshot, recent: viewModel.participationA)
    }

    private var summaryB: StarterParticipationSummary? {
        guard let snapshot = viewModel.snapshotB else { return nil }
        return summarizeStarterParticipation(snapshot: snapshot, recent: viewModel.participationB)
    }

    private var rosterTakeaway: String {
        guard let a = summaryA?.averageSnapShare, let b = summaryB?.averageSnapShare,
            let teamA = viewModel.teamA, let teamB = viewModel.teamB
        else { return "Recent starter usage is partially available" }
        if abs(a - b) < 0.01 { return "Recent starter usage is essentially even" }
        return "\(a > b ? teamA.city : teamB.city) has the higher recent starter snap share"
    }

    private var participationWindow: String {
        guard let recent = viewModel.participationA ?? viewModel.participationB else {
            return "Unavailable"
        }
        return "\(recent.season) · W\(recent.windowStartWeek)–\(recent.windowEndWeek)"
    }

    private func participationTile(
        team: Team,
        summary: StarterParticipationSummary?
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text("\(team.abbrev) RECENT SHARE")
                .font(.caption2.bold())
                .foregroundStyle(DesignTokens.Colors.textMuted)
            if let share = summary?.averageSnapShare {
                Text(share, format: .percent.precision(.fractionLength(0)))
                    .font(.title2.weight(.heavy))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
            } else {
                Text("—")
                    .font(.title2.weight(.heavy))
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
            Text(coverage(summary))
                .font(.caption2)
                .foregroundStyle(DesignTokens.Colors.textFaint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DesignTokens.Spacing.sm)
        .depthCard(dense: true, padded: false, radius: DesignTokens.Radius.sm)
        .accessibilityElement(children: .combine)
    }

    private func coverage(_ summary: StarterParticipationSummary?) -> String {
        guard let summary else { return "No roster evidence" }
        return "\(summary.trackedStarters) of \(summary.totalStarters) starters tracked"
    }
}

private struct UnitMetricsLens: View {
    let viewModel: CompareViewModel
    let unit: Unit

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if rows.isEmpty {
                LensUnavailableCard(
                    eyebrow: "\(unitTitle.uppercased()) LENS",
                    title: "No \(unitTitle.lowercased()) metrics available",
                    detail: "Depth leaves unavailable nflverse values blank instead of converting them to zero or an opaque score.",
                    identifier: "compare-\(unit.rawValue)-unavailable"
                )
            } else {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    LensEyebrow(text: "\(unitTitle.uppercased()) LENS")
                    Text(takeaway)
                        .font(.title3.weight(.heavy))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text(explanation)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)

                    ForEach(rows) { row in
                        metricRow(row)
                    }
                }
                .depthCard(radius: DesignTokens.Radius.md)

                LensSourceLine(
                    leading: "Team metrics · nflverse",
                    trailing: metricFreshness
                )
            }
        }
        .accessibilityIdentifier("compare-lens-\(lensIdentifier)-card")
    }

    private var metricsA: TeamMatchupMetrics? { viewModel.effectiveStatsA?.matchupMetrics }
    private var metricsB: TeamMatchupMetrics? { viewModel.effectiveStatsB?.matchupMetrics }

    private var unitTitle: String {
        unit == .special ? "Special Teams" : unit.rawValue.capitalized
    }

    private var lensIdentifier: String {
        unit == .special ? CompareViewModel.Lens.specialTeams.rawValue : unit.rawValue
    }

    private var rows: [LensMetricRow] {
        switch unit {
        case .offense:
            return [
                LensMetricRow(
                    id: "offensive-epa",
                    label: "EPA / PLAY",
                    valueA: metricsA?.offensiveEPAPerPlay,
                    valueB: metricsB?.offensiveEPAPerPlay,
                    format: .signed(2),
                    direction: .higher
                ),
                LensMetricRow(
                    id: "giveaways",
                    label: "GIVEAWAYS",
                    valueA: metricsA?.giveaways.map(Double.init),
                    valueB: metricsB?.giveaways.map(Double.init),
                    format: .integer,
                    direction: .lower
                ),
                LensMetricRow(
                    id: "sacks-suffered",
                    label: "SACKS ALLOWED",
                    valueA: metricsA?.sacksSuffered.map(Double.init),
                    valueB: metricsB?.sacksSuffered.map(Double.init),
                    format: .integer,
                    direction: .lower
                ),
            ].filter(\.hasValue)
        case .defense:
            return [
                LensMetricRow(
                    id: "qb-hits",
                    label: "QB HITS / GAME",
                    valueA: metricsA?.quarterbackHitsPerGame,
                    valueB: metricsB?.quarterbackHitsPerGame,
                    format: .decimal(1),
                    direction: .higher
                ),
                LensMetricRow(
                    id: "takeaways",
                    label: "TAKEAWAYS / GAME",
                    valueA: metricsA?.defensiveTakeawaysPerGame,
                    valueB: metricsB?.defensiveTakeawaysPerGame,
                    format: .decimal(1),
                    direction: .higher
                ),
                LensMetricRow(
                    id: "sacks",
                    label: "SACKS",
                    valueA: metricsA?.defensiveSacks,
                    valueB: metricsB?.defensiveSacks,
                    format: .decimal(0),
                    direction: .higher
                ),
            ].filter(\.hasValue)
        case .special:
            return [
                LensMetricRow(
                    id: "field-goals",
                    label: "FIELD GOALS",
                    valueA: metricsA?.fieldGoalPercentage,
                    valueB: metricsB?.fieldGoalPercentage,
                    format: .percent,
                    direction: .higher
                ),
                LensMetricRow(
                    id: "net-punt",
                    label: "NET PUNT YDS",
                    valueA: metricsA?.netPuntYardsPerAttempt,
                    valueB: metricsB?.netPuntYardsPerAttempt,
                    format: .decimal(1),
                    direction: .higher
                ),
                LensMetricRow(
                    id: "punt-return",
                    label: "PUNT RETURN YDS",
                    valueA: metricsA?.puntReturnYardsPerAttempt,
                    valueB: metricsB?.puntReturnYardsPerAttempt,
                    format: .decimal(1),
                    direction: .higher
                ),
            ].filter(\.hasValue)
        }
    }

    private var takeaway: String {
        guard let first = rows.first,
            let teamA = viewModel.teamA,
            let teamB = viewModel.teamB
        else { return "The available metrics do not separate these teams" }
        return matchupLeaderLabel(
            teamALabel: teamA.city,
            valueA: first.valueA,
            teamBLabel: teamB.city,
            valueB: first.valueB,
            metricLabel: first.label.lowercased(),
            direction: first.direction
        ) ?? "The available metrics do not separate these teams"
    }

    private var explanation: String {
        switch unit {
        case .offense:
            "Efficiency, giveaways, and protection explain the offensive comparison."
        case .defense:
            "Pressure and takeaways explain where each defense creates disruption."
        case .special:
            "Kicking and field-position rates show whether either unit owns an edge."
        }
    }

    private var metricFreshness: String {
        guard let metrics = metricsA ?? metricsB else { return "Unavailable" }
        return "\(metrics.season) · \(sourceDate(metrics.updatedAt))"
    }

    private func metricRow(_ row: LensMetricRow) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(row.label)
                .font(.caption2.bold())
                .foregroundStyle(DesignTokens.Colors.textMuted)
            HStack(spacing: DesignTokens.Spacing.sm) {
                metricValue(row.valueA, format: row.format, team: viewModel.teamA)
                metricValue(row.valueB, format: row.format, team: viewModel.teamB)
            }
        }
        .padding(.top, DesignTokens.Spacing.sm)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(DesignTokens.Colors.borderSubtle)
                .frame(height: 1)
        }
    }

    private func metricValue(
        _ value: Double?,
        format: LensMetricFormat,
        team: Team?
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(team?.abbrev.uppercased() ?? "—")
                .font(.caption2.bold())
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Text(format.string(value))
                .font(.title3.weight(.heavy))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

private struct CompareLensSkeleton: View {
    let lens: CompareViewModel.Lens

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(width: 100, height: 12)
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(height: 32)
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(height: 72)
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(height: 72)
        }
        .redacted(reason: .placeholder)
        .depthCard(radius: DesignTokens.Radius.md)
        .accessibilityLabel("Loading \(lens.accessibilityLabel) evidence")
        .accessibilityIdentifier("compare-lens-\(lens.rawValue)-loading")
    }
}

private struct LensUnavailableCard: View {
    let eyebrow: String
    let title: String
    let detail: String
    let identifier: String

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            LensEyebrow(text: eyebrow)
            Text(title)
                .font(.title3.weight(.heavy))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .depthCard(radius: DesignTokens.Radius.md)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier(identifier)
    }
}

private struct LensEyebrow: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2.bold())
            .tracking(0.8)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }
}

private struct LensSourceLine: View {
    let leading: String
    let trailing: String

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(leading)
            Spacer(minLength: DesignTokens.Spacing.sm)
            Text(trailing)
                .multilineTextAlignment(.trailing)
        }
        .font(.caption2)
        .foregroundStyle(DesignTokens.Colors.textFaint)
        .accessibilityElement(children: .combine)
    }
}

private struct LensMetricRow: Identifiable {
    let id: String
    let label: String
    let valueA: Double?
    let valueB: Double?
    let format: LensMetricFormat
    let direction: MatchupMetricDirection

    var hasValue: Bool { valueA != nil || valueB != nil }
}

private enum LensMetricFormat {
    case signed(Int)
    case decimal(Int)
    case integer
    case percent

    func string(_ value: Double?) -> String {
        guard let value else { return "—" }
        switch self {
        case .signed(let digits):
            let number = value.formatted(.number.precision(.fractionLength(digits)))
            return value > 0 ? "+\(number)" : number
        case .decimal(let digits):
            return value.formatted(.number.precision(.fractionLength(digits)))
        case .integer:
            return value.formatted(.number.precision(.fractionLength(0)))
        case .percent:
            return value.formatted(.number.precision(.fractionLength(1))) + "%"
        }
    }
}

private func sourceDate(_ value: String?) -> String {
    guard let value,
        let date = ISO8601DateFormatter().date(from: value)
    else { return "Update time unavailable" }
    let prefix = compareFreshness(updatedAt: value, now: Date()) == .stale ? "Stale · " : "Updated "
    return "\(prefix)\(date.formatted(.dateTime.month(.abbreviated).day()))"
}
