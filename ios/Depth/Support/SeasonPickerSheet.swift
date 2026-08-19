import SwiftUI

// Shared season-picker sheet for Schedule and Stats, replacing the old inline
// SeasonChipRow — a flat horizontally-scrolling list of chips that stopped scaling once
// team_stats ingest landed seasons back to 1999 (~25+ entries). Same List + toolbar
// "Back to current" shape as History's HistorySeasonSheet, but generalized to a plain
// Int season instead of HistorySeason's current/past distinction — Schedule and Stats
// have no roster-vs-historical wrinkle to encode.
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
