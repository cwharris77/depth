import SwiftUI

// The team switcher (2026-08-15 navigation-parity spec, locked decisions #4 and #5) —
// the native equivalent of the web's NavSwitcher: tapping the team name in the
// navigation bar opens this sheet, picking a team swaps the chart underneath and
// dismisses. It is deliberately thin: all list/search/empty/error behavior and the sheet
// chrome come from TeamListView / TeamListPickerSheet unchanged, so there is no second
// search or list implementation to keep in sync. All it owns is "dismiss after picking",
// which CompareView deliberately does not do.
struct TeamSwitcherSheet: View {
    let repository: CachingDepthRepository
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    let selectedTeamId: String
    let onSelect: (String) -> Void
    var onSelectPlayer: ((PlayerHit) -> Void)? = nil

    var body: some View {
        TeamListPickerSheet(
            repository: repository,
            events: events,
            title: "Teams",
            selectedTeamId: selectedTeamId
        ) { teamId in
            onSelect(teamId)
        } onSelectPlayer: { hit in
            onSelectPlayer?(hit)
        }
    }
}
