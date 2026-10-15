import Observation
import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`.
// Deliberately offers no dismiss, no "continue anyway", and no navigation: the whole
// purpose is that an old client cannot reach a backend that has moved past it, so this is
// the one screen in the app that blocks rather than degrades.
//
// A system alert over the same backdrop and mark the launch screen and the checking view
// draw, so the transition into the blocked state never moves or redraws the mark. A system
// alert is dismissed by its own button, so `UpdateAlertPresenter` re-presents it after every
// dismissal; the view underneath is only the backdrop, so there is nothing to reach.
struct BlockingUpdateView: View {
    /// Optional server-authored copy from `app_config.maintenance_message`. Lets a
    /// specific outage or release be explained without shipping a build — the same
    /// "flip one row" property the minimum build itself has. Falls back to generic copy.
    var maintenanceMessage: String?

    @State private var presenter = UpdateAlertPresenter()

    var body: some View {
        StartupBackdrop()
            .alert(
                "Update is available!",
                isPresented: Binding(
                    get: { presenter.isPresented },
                    set: { isPresented in
                        if !isPresented { Task { await presenter.didDismiss() } }
                    })
            ) {
                Button("Update") {
                    // Nil only in a build whose APP_STORE_ID was never set (see
                    // AppStoreUpdate.url). The alert is re-presented either way, so an
                    // unconfigured build blocks honestly instead of dead-ending.
                    if let url = AppStoreUpdate.url {
                        UIApplication.shared.open(url)
                    }
                }
            } message: {
                Text(maintenanceMessage ?? "Good news! A new version of the app is available.")
            }
    }
}

/// Keeps the forced-update alert on screen: the system dismisses an alert when its button is
/// tapped, so a dismissal flips the state off and straight back on.
@Observable @MainActor
final class UpdateAlertPresenter {
    private(set) var isPresented = true

    func didDismiss() async {
        isPresented = false
        // The system alert has to finish going away before it can be presented again;
        // flipping the state back within the same turn is coalesced and shows nothing.
        try? await Task.sleep(for: .milliseconds(350))
        isPresented = true
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
