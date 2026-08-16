import SwiftUI

// Tab 3 of the root TabView (2026-08-15 navigation-parity spec, locked decision #7):
// SettingsView's content is unchanged, it just stops being a sheet buried behind a
// toolbar button inside team detail and becomes always-reachable.
struct AccountTab: View {
    let repository: CachingDepthRepository
    let sessionStore: AuthSessionStore
    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()

    var body: some View {
        SettingsView(
            sessionStore: sessionStore,
            authService: authService,
            events: events
        )
    }
}