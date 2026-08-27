import SwiftUI

// Compare's By-team metric stack, rebuilt to the vault canvas "Refining the compare page"
// (options 1b + 2d/2e + 3a/3b). The lens tabs now swap a vertical stack of grouped metric
// tables in place: each group is one bordered card whose header row carries the group name
// and the two team abbrevs as columns, and whose rows are a label plus two right-aligned,
// tabular-figure numbers. The leader in each row is tinted in that team's `uiAccent` and
// the trailing side dims, so the winner reads without a per-row badge.
//
// What this replaced, and why (all four are canvas decisions, not cleanup):
//  - The horizontally-paged lens carousel became an in-place swap. The canvas draws a
//    single vertical scroll of grouped tables; a horizontal pager inside the page's own
//    vertical ScrollView also fought the outer gesture once the tables grew past one screen.
//  - The per-lens eyebrow ("OFFENSE LENS"), the takeaway headline ("Seattle leads in epa /
//    play"), and the explanation sentence are gone. Three metrics could be summarized in a
//    sentence; fifteen across three groups cannot, and the tinted leader now says per row
//    what the headline said once for the first row only.
//  - The per-lens source line moved to the page-level provenance stamp beside the season
//    picker (CompareView's `seasonRow`), where it applies to every number on the page
//    instead of restating itself under each lens.
//  - Three metrics per lens became four to five per group, because a season comparison that
//    fits on one screen was never the constraint — every added row reads a field that was
//    already being ingested. The catalog lives in Domain/CompareMetrics.swift.
struct CompareLensesView: View {
    let viewModel: CompareViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            lensSelector

            switch viewModel.evidenceLoadState {
            case .loading:
                // Canvas 2e: the skeleton mirrors the grouped table it resolves into, so
                // the page doesn't relayout on arrival (AGENTS.md mistake #16).
                CompareMetricsSkeleton(viewModel: viewModel)
            case .idle, .loaded:
                if viewModel.metricsUnavailable {
                    CompareNoMetricsState(viewModel: viewModel)
                } else {
                    metricGroups
                }
            }
        }
    }

    private var lensSelector: some View {
        DepthSegmentedControl(
            options: CompareViewModel.Lens.allCases.map { lens in
                DepthSegmentedOption(
                    value: lens,
                    label: lens.tabLabel,
                    identifier: "compare-lens-\(lens.rawValue)"
                )
            },
            selection: viewModel.lens,
            onChange: { viewModel.selectLens($0) },
            fullWidth: true
        )
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var metricGroups: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 4) {
            if viewModel.isThinSample {
                CompareSampleCaution(stamp: viewModel.seasonStamp)
            }

            ForEach(groups) { group in
                CompareMetricTable(
                    title: group.title,
                    rows: group.rows,
                    teamA: viewModel.teamA,
                    teamB: viewModel.teamB,
                    identifier: "compare-group-\(group.id)"
                )
            }

            if let recordRows {
                CompareMetricTable(
                    title: "SEASON RECORD",
                    rows: recordRows,
                    teamA: viewModel.teamA,
                    teamB: viewModel.teamB,
                    identifier: "compare-group-season-record"
                )
            }
        }
        // The lens is the identity of this stack: re-keying it crossfades between lenses
        // instead of animating fifteen rows into fifteen different rows.
        .id(viewModel.lens)
        .transition(.opacity)
    }

    private var groups: [CompareResolvedGroup] {
        resolveCompareGroups(
            for: viewModel.lens.unit,
            a: viewModel.metricsA,
            b: viewModel.metricsB,
            // Canvas 3a: at a one-game sample the numbers still show, but nothing is
            // called a leader.
            allowLeader: !viewModel.isThinSample
        )
    }

    /// The record table needs a real row on both sides — a one-sided record table would be
    /// a column of em dashes, which the metric groups filter out and this should too.
    private var recordRows: [CompareMetricRow]? {
        guard let statsA = viewModel.effectiveStatsA, let statsB = viewModel.effectiveStatsB
        else { return nil }
        return CompareRecordCatalog.rows(a: statsA, b: statsB)
    }
}

// MARK: - Metric table

/// One grouped metric card: a header band naming the group and the two teams, then a row
/// per metric. The two value columns are a fixed width so every row's numbers line up
/// across every group on the page, not just within one card.
private struct CompareMetricTable: View {
    let title: String
    let rows: [CompareMetricRow]
    let teamA: Team?
    let teamB: Team?
    let identifier: String

    /// Matches the canvas's 74px value columns. Fixed (not flexible) so the label column
    /// absorbs width differences and the numbers stay in one vertical line.
    private let valueColumnWidth: CGFloat = 74

    var body: some View {
        VStack(spacing: 0) {
            header
            VStack(spacing: 0) {
                ForEach(rows) { row in
                    metricRow(row)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md - 2)
            .padding(.bottom, DesignTokens.Spacing.sm + 4)
            .padding(.top, DesignTokens.Spacing.xs)
        }
        .background(DesignTokens.Colors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(identifier)
    }

    private var header: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(title)
                .font(.caption2.bold())
                .tracking(0.9)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .frame(maxWidth: .infinity, alignment: .leading)
            teamColumnHeader(teamA)
            teamColumnHeader(teamB)
        }
        .padding(.horizontal, DesignTokens.Spacing.md - 2)
        .padding(.vertical, DesignTokens.Spacing.sm + 3)
        .background(DesignTokens.Colors.surfaceCard2)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
        }
    }

    private func teamColumnHeader(_ team: Team?) -> some View {
        Text(team?.abbrev.uppercased() ?? "—")
            .font(.caption.weight(.black))
            .tracking(0.6)
            .foregroundStyle(team.map { Color(hex: $0.colors.uiAccent) } ?? DesignTokens.Colors.textFaint)
            .frame(width: valueColumnWidth, alignment: .trailing)
    }

    private func metricRow(_ row: CompareMetricRow) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm) {
            Text(row.label)
                .font(.caption2.bold())
                .tracking(0.5)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
            value(row.a, side: .a, leader: row.leader)
            value(row.b, side: .b, leader: row.leader)
        }
        .padding(.vertical, DesignTokens.Spacing.sm + 2)
        .overlay(alignment: .top) {
            Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel(row))
    }

    private func value(_ text: String, side: CompareSide, leader: CompareSide?) -> some View {
        Text(text)
            .font(.subheadline.weight(.heavy))
            .monospacedDigit()
            .foregroundStyle(color(for: side, leader: leader))
            .frame(width: valueColumnWidth, alignment: .trailing)
    }

    /// The leading side takes its own team's accent, the trailing side dims to `textFaint`,
    /// and a row with no leader (tied, neutral, or a thin live sample) leaves both plain.
    private func color(for side: CompareSide, leader: CompareSide?) -> Color {
        guard let leader else { return DesignTokens.Colors.textPrimary }
        guard leader == side else { return DesignTokens.Colors.textFaint }
        let team = side == .a ? teamA : teamB
        return team.map { Color(hex: $0.colors.uiAccent) } ?? DesignTokens.Colors.textPrimary
    }

    /// Color alone can't carry the leader for VoiceOver, so the spoken row names it.
    private func accessibilityLabel(_ row: CompareMetricRow) -> String {
        let a = teamA?.abbrev.uppercased() ?? "Team A"
        let b = teamB?.abbrev.uppercased() ?? "Team B"
        var label = "\(row.label). \(a) \(row.a). \(b) \(row.b)."
        switch row.leader {
        case .a: label += " \(a) leads."
        case .b: label += " \(b) leads."
        case nil: break
        }
        return label
    }
}

// MARK: - Thin-sample caution

/// Canvas 3a: a live season with barely any football played still shows its numbers, but
/// says why they look extreme and stops calling a leader. Never shown for a completed
/// season — see `CompareSampleGuard.isThin`.
private struct CompareSampleCaution: View {
    let stamp: CompareSeasonStamp

    var body: some View {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.circle")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            Text(copy)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm + 4)
        .padding(.vertical, DesignTokens.Spacing.sm + 2)
        .background(DesignTokens.Colors.surfaceCard2, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("compare-thin-sample-caution")
    }

    private var copy: String {
        guard case .live(let games) = stamp else { return "" }
        let played = games == 1 ? "One game" : "\(games) games"
        return "\(played) played. Per-play rates swing hard at this sample size — no leader is called yet."
    }
}

// MARK: - No metrics for this season

/// Canvas 2d: the picked season has no metrics on either side. The old build showed a bare
/// centered "No offense metrics available" with nothing to act on; this names the season and
/// offers the newest one that does have data, which the view model already computes.
private struct CompareNoMetricsState: View {
    let viewModel: CompareViewModel

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm + 2) {
            Text(title)
                .font(.footnote.weight(.bold))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
            Text(explanation)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 290)

            if let fallback = viewModel.fallbackSeasonWithMetrics {
                Button {
                    viewModel.selectSeason(fallback)
                } label: {
                    Text(verbatim: "Compare \(fallback) instead")
                        .font(.caption.bold())
                        .foregroundStyle(DesignTokens.Colors.accent)
                        .padding(.horizontal, DesignTokens.Spacing.md - 2)
                        .frame(minHeight: 36)
                        .background(DesignTokens.Colors.accent.opacity(0.14), in: Capsule())
                        .overlay {
                            Capsule().strokeBorder(DesignTokens.Colors.accent.opacity(0.5), lineWidth: 1)
                        }
                }
                .buttonStyle(.plain)
                .frame(minHeight: 44)
                .accessibilityIdentifier("compare-season-fallback")
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl + DesignTokens.Spacing.xs)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .background(DesignTokens.Colors.surfaceCard2)
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(
                    DesignTokens.Colors.borderSubtle,
                    style: StrokeStyle(lineWidth: 1, dash: [5])
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .accessibilityIdentifier("compare-no-metrics")
    }

    private var title: String {
        guard let season = viewModel.resolvedSeason else { return "No metrics yet" }
        return "No \(String(season)) metrics yet"
    }

    private var explanation: String {
        guard let fallback = viewModel.fallbackSeasonWithMetrics else {
            return "There are no comparable metrics for this season yet."
        }
        return "The season hasn’t kicked off. \(String(fallback)) is the most recent completed season for both teams."
    }
}

// MARK: - Loading skeleton

/// Canvas 2e. Two placeholder cards laid out on the same grid as `CompareMetricTable`,
/// keeping the real team abbrevs in the header band (they're already known — only the
/// numbers are still in flight), so nothing but the values pops in on arrival.
private struct CompareMetricsSkeleton: View {
    let viewModel: CompareViewModel

    /// Row counts of the first two offense groups, so the skeleton is the height the real
    /// content resolves into rather than an arbitrary guess.
    private let placeholderRowCounts = [4, 4]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 4) {
            ForEach(Array(placeholderRowCounts.enumerated()), id: \.offset) { _, rowCount in
                card(rowCount: rowCount)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading team metrics")
        .accessibilityIdentifier("compare-metrics-loading")
    }

    private func card(rowCount: Int) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                placeholderBar(width: 84, height: 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                abbrev(viewModel.teamA)
                abbrev(viewModel.teamB)
            }
            .padding(.horizontal, DesignTokens.Spacing.md - 2)
            .padding(.vertical, DesignTokens.Spacing.sm + 3)
            .background(DesignTokens.Colors.surfaceCard2)
            .overlay(alignment: .bottom) {
                Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
            }

            VStack(spacing: 0) {
                ForEach(0..<rowCount, id: \.self) { row in
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        // Varied label widths so the block reads as text, not a bar chart.
                        placeholderBar(width: [96, 72, 110, 88][row % 4], height: 10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        placeholderBar(width: 52, height: 15).frame(width: 74, alignment: .trailing)
                        placeholderBar(width: 52, height: 15).frame(width: 74, alignment: .trailing)
                    }
                    .padding(.vertical, DesignTokens.Spacing.sm + 2)
                    .overlay(alignment: .top) {
                        Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md - 2)
            .padding(.bottom, DesignTokens.Spacing.sm + 4)
            .padding(.top, DesignTokens.Spacing.xs)
        }
        .background(DesignTokens.Colors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
        }
    }

    private func abbrev(_ team: Team?) -> some View {
        Text(team?.abbrev.uppercased() ?? "—")
            .font(.caption.weight(.black))
            .tracking(0.6)
            .foregroundStyle(team.map { Color(hex: $0.colors.uiAccent) } ?? DesignTokens.Colors.textFaint)
            .frame(width: 74, alignment: .trailing)
    }

    private func placeholderBar(width: CGFloat, height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(DesignTokens.Colors.surfacePlaceholder)
            .frame(width: width, height: height)
    }
}
