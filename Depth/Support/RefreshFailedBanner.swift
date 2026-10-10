import SwiftUI

// Shown above content that stayed on screen after a pull-to-refresh failed. Pulling again is
// the retry, so the banner carries no action of its own.
struct RefreshFailedBanner: View {
    var body: some View {
        Label("Couldn't refresh — showing saved data", systemImage: "exclamationmark.triangle")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityIdentifier("refresh-failed-banner")
    }
}
