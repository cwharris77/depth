import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`.
// Deliberately offers no dismiss, no "continue anyway", and no navigation: DEP-425's
// whole purpose is that an old client cannot reach a backend that has moved past it, so
// this is the one screen in the app that blocks rather than degrades (the explicit,
// bounded exception to root CLAUDE.md invariant 6).
//
// Modeled on the Clash of Clans update prompt (Cooper's reference, 2026-09-01): a
// centered dialog over a dimmed brand backdrop, with a single Update action.
//
// Built as a dialog rather than a system `.alert` for two reasons, both load-bearing:
//   * iOS 26 leading-aligns an alert's title and message and exposes no API to center
//     them, and the reference is centered.
//   * A system alert is dismissed by its own button, so blocking with one required
//     re-presenting it after every dismissal. A plain view simply never goes away —
//     there is no dismissal to race, which is the property this screen actually needs.
struct BlockingUpdateView: View {
    /// Optional server-authored copy from `app_config.maintenance_message`. Lets a
    /// specific outage or release be explained without shipping a build — the same
    /// "flip one row" property the minimum build itself has. Falls back to generic copy.
    var maintenanceMessage: String?

    var body: some View {
        ZStack {
            DesignTokens.Colors.bg.ignoresSafeArea()
            // Anchored to the top rather than centered: the dialog sits mid-screen, so a
            // centered mark would read as a smudge behind it instead of as branding.
            VStack {
                DepthBrandMark(size: 96)
                    .padding(.top, DesignTokens.Spacing.xl)
                Spacer()
            }
            dialog
                .padding(.horizontal, DesignTokens.Spacing.xl)
        }
    }

    private var dialog: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text("Update is available!")
                    .font(.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(maintenanceMessage ?? "Good news! A new version of the app is available.")
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)

            Button {
                // Nil only in a build whose APP_STORE_ID was never set (see
                // AppStoreUpdate.url). The dialog stays put either way, so an
                // unconfigured build blocks honestly instead of dead-ending.
                if let url = AppStoreUpdate.url {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("Update")
                    .font(.headline)
                    .foregroundStyle(DesignTokens.Colors.onAccent)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(DesignTokens.Colors.accent)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityIdentifier("update-gate-update-button")
        }
        .padding(DesignTokens.Spacing.lg)
        .depthCard()
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
