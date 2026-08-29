import SwiftUI

// Shared season picker — trigger button + sheet — for Schedule and Stats, replacing the
// old inline SeasonChipRow (a flat horizontally-scrolling list of chips that stopped
// scaling once team_stats ingest landed seasons back to 1999, ~25+ entries). The sheet
// is the same List shape as History's HistorySeasonSheet, generalized to a plain Int
// season instead of HistorySeason's current/past distinction — Schedule and Stats have
// no roster-vs-historical wrinkle to encode. Originally duplicated per-screen
// (DEP-278); unified into one component after that duplication carried a bug into both
// copies (a raw `Text("\(season) SEASON")` interpolation is a SwiftUI
// `LocalizedStringKey` literal, which formats an interpolated `Int` with locale
// grouping — "2,026" instead of "2026" — `Text(verbatim:)` here avoids it once, for
// both screens).
//
// Cooper report: the sheet's own "Back to current" toolbar button rendered clipped in
// `.topBarLeading` (squeezed against the centered "Seasons" title), and its placement
// was backwards anyway — once you're already looking at the season list, tapping the
// current row does the same thing a dedicated button would. The escape hatch belongs
// next to the *trigger* that opened the sheet, in the same row, so it stays reachable
// without opening the sheet at all. `SeasonPickerTrigger` now renders that affordance
// itself; the sheet no longer has one.
//
// Styled as a Liquid Glass control (`.buttonStyle(.glass)`, iOS 26+) — a clear/outlined
// button, matching the rest of the OS's current material language — with a plain
// bordered fallback pre-26 rather than gating the whole trigger behind availability.
struct SeasonPickerTrigger: View {
    let season: Int?
    let identifier: String
    /// True while a non-current season is selected — shows the "back to current"
    /// button beside the trigger.
    let isHistorical: Bool
    let onBackToCurrent: () -> Void
    let action: () -> Void

    var body: some View {
        // `Spacer()` only appears when the back-to-current button does, so a single
        // trigger still just hugs its own content (leading) instead of centering.
        HStack(spacing: DesignTokens.Spacing.xs) {
            Button(action: action) {
                HStack(spacing: 4) {
                    // Cooper report: some teams' accent colors read poorly against this
                    // capsule's translucent gray material — white (the same color the
                    // sheet's own close "X" uses) stays legible against every team.
                    Text(verbatim: season.map { "\($0) SEASON" } ?? "SEASON")
                        .font(.caption.bold())
                        .tracking(0.1)
                    Image(systemName: "chevron.down")
                        .font(.caption2.bold())
                }
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .padding(.horizontal, DesignTokens.Spacing.sm)
            }
            .frame(minHeight: 44)
            .modifier(GlassTriggerStyle())
            .accessibilityIdentifier(identifier)

            if isHistorical {
                Spacer()

                // Cooper report: a bare icon read as unlabeled and sat too close to the
                // trigger — spelling it out and pinning it to the row's far edge (web's
                // `justify-content: space-between`) reads as a deliberate second control,
                // not an afterthought. Same capsule height as the trigger and the same
                // white used there, for the same low-contrast-team-accent reason.
                Button(action: onBackToCurrent) {
                    HStack(spacing: 4) {
                        Text("Back to current season")
                            .font(.caption.bold())
                        Image(systemName: "arrow.uturn.backward")
                            .font(.caption2.bold())
                    }
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .padding(.horizontal, DesignTokens.Spacing.sm)
                }
                .frame(minHeight: 44)
                .modifier(GlassTriggerStyle())
                .accessibilityIdentifier("\(identifier)-back-to-current")
            }
        }
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
    let accent: Color
    let identifierPrefix: String
    let onSelect: (Int) -> Void

    var body: some View {
        DepthSheet(
            title: "Seasons",
            showDragIndicator: true,
            closeIdentifier: "\(identifierPrefix)-season-close"
        ) {
            List(Array(items.enumerated()), id: \.element.id) { index, item in
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
                    // DEP-281: without this, the trailing Spacer between the season
                    // label and the selected checkmark doesn't register taps.
                    .contentShape(Rectangle())
                }
                .frame(minHeight: 44)
                .accessibilityIdentifier("\(identifierPrefix)-season-\(item.season)")
                .accessibilityLabel("\(item.season)\(item.season == selectedSeason ? ", selected" : "")")
                // Rounded top corners on the first row and bottom corners on the last —
                // interior rows stay square so they read as one continuous card, not a
                // stack of separately-rounded pills. Softens the flat edges that used to
                // butt straight into the sheet's own top/bottom padding.
                .listRowBackground(
                    UnevenRoundedRectangle(
                        topLeadingRadius: index == 0 ? DesignTokens.Radius.sm : 0,
                        bottomLeadingRadius: index == items.count - 1 ? DesignTokens.Radius.sm : 0,
                        bottomTrailingRadius: index == items.count - 1 ? DesignTokens.Radius.sm : 0,
                        topTrailingRadius: index == 0 ? DesignTokens.Radius.sm : 0
                    )
                    .fill(DesignTokens.Colors.surfaceCard2)
                )
                // Plain-style List draws a separator above the first row and below the
                // last by default (unlike a Section's interior rows) — hide those two
                // edges so the row's own surfaceCard2 background reads as the divider,
                // matching TeamListView's TeamSearchRowPresentation treatment.
                .listRowSeparator(index == 0 ? .hidden : .visible, edges: .top)
                .listRowSeparator(
                    TeamSearchRowPresentation.showsSeparator(after: index, count: items.count) ? .visible : .hidden,
                    edges: .bottom
                )
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollIndicators(.hidden)
            // A plain List reserves its own top/bottom content margin by default — with
            // no row background there, it read as a flat strip of the sheet's plain `bg`
            // wedged between the nav bar and the first card. Zeroing it lets the rounded
            // first/last row sit flush against the chrome instead.
            .contentMargins(.top, 0, for: .scrollContent)
            .contentMargins(.bottom, 0, for: .scrollContent)
            // No "Back to current" here — that escape hatch now lives on
            // `SeasonPickerTrigger`, beside the button that opens this sheet
            // (Cooper report: it was clipped in this toolbar, and redundant once
            // you're already looking at the season list — tapping the current row
            // does the same thing). The X in the corner comes from `DepthSheet`.
        }
    }
}
