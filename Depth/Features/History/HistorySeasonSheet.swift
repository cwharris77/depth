import SwiftUI

// Native counterpart to the web SeasonSheet: one deterministic VoiceOver row per season,
// with the live roster first and no alternate uniforms or rights-gated imagery.
struct HistorySeasonSheet: View {
    let seasons: [HistorySeason]
    let selectedSeason: HistorySeason
    let onSelect: (HistorySeason) -> Void

    var body: some View {
        DepthSheet(title: "Seasons", closeIdentifier: "history-season-close") {
            List(seasons) { season in
                Button {
                    onSelect(season)
                } label: {
                    HStack {
                        Text(label(for: season))
                        Spacer()
                        if season == selectedSeason {
                            // DEP-268: accent-tinted, matching UniformPickerSheet's
                            // selected-row checkmark — the default tint reads as
                            // system blue, a different "selected" color than the
                            // sheet's sibling.
                            Image(systemName: "checkmark")
                                .foregroundStyle(DesignTokens.Colors.accent)
                                .accessibilityLabel("Selected")
                        }
                    }
                    // DEP-281: without this, the trailing Spacer's transparent space
                    // between the label and the selected checkmark doesn't register
                    // taps — only the drawn Text/Image content did.
                    .contentShape(Rectangle())
                }
                .frame(minHeight: 44)
                .accessibilityIdentifier("history-season-\(season.year)")
                .accessibilityLabel("\(label(for: season))\(season == selectedSeason ? ", selected" : "")")
                .listRowBackground(DesignTokens.Colors.surfaceCard2)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollIndicators(.hidden)
            // Close is the shared X in the corner (via DepthSheet) — matching
            // SeasonPickerSheet (Stats/Schedule) and the other picker sheets. There is no
            // in-sheet "back" affordance: a roster viewing a past season returns via the
            // page's own "Back to current season" escape (SeasonPickerTrigger).
        }
    }

    private func label(for season: HistorySeason) -> String {
        switch season {
        case .current(let year): "\(year) · Roster"
        case .past(let year): "\(year)"
        }
    }
}
