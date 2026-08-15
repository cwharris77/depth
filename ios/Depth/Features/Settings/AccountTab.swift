import SwiftUI

// Tab 3 of the root TabView (2026-08-15 navigation-parity spec, locked decision #7):
// SettingsView's content is unchanged, it just stops being a sheet buried behind a
// toolbar button inside team detail and becomes always-reachable. The one thing this
// wrapper adds is the Data section's timestamp, which the team-list view model used to
// supply for free because Settings could only be opened from a screen that had already
// loaded it — reachable-at-launch means reading it here instead.
struct AccountTab: View {
    @State private var dataSavedAt: Date?
    @State private var isLoadingTimestamp = true

    let repository: CachingDepthRepository
    let sessionStore: AuthSessionStore
    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()

    var body: some View {
        SettingsView(
            sessionStore: sessionStore,
            authService: authService,
            dataSavedAt: dataSavedAt,
            dataSavedAtLoading: isLoadingTimestamp,
            events: events
        )
        .task {
            dataSavedAt = await repository.teamListCachedAt()
            isLoadingTimestamp = false
        }
    }
}
