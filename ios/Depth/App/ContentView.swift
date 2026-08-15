import SwiftUI

// Root view — the T6 vertical slice (searchable team list → depth chart → player
// detail), gated by the T5 update screen when the installed build is below the server's
// minimum. Composition only: real state lives in TeamListView/UpdateGateViewModel.
struct ContentView: View {
    @State private var updateGate = UpdateGateViewModel(repository: DepthEnvironment.repository)

    var body: some View {
        Group {
            if updateGate.isBlocked {
                BlockingUpdateView()
            } else {
                TeamListView(repository: DepthEnvironment.repository, preferences: DepthEnvironment.preferences)
            }
        }
        .task { await updateGate.check() }
    }
}

#Preview {
    ContentView()
}
