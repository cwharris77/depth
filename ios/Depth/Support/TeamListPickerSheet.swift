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
            // Top-trailing X, matching the web NavSwitcher's close and the player card's
            // dismiss (Cooper's visual pass: replace the left "Cancel").
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Close")
                }
            }
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
