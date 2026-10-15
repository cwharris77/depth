import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`.
// Deliberately offers no dismiss, no "continue anyway", and no navigation: the whole
// purpose is that an old client cannot reach a backend that has moved past it, so this is
// the one screen in the app that blocks rather than degrades.
//
// A centered dialog over the same backdrop and mark the launch screen and the checking
// view draw, so the transition into the blocked state never moves or redraws the mark: the
// dialog sits in the half of the screen below it.
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
            StartupBackdrop()
            // Two equal halves: the mark owns the center of the screen, so the dialog
            // starts below the mark's bottom edge in the lower half.
            VStack(spacing: 0) {
                Color.clear
                dialog
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .padding(.top, StartupBackdrop.markSize / 2 + DesignTokens.Spacing.lg)
                    .frame(maxHeight: .infinity, alignment: .top)
            }
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

/// The launch screen's backdrop and mark, drawn at the same size and position as
/// `LaunchScreen.storyboard` (180 pt, centered on the full screen, `LaunchBackground`
/// color, the same `LaunchMark.png`) so the handoff from the storyboard is invisible.
/// Every startup state that follows draws on top of this and must never move the mark.
struct StartupBackdrop: View {
    static let markSize: CGFloat = 180

    var body: some View {
        ZStack {
            Color("LaunchBackground")
            mark
        }
        .ignoresSafeArea()
    }

    @ViewBuilder private var mark: some View {
        if let image = UIImage(named: "LaunchMark") {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(width: Self.markSize, height: Self.markSize)
        } else {
            DepthBrandMark(size: Self.markSize)
        }
    }
}

// Held on screen while the update gate waits on the live `app_config` read, before
// anything that reads Supabase mounts. It continues the launch storyboard: same mark, same
// position, same background. A thin spinner fades in below the mark only if the wait runs
// past `cueDelay`, so a fast launch never shows it; it is offset rather than stacked with
// the mark so it cannot shift the mark.
struct UpdateGateCheckingView: View {
    var cueDelay: Duration = .milliseconds(400)

    @State private var isCueVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            StartupBackdrop()
            ProgressView()
                .tint(DesignTokens.Colors.accent)
                .opacity(isCueVisible ? 1 : 0)
                .offset(y: StartupBackdrop.markSize / 2 + DesignTokens.Spacing.xl)
                .accessibilityIdentifier("update-gate-loading")
        }
        .accessibilityIdentifier("update-gate-checking")
        .task {
            try? await Task.sleep(for: cueDelay)
            withAnimation(reduceMotion ? nil : .easeIn(duration: 0.3)) {
                isCueVisible = true
            }
        }
    }
}

/// App Store surface, tracked separately so the forced-update screen and any future
/// store-facing links stay in one source of truth.
enum AppStoreUpdate {
    /// The App Store product page, built from `APP_STORE_ID` in the active `.xcconfig`.
    ///
    /// Returns nil while that id is unset (the placeholder `0`), which is the state
    /// today: the App Store Connect record is not configured, and an invented id would
    /// ship a button that opens nothing. Wiring it through build
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
