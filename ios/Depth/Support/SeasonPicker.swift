import SwiftUI

// Shared season picker — trigger button + sheet — for Schedule and Stats, replacing the
// old inline SeasonChipRow (a flat horizontally-scrolling list of chips that stopped
// scaling once team_stats ingest landed seasons back to 1999, ~25+ entries). The sheet
// is the same List + toolbar "Back to current" shape as History's HistorySeasonSheet,
// generalized to a plain Int season instead of HistorySeason's current/past distinction
// — Schedule and Stats have no roster-vs-historical wrinkle to encode. Originally
// duplicated per-screen (DEP-278); unified into one component after that duplication
// carried a bug into both copies (a raw `Text("\(season) SEASON")` interpolation is a
// SwiftUI `LocalizedStringKey` literal, which formats an interpolated `Int` with
// locale grouping — "2,026" instead of "2026" — `Text(verbatim:)` here avoids it once,
// for both screens).
//
// Styled as a Liquid Glass control (`.buttonStyle(.glass)`, iOS 26+) — a clear/outlined
// button, matching the rest of the OS's current material language — with a plain
// bordered fallback pre-26 rather than gating the whole trigger behind availability.
struct SeasonPickerTrigger: View {
    let season: Int?
    let accent: Color
    let identifier: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(verbatim: season.map { "\($0) SEASON" } ?? "SEASON")
                    .font(.caption.bold())
                    .tracking(0.1)
                Image(systemName: "chevron.down")
                    .font(.caption2.bold())
            }
            .foregroundStyle(accent)
            .padding(.horizontal, DesignTokens.Spacing.sm)
        }
        .frame(minHeight: 44)
        .modifier(GlassTriggerStyle())
        .accessibilityIdentifier(identifier)
    }
}

/// Liquid Glass on iOS 26+ (the system's own clear/outlined material); a bordered
/// capsule standing in for it pre-26, since `.glass` itself isn't available there.
private struct GlassTriggerStyle: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.buttonStyle(.glass)
        } else {
            content
                .background(.ultraThinMaterial, in: Capsule())
                .overlay(Capsule().strokeBorder(DesignTokens.Colors.borderInput, lineWidth: 1))
        }
    }
}

struct SeasonPickerItem: Identifiable {
    let season: Int
    var isUpcoming: Bool = false

    var id: Int { season }
}

struct SeasonPickerSheet: View {
    /// Newest season first, matching both callers' natural query/stride order.
    let items: [SeasonPickerItem]
    let selectedSeason: Int
    let currentSeason: Int
    let accent: Color
    let identifierPrefix: String
    let onSelect: (Int) -> Void

    var body: some View {
        NavigationStack {
            List(items) { item in
                Button {
                    onSelect(item.season)
                } label: {
                    HStack {
                        Text(String(item.season))
                        if item.isUpcoming {
                            Text("UPCOMING")
                                .font(.caption2.bold())
                                .tracking(0.4)
                                .foregroundStyle(accent)
                        }
                        Spacer()
                        if item.season == selectedSeason {
                            Image(systemName: "checkmark")
                                .foregroundStyle(accent)
                                .accessibilityLabel("Selected")
                        }
                    }
                }
                .frame(minHeight: 44)
                .accessibilityIdentifier("\(identifierPrefix)-season-\(item.season)")
                .accessibilityLabel("\(item.season)\(item.season == selectedSeason ? ", selected" : "")")
                .listRowBackground(DesignTokens.Colors.surfaceCard2)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollIndicators(.hidden)
            .navigationTitle("Seasons")
            .navigationBarTitleDisplayMode(.inline)
            // Mirrors HistorySeasonSheet's DEP-245 escape hatch: once a past season is
            // selected, the current row can be scrolled far out of view in a long
            // 1999→present list, so pin a one-tap way back in the toolbar.
            .toolbar {
                if selectedSeason != currentSeason {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Back to current") {
                            onSelect(currentSeason)
                        }
                        .tint(accent)
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("\(identifierPrefix)-season-back-to-current")
                    }
                }
            }
        }
        .presentationBackground(DesignTokens.Colors.bg)
    }
}
