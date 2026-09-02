import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`.
// Deliberately offers no dismiss, no "continue anyway", and no navigation: DEP-425's
// whole purpose is that an old client cannot reach a backend that has moved past it, so
// this is the one screen in the app that blocks rather than degrades (the explicit,
// bounded exception to root CLAUDE.md invariant 6).
struct BlockingUpdateView: View {
    /// Optional server-authored copy from `app_config.maintenance_message`. Lets a
    /// specific outage or release be explained without shipping a build — the same
    /// "flip one row" property the minimum build itself has. Falls back to generic copy.
    var maintenanceMessage: String?

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            DepthBrandMark(size: 96)
            ContentUnavailableView {
                Label("Update Required", systemImage: "arrow.down.circle")
            } description: {
                Text(maintenanceMessage ?? "A newer version of The Sticks is required to continue.")
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            } actions: {
                // No button at all when the App Store id hasn't been configured yet —
                // a dead link that silently does nothing is worse than no affordance on
                // a screen the user cannot leave. See AppStoreUpdate.url.
                if let url = AppStoreUpdate.url {
                    Button("Update") {
                        UIApplication.shared.open(url)
                    }
                    .buttonStyle(.borderedProminent)
                    .frame(minWidth: 44, minHeight: 44)
                }
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

// DEP-425: held on screen while the update gate resolves, before anything that reads
// Supabase mounts. Only a first-ever launch (no cached app_config) ever sees it; it
// mirrors the launch storyboard so that hold reads as the launch screen persisting
// rather than as a distinct screen flashing by.
struct UpdateGateCheckingView: View {
    var body: some View {
        DepthBrandMark(size: 96)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DesignTokens.Colors.bg)
            .accessibilityIdentifier("update-gate-checking")
    }
}

/// App Store surface, tracked separately so the forced-update screen and any future
/// store-facing links stay in one source of truth.
enum AppStoreUpdate {
    /// The App Store product page, built from `APP_STORE_ID` in the active `.xcconfig`.
    ///
    /// Returns nil while that id is unset (the placeholder `0`), which is the state
    /// today: the real App Store Connect record is a separate tracked Gate 0 effort, and
    /// an invented id would ship a button that opens nothing. Wiring it through build
    /// config rather than a source constant means turning the gate fully live is a
    /// one-line xcconfig change, not a code change — the same "flip one value" property
    /// the server-side minimum build has.
    static let url: URL? = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "APP_STORE_ID") as? String,
            let id = Int(raw.trimmingCharacters(in: .whitespaces)),
            id > 0
        else {
            return nil
        }
        return URL(string: "itms-apps://itunes.apple.com/app/id\(id)")
    }()
}
