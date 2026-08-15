import SwiftUI

// Native counterpart to the web SeasonSheet: one deterministic VoiceOver row per season,
// with the live roster first and no alternate uniforms or rights-gated imagery.
struct HistorySeasonSheet: View {
    let seasons: [HistorySeason]
    let selectedSeason: HistorySeason
    let onSelect: (HistorySeason) -> Void

    var body: some View {
        NavigationStack {
            List(seasons) { season in
                Button {
                    onSelect(season)
                } label: {
                    HStack {
                        Text(label(for: season))
                        Spacer()
                        if season == selectedSeason {
                            Image(systemName: "checkmark")
                                .accessibilityLabel("Selected")
                        }
                    }
                }
                .frame(minHeight: 44)
                .accessibilityIdentifier("history-season-\(season.year)")
                .accessibilityLabel("\(label(for: season))\(season == selectedSeason ? ", selected" : "")")
            }
            .navigationTitle("Seasons")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func label(for season: HistorySeason) -> String {
        switch season {
        case .current(let year): "\(year) · Roster"
        case .past(let year): "\(year)"
        }
    }
}
