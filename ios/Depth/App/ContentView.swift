import SwiftUI

// Root view — the T6 vertical slice (searchable team list → depth chart → player
// detail), gated by the T5 update screen when the installed build is below the server's
// minimum. Composition only: real state lives in TeamListView/UpdateGateViewModel.
struct ContentView: View {
    @State private var updateGate = UpdateGateViewModel(repository: DepthEnvironment.repository)
    @State private var authSessionStore = DepthEnvironment.authSessionStore

    var body: some View {
        Group {
            if updateGate.isBlocked {
                BlockingUpdateView()
            } else {
                TeamListView(
                    repository: DepthEnvironment.repository,
                    preferences: DepthEnvironment.preferences,
                    sessionStore: authSessionStore,
                    authService: DepthEnvironment.authService,
                    overrideService: DepthEnvironment.overrideService,
                    events: DepthEnvironment.appEvents
                )
            }
        }
        .task {
            DepthEnvironment.appEvents.record(.appLaunch)
            authSessionStore.start()
            await authSessionStore.refresh()
            // Screenshot capture needs a deterministic signed-out start regardless of
            // whatever real session a prior manual run left in this simulator's
            // Keychain — sign out unconditionally after the normal restore above runs,
            // rather than skipping restore, so this behaves the same as a real
            // freshly-installed, never-signed-in app (see task-9d-screenshots-brief.md).
            if ProcessInfo.processInfo.arguments.contains("UI_TESTING_APPSTORE_SCREENSHOTS") {
                try? await authSessionStore.signOut()
            }
            await updateGate.check()
        }
    }
}

#Preview {
    ContentView()
}
