import SwiftUI

// The shared team-list picker sheet (DEP-262): the NavigationStack + inline title +
// top-trailing xmark that used to be duplicated between TeamSwitcherSheet (Depth Charts
// tab) and CompareView's "Pick a team" sheet. One presentation over the 32-team
// TeamListView, so the two hosts can't drift (a stock sheet is the kind of chrome that
// gets re-styled once and leaves the other copy stale). Wraps TeamListView — the only
// intended content. The caller owns what selecting a team *does* (`onSelectTeam`); this
// sheet only decides whether to additionally dismiss on selection, since the two hosts
// differ there: the Depth Charts switcher dismisses after picking, CompareView keeps its
// sheet open via its own `pickingSlot` binding.
struct TeamListPickerSheet: View {
    @Environment(\.dismiss) private var dismiss

    let repository: CachingDepthRepository
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    let title: String
    let selectedTeamId: String
    let onSelectTeam: (String) -> Void
    var onSelectPlayer: ((PlayerHit) -> Void)? = nil
    /// `true` (the Depth Charts team switcher) dismisses the sheet after a selection;
    /// CompareView passes `false` and closes through its own `pickingSlot` binding.
    var dismissOnSelect: Bool = true

    var body: some View {
        NavigationStack {
            TeamListView(
                repository: repository,
                events: events,
                selectedTeamId: selectedTeamId
            ) { teamId in
                onSelectTeam(teamId)
                if dismissOnSelect { dismiss() }
            } onSelectPlayer: { hit in
                onSelectPlayer?(hit)
                if dismissOnSelect { dismiss() }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
        }
        // DEP-273: the sheet must stay dismissible even while TeamListView's search field
        // is active. SwiftUI's inline `.searchable` takes over the entire nav bar when
        // focused — hiding *any* nav-bar toolbar item (trailing, leading, and cancellation
        // placements all disappear; verified empirically) and floating the search field to
        // a bottom pill instead. So the close X can't live in the nav-bar toolbar if it
        // must survive search. It renders as a persistent top-trailing overlay instead —
        // always visible and tappable at every search state. Anchored to the
        // NavigationStack itself (not to TeamListView's content) so it sits in the
        // nav-bar's own band, above the conference picker, rather than overlapping the
        // picker's top row — the picker's AFC/NFC fill color read as if it were the X's
        // own tint when the two collided there.
        .overlay(alignment: .topTrailing) {
            // A neutral scrim behind the glyph so it stays legible over whatever content
            // scrolls beneath it, independent of the current team's color.
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .frame(width: 32, height: 32)
                    .background(DesignTokens.Colors.surfaceChip, in: Circle())
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
            .padding(.trailing, 4)
            .zIndex(1)
        }
        .presentationBackground(DesignTokens.Colors.bg)
        // `.sheet()` content gets a fresh UITraitCollection rather than inheriting
        // ContentView's UI_TESTING_DYNAMIC_TYPE override — see that modifier's doc
        // comment. Re-applied here so the picker's team-row scaling (TeamBadge's
        // @ScaledMetric) actually reflects the accessibility size in real use and in
        // AccessibilityUITests.
        .modifier(UITestingDynamicTypeOverride())
        .accessibilityIdentifier("team-switcher-sheet")
    }
}
