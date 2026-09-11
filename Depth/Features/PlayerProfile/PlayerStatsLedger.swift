import SwiftUI

// PlayerProfileView's season ledger (Claude Design "Player Profile", option 2): category
// tabs generated from the player's own data, one hairline row per season with a bar scaled
// to the career best, a tap-to-open detail strip, and a CAREER totals line. The vocabulary
// (which metric, which figures) is PlayerStatCategory's -- this view only lays it out.
// The only season-stats rendering on the profile now — the old compact table was deleted
// with the player card (2026-09-11 merge spec).
struct PlayerStatsLedger: View {
    let stats: [PlayerSeasonStats]
    let position: Position
    /// The team the profile was opened from. Seasons played for it get the team-tinted bar;
    /// seasons elsewhere stay neutral, so a trade reads at a glance.
    let currentTeamAbbrev: String?
    let mark: Color

    @State private var selection: PlayerStatCategory?
    @State private var expanded: Set<String> = []

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ScaledMetric(relativeTo: .footnote) private var yearWidth: CGFloat = 40
    @ScaledMetric(relativeTo: .caption) private var teamWidth: CGFloat = 32
    @ScaledMetric(relativeTo: .caption2) private var careerLabelWidth: CGFloat = 72

    private var categories: [PlayerStatCategory] {
        PlayerStatCategory.categories(for: stats, position: position)
    }

    // Resolved during render rather than seeded in an effect: a stale selection (a category
    // this player has no data in) simply falls back to the first tab.
    private var category: PlayerStatCategory? {
        if let selection, categories.contains(selection) { return selection }
        return categories.first
    }

    var body: some View {
        if let category {
            VStack(alignment: .leading, spacing: 0) {
                DepthTabBar(
                    options: categories.map {
                        DepthSegmentedOption(
                            value: $0, label: $0.title, identifier: "player-profile-full-tab-\($0.rawValue)"
                        )
                    },
                    selection: category,
                    onChange: { selection = $0 },
                    activeColor: mark
                )
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(alignment: .bottom) { hairline(DesignTokens.Colors.borderDefault) }

                caption(category)

                ForEach(Array(stats.enumerated()), id: \.element.id) { index, season in
                    row(season, index: index, category: category)
                }

                careerRow(category)
            }
            .monospacedDigit()
        }
    }

    private func caption(_ category: PlayerStatCategory) -> some View {
        Text("\(category.barMetricName) VS BEST")
        .font(.caption2.weight(.bold))
        .tracking(0.9)
        .foregroundStyle(DesignTokens.Colors.textFaintest)
        .padding(.top, 10)
        .padding(.bottom, 4)
        .accessibilityHidden(true)
    }

    private func row(_ season: PlayerSeasonStats, index: Int, category: PlayerStatCategory) -> some View {
        let key = "\(category.rawValue)-\(season.id)"
        let isOpen = expanded.contains(key)
        let details = category.details(season)
        let isNewest = index == 0
        let isCurrentTeam = currentTeamAbbrev != nil && season.teamAbbrev == currentTeamAbbrev

        return VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(reduceMotion ? nil : DesignTokens.Motion.selection) {
                    if isOpen { expanded.remove(key) } else { expanded.insert(key) }
                }
            } label: {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    rowFigures(
                        season: season, category: category, isNewest: isNewest,
                        isCurrentTeam: isCurrentTeam, chevron: details.isEmpty ? nil : isOpen
                    )
                    bar(
                        fraction: category.barFraction(season, among: stats),
                        color: isNewest ? mark : isCurrentTeam ? mark.opacity(0.5) : Color.white.opacity(0.22)
                    )
                }
                .padding(.vertical, 10)
                // DEP-395: the whole padded row accepts the tap, not just its glyphs.
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(details.isEmpty)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(PlayerStatLedger.rowLabel(for: season, category: category))
            .accessibilityValue(details.isEmpty ? "" : isOpen ? "Expanded" : "Collapsed")
            .accessibilityHint(details.isEmpty ? "" : "Shows more stats for this season")
            .accessibilityIdentifier("player-profile-full-season-\(season.season)")

            if isOpen {
                detailStrip(details)
                    .padding(.bottom, 11)
                    .transition(.opacity)
            }
        }
        .overlay(alignment: .top) { hairline(DesignTokens.Colors.borderSubtle) }
    }

    @ViewBuilder
    private func rowFigures(
        season: PlayerSeasonStats, category: PlayerStatCategory, isNewest: Bool,
        isCurrentTeam: Bool, chevron isOpen: Bool?
    ) -> some View {
        let year = Text(String(season.season))
            .font(.footnote.weight(isNewest ? .heavy : .bold))
            .foregroundStyle(isNewest ? mark : DesignTokens.Colors.textPrimary)
        let team = Text(season.teamAbbrev ?? "—")
            .font(.caption)
            .foregroundStyle(isCurrentTeam ? DesignTokens.Colors.textMuted : DesignTokens.Colors.textFaint)
        let headline = Text(category.headline(season).value)
            .font(.footnote.weight(.heavy))
            .foregroundStyle(DesignTokens.Colors.textPrimary)
        let summary = summaryText(category.summary(season))

        // At accessibility sizes the fixed year/team columns can't hold their text, so the
        // row stacks into an identity line over a figures line.
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                HStack(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm) {
                    year
                    team
                    Spacer(minLength: 0)
                    chevronIcon(isOpen)
                }
                headline
                summary
            }
        } else {
            HStack(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm) {
                year.frame(width: yearWidth, alignment: .leading)
                team.frame(width: teamWidth, alignment: .leading)
                Spacer(minLength: 10)
                headline
                summary.lineLimit(1).fixedSize()
                chevronIcon(isOpen)
            }
        }
    }

    private func summaryText(_ figures: [PlayerStatFigure]) -> some View {
        Text(figures.map { "\($0.value) \($0.short)" }.joined(separator: " · "))
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }

    @ViewBuilder
    private func chevronIcon(_ isOpen: Bool?) -> some View {
        Group {
            if let isOpen {
                Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(isOpen ? mark : DesignTokens.Colors.textFaintest)
            } else {
                Color.clear
            }
        }
        .frame(width: 14, alignment: .trailing)
    }

    private func bar(fraction: Double, color: Color) -> some View {
        Capsule()
            .fill(DesignTokens.Colors.borderSubtle)
            .frame(height: 6)
            .overlay(alignment: .leading) {
                GeometryReader { proxy in
                    Capsule()
                        .fill(color)
                        .frame(width: proxy.size.width * fraction)
                }
            }
            .accessibilityHidden(true)
    }

    // A hairline grid: cells sit on the app ground over a white-alpha backing, so the 1pt
    // gaps between them read as rules. Four figures lay out 2x2 rather than 3+1; any other
    // short final row is padded with blank cells so the backing never shows as a gray block.
    private func detailStrip(_ figures: [PlayerStatFigure]) -> some View {
        let columnCount = dynamicTypeSize.isAccessibilitySize ? 1
            : figures.count == 4 ? 2 : min(3, figures.count)
        let padded = figures.map(Optional.some)
            + Array(repeating: nil, count: (columnCount - figures.count % columnCount) % columnCount)
        return LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 1), count: columnCount),
            spacing: 1
        ) {
            ForEach(Array(padded.enumerated()), id: \.offset) { _, figure in
                VStack(alignment: .leading, spacing: 2) {
                    if let figure {
                        Text(figure.short)
                            .font(.caption2.weight(.bold))
                            .tracking(0.9)
                            .foregroundStyle(DesignTokens.Colors.textFaint)
                        Text(figure.value)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .padding(.horizontal, 10)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(DesignTokens.Colors.bg)
                .background(DesignTokens.Colors.surfaceCard2)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(figure.map { "\($0.spoken), \($0.value)" } ?? "")
                .accessibilityHidden(figure == nil)
            }
        }
        .background(DesignTokens.Colors.surfaceChip)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private func careerRow(_ category: PlayerStatCategory) -> some View {
        let career = PlayerStatLedger.careerTotals(stats)
        let games = career.games ?? 0
        // The row already leads with career GP, so a summary that is itself GP (single-metric
        // defensive categories) would print it twice.
        let summary = category.summary(career).filter { $0.short != "GP" }
        return HStack(alignment: .firstTextBaseline, spacing: DesignTokens.Spacing.sm) {
            Text("CAREER")
                .font(.caption2.weight(.heavy))
                .tracking(0.9)
                .foregroundStyle(mark)
                .frame(width: dynamicTypeSize.isAccessibilitySize ? nil : careerLabelWidth, alignment: .leading)
            Text("\(games) GP")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Spacer(minLength: 10)
            Text(category.headline(career).value)
                .font(.footnote.weight(.heavy))
                .foregroundStyle(mark)
            summaryText(summary)
            Color.clear.frame(width: 14)
        }
        .padding(.top, 11)
        .padding(.bottom, 2)
        .overlay(alignment: .top) { hairline(mark.opacity(0.45)) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            (["Career, \(games) games played", "\(category.headline(career).spoken) \(category.headline(career).value)"]
                + summary.map { "\($0.value) \($0.spoken)" })
                .joined(separator: ", ")
        )
        .accessibilityIdentifier("player-profile-full-career")
    }

    private func hairline(_ color: Color) -> some View {
        Rectangle().fill(color).frame(height: 1)
    }
}

// Stands in for the ledger while stats load, sized to the same row rhythm so the section
// doesn't jump when real rows land.
struct PlayerStatsLedgerSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Capsule().fill(DesignTokens.Colors.surfacePlaceholder).frame(width: 140, height: 12)
                .padding(.vertical, 16)
            ForEach(0..<3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Capsule().fill(DesignTokens.Colors.surfacePlaceholder).frame(width: 64, height: 12)
                        Spacer()
                        Capsule().fill(DesignTokens.Colors.surfacePlaceholder).frame(width: 96, height: 12)
                    }
                    Capsule().fill(DesignTokens.Colors.borderSubtle).frame(height: 6)
                }
                .padding(.vertical, 12)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading season stats")
    }
}
