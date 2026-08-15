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
            await updateGate.check()
        }
    }
}

#Preview {
    ContentView()
}
