import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`.
// Deliberately offers no dismiss, no "continue anyway", and no navigation: DEP-425's
// whole purpose is that an old client cannot reach a backend that has moved past it, so
// this is the one screen in the app that blocks rather than degrades (the explicit,
// bounded exception to root CLAUDE.md invariant 6).
//
// Presented as a native `.alert` over an inert brand backdrop, matching the Clash of
// Clans pattern this feature is modeled on (Cooper's reference, 2026-09-01). The alert
// is the block; the backdrop exists only so there is never interactive app content
// behind it. Two consequences worth knowing:
//
//   * The alert carries a single button, so the ONLY way to dismiss it is tapping
//     Update — which leaves for the App Store. There is no cancel path by construction.
//   * A dismissed alert re-presents itself (see `.task(id:)` below), so returning from
//     the App Store — or a build where the store id is unconfigured and the tap goes
//     nowhere — lands back on the gate rather than on a bare backdrop the user is stuck
//     on with no affordance at all.
struct BlockingUpdateView: View {
    /// Optional server-authored copy from `app_config.maintenance_message`. Lets a
    /// specific outage or release be explained without shipping a build — the same
    /// "flip one row" property the minimum build itself has. Falls back to generic copy.
    var maintenanceMessage: String?

    @State private var isPresented = true

    var body: some View {
        ZStack {
            DesignTokens.Colors.bg.ignoresSafeArea()
            // Anchored to the top rather than centered: the alert sits mid-screen and
            // dims what is behind it, so a centered mark reads as a smudge under the
            // dialog instead of as branding.
            VStack {
                DepthBrandMark(size: 96)
                    .padding(.top, DesignTokens.Spacing.xl)
                Spacer()
            }
        }
        .alert("Update Available!", isPresented: $isPresented) {
            Button("Update") {
                // Nil only in a build whose APP_STORE_ID was never set (see
                // AppStoreUpdate.url). The alert re-presents either way, so an
                // unconfigured build blocks honestly instead of dead-ending.
                if let url = AppStoreUpdate.url {
                    UIApplication.shared.open(url)
                }
            }
        } message: {
            Text(maintenanceMessage ?? "A new version of the app is available.")
        }
        // Re-present after any dismissal. The single Update button is the only way to
        // dismiss, and tapping it hands off to the App Store — so this restores the gate
        // for the return trip rather than leaving the user on the bare backdrop.
        .task(id: isPresented) {
            guard !isPresented else { return }
            isPresented = true
        }
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
