import SwiftUI

// Season-by-season stats table, shared by PlayerDetailView's quick-glance card (sheet-width)
// and PlayerProfileView's full-screen destination (screen-width) — extracted from
// PlayerDetailView so DEP-369's new screen doesn't reimplement the same table (2026-09-10).

// Season-stats columns share one centered width, whether they are labels or values. The table
// uses its preferred readable width for sparse rows and grows only as far as the card allows
// for stat-heavy rows (DEP-292). Every value still arrives paired with its spoken column name
// via `PlayerStatsAccessibility.rowLabel`.
enum PlayerStatsTableLayout {
    enum ColumnAlignment: Equatable {
        case center

        var swiftUI: Alignment {
            .center
        }
    }

    static let alignment: ColumnAlignment = .center
    static let containerAlignment: ColumnAlignment = .center
}

struct PlayerStatsTable: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let stats: [PlayerSeasonStats]
    let columns: [PlayerStatColumn]
    let accent: Color

    // Keeps short rows compact while leaving room for the widest compact stat labels and
    // values. More columns use the card's available width instead.
    @ScaledMetric(relativeTo: .footnote) private var preferredColumnWidth: CGFloat = 96

    private var preferredTableWidth: CGFloat {
        CGFloat(columns.count + 2) * preferredColumnWidth
    }

    var body: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                // Each season remains one unit, with its column names visible rather
                // than compressed into a phone-width table (DEP-415).
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    ForEach(stats) { season in
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                            Text("\(String(season.season)) · \(season.teamAbbrev ?? "—")")
                                .font(.headline)
                            ForEach(columns, id: \.self) { column in
                                Text("\(column.header): \(column.value(for: season))")
                                    .font(.body)
                            }
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(PlayerStatsAccessibility.rowLabel(for: season, columns: columns))
                    }
                }
                .padding(DesignTokens.Spacing.sm)
            } else {
                ViewThatFits(in: .horizontal) {
                    table.frame(width: preferredTableWidth)
                    table.frame(maxWidth: .infinity)
                }
            }
        }
        .depthCard(dense: true, padded: false)
    }

    private var table: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                cell("SZN", header: true)
                cell("TM", header: true)
                ForEach(columns, id: \.self) { column in
                    cell(column.header, header: true)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.sm)
            // Web parity (components/PlayerCardSeasonStats.tsx): a hairline separates
            // the header from data rows — missing before (DEP-227).
            .overlay(alignment: .bottom) {
                Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1)
            }
            // Each data row carries the full spoken label, so repeating the compact
            // headers as their own VoiceOver stops is pure noise.
            .accessibilityHidden(true)

            ForEach(Array(stats.enumerated()), id: \.element.id) { index, season in
                // Web parity: the most recent season (index 0 — `stats` arrives
                // newest-first) is highlighted, its year colored accent (DEP-227).
                let isCurrent = index == 0
                HStack(spacing: DesignTokens.Spacing.sm) {
                    cell("\(season.season)", valueColor: isCurrent ? accent : nil)
                    cell(season.teamAbbrev ?? "—")
                    ForEach(columns, id: \.self) { column in
                        cell(column.value(for: season))
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isCurrent ? accent.opacity(0.05) : .clear)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(
                    PlayerStatsAccessibility.rowLabel(for: season, columns: columns)
                )
            }
        }
    }

    private func cell(_ value: String, header: Bool = false, valueColor: Color? = nil) -> some View {
        Text(value)
            .font(header ? .caption.bold() : .footnote.weight(.semibold))
            .foregroundStyle(valueColor ?? (header ? DesignTokens.Colors.textMuted : DesignTokens.Colors.textPrimary))
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(
                maxWidth: .infinity,
                alignment: PlayerStatsTableLayout.alignment.swiftUI
            )
    }
}

// Sized against the same scaled metrics as the table it stands in for, so the section
// doesn't resize when real rows land (AGENTS.md's flash-then-jump rule). Matches the
// table's layout: two fixed-width label cells, then one flexible cell per stat column.
struct PlayerStatsSkeleton: View {
    let columnCount: Int

    // Matches the table's tightened DEP-234 metrics (labelWidth 36, row spacing 12).
    @ScaledMetric(relativeTo: .footnote) private var cellWidth: CGFloat = 36
    @ScaledMetric(relativeTo: .footnote) private var cellHeight: CGFloat = 14

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(0..<2, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(DesignTokens.Colors.surfacePlaceholder)
                            .frame(width: cellWidth, height: cellHeight)
                    }
                    ForEach(0..<columnCount, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(DesignTokens.Colors.surfacePlaceholder)
                            .frame(maxWidth: .infinity)
                            .frame(height: cellHeight)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 72)
        .depthCard(dense: true)
        .redacted(reason: .placeholder)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading season stats")
    }
}
