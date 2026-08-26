import SwiftUI

// DEP-317's native Compare briefing: three horizontally-paged, auditable unit-metrics
// lenses driven entirely by CompareViewModel's bounded repository reads. The view never
// invents an opaque score, health state, or proprietary forecast; missing feeds stay
// visibly unavailable, and no lens ever names its underlying data source (nflverse) —
// customer-facing copy stays vendor-neutral.
//
// Aug 2026 feedback pass (two rounds): the Forecast lens (blank for most teams most of
// the season/offseason, and its unavailable-state copy referenced "our model" — not
// customer-facing language) and the Roster lens (paired snap share with no injury data,
// so it wasn't actionable) were both removed outright. What remains — Offense, Defense,
// Special Teams — reads a season-stable metrics row that's never gated on the current
// week, so it's the one thing on this page that isn't blank out of season. Each lens's
// metric rows also moved from repeating "TEAM_ABBREV value" per row to a proper table:
// one header row with each team as a column, then just the numbers underneath.
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

private struct UnitMetricsLens: View {
    let viewModel: CompareViewModel
    let unit: Unit

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if rows.isEmpty {
                LensUnavailableCard(
                    title: "No \(unitTitle.lowercased()) metrics available",
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

                    metricsTable
                }
                .depthCard(radius: DesignTokens.Radius.md)

                LensSourceLine(
                    leading: "Team metrics",
                    trailing: metricFreshness
                )
            }
        }
        .accessibilityIdentifier("compare-lens-\(lensIdentifier)-card")
    }

    // MARK: Table

    /// Cooper (Aug 26): "it should be a table... each team gets a column instead of
    /// having to write the short name on each row." One header row (team abbrevs as
    /// columns), then each metric is a row of just its two numbers underneath — the
    /// team abbrev no longer repeats on every metric.
    private var metricsTable: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Color.clear.frame(width: labelColumnWidth)
                teamHeader(viewModel.teamA)
                teamHeader(viewModel.teamB)
            }
            .padding(.bottom, DesignTokens.Spacing.xs)

            ForEach(rows) { row in
                metricRow(row)
            }
        }
        .accessibilityElement(children: .contain)
    }

    private func teamHeader(_ team: Team?) -> some View {
        Text(team?.abbrev.uppercased() ?? "—")
            .font(.caption.weight(.black))
            .tracking(0.6)
            .foregroundStyle(team.map { Color(hex: $0.colors.uiAccent) } ?? DesignTokens.Colors.textFaint)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func metricRow(_ row: LensMetricRow) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm) {
            Text(row.label)
                .font(.caption2.bold())
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .frame(width: labelColumnWidth, alignment: .leading)
            Text(row.format.string(row.valueA))
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(row.format.string(row.valueB))
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(DesignTokens.Colors.borderSubtle)
                .frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }

    /// Fixed label-column width so every row's two value columns start at the same x —
    /// the point of a table over the old repeated-abbrev rows.
    private let labelColumnWidth: CGFloat = 108

    // MARK: Data

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

/// Aug 2026 (Cooper): the eyebrow and the "we leave it blank instead of zero" explanation
/// were both implementation detail — customers don't care how the app models missing data,
/// they just want to know it's missing. Down to one centered line, and never names the app
/// ("Depth" — the old brand; the app is The Sticks now, but the fix here is simply not
/// saying either name in this sentence).
private struct LensUnavailableCard: View {
    let title: String
    let identifier: String

    var body: some View {
        Text(title)
            .font(.subheadline.weight(.bold))
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, alignment: .center)
            .depthCard(radius: DesignTokens.Radius.md)
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
