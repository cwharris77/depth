import SwiftUI

// Native counterpart to the web SeasonSheet: one deterministic VoiceOver row per season,
// with the live roster first and no alternate uniforms or rights-gated imagery.
struct HistorySeasonSheet: View {
    let seasons: [HistorySeason]
    let selectedSeason: HistorySeason
    let currentSeason: Int
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
            // DEP-245: once a past season is selected, the sheet's current-season row is
            // back at the top of a long (1999→present) list — pin a one-tap escape in
            // the toolbar so it stays reachable at any scroll position. Same
            // `selectImmediately(.current(...))` path the roster's "Back to today" uses.
            .toolbar {
                if isPastSeasonSelected {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Back to current") {
                            onSelect(.current(currentSeason))
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityIdentifier("history-season-back-to-current")
                    }
                }
            }
        }
    }

    private var isPastSeasonSelected: Bool {
        if case .past = selectedSeason { return true }
        return false
    }

    private func label(for season: HistorySeason) -> String {
        switch season {
        case .current(let year): "\(year) · Roster"
        case .past(let year): "\(year)"
        }
    }
}
