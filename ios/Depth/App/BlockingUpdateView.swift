import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`. The App
// Store product page URL is a placeholder until Gate 0 (T1) reserves the real App Store
// Connect record and app id.
struct BlockingUpdateView: View {
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            DepthBrandMark(size: 96)
            ContentUnavailableView {
                Label("Update Required", systemImage: "arrow.down.circle")
            } description: {
                Text("A newer version of Depth is required to continue.")
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            } actions: {
                Button("Update") {
                    if let url = URL(string: AppStoreUpdate.url) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(.borderedProminent)
                .frame(minWidth: 44, minHeight: 44)
            }
            // DEP-269: this screen renders outside RootTabView's `.tint`, so the Update
            // button (and icon) would otherwise fall back to the system blue — pinned to
            // the app accent here.
            .tint(DesignTokens.Colors.accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Colors.bg)
    }
}

/// App Store surface, tracked separately so the forced-update screen and any future
/// store-facing links stay in one source of truth.
enum AppStoreUpdate {
    /// The placeholder update URL — the real App Store id doesn't exist yet (depends on
    /// App Store Connect setup, a separate tracked Gate 0 effort), so this must stay a
    /// placeholder constant rather than an invented id.
    static let url = "itms-apps://itunes.apple.com/app/id0"
}
