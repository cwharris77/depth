import SwiftUI

// The team switcher (2026-08-15 navigation-parity spec, locked decisions #4 and #5) —
// the native equivalent of the web's NavSwitcher: tapping the team name in the
// navigation bar opens this sheet, picking a team swaps the chart underneath and
// dismisses. It is deliberately thin: all list/search/empty/error behavior comes from
// TeamListView unchanged, so there is no second search or list implementation to keep
// in sync.
struct TeamSwitcherSheet: View {
    @Environment(\.dismiss) private var dismiss

    let repository: CachingDepthRepository
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    let selectedTeamId: String
    let onSelect: (String) -> Void

    var body: some View {
        NavigationStack {
            TeamListView(
                repository: repository,
                events: events,
                selectedTeamId: selectedTeamId
            ) { teamId in
                onSelect(teamId)
                dismiss()
            }
            .navigationTitle("Teams")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .frame(minWidth: 44, minHeight: 44)
                }
            }
        }
        .presentationBackground(DesignTokens.Colors.bg)
        .accessibilityIdentifier("team-switcher-sheet")
    }
}
