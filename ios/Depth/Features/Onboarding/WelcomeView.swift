import SwiftUI

// DEP-251 first-run tutorial, screen one of two: a single full-screen welcome shown
// before any coachmark — "what the app is + a clear Skip", per the locked direction.
// Presented as a `.fullScreenCover` from ContentView so it reads as the app's own
// opening screen rather than a sheet stacked over content the user hasn't seen yet.
// Both actions end here: "Take the Tour" hands off to OnboardingController's coachmark
// sequence (starting on Depth Charts), "Skip" ends the whole flow immediately — the
// tour itself is optional, this screen is not a gate the user must pass through.
struct WelcomeView: View {
    let controller: OnboardingController

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            DepthBrandMark(size: 72)

            VStack(spacing: DesignTokens.Spacing.sm) {
                Text("Welcome to \(AppBuildInfo.displayName)")
                    .font(.largeTitle.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .multilineTextAlignment(.center)
                Text(
                    "Every NFL team's depth chart, on a real field. Tap a player for their bio and stats, or compare two teams side by side."
                )
                .font(.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }

            Spacer()

            VStack(spacing: DesignTokens.Spacing.sm) {
                Button {
                    controller.beginCoachmarks()
                } label: {
                    Text("Take the Tour")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(DesignTokens.Colors.accent)
                .foregroundStyle(DesignTokens.Colors.onAccent)
                .frame(minHeight: 44)
                .accessibilityIdentifier("onboarding-welcome-tour")

                Button("Skip") {
                    controller.skipWelcome()
                }
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .frame(minHeight: 44)
                .accessibilityIdentifier("onboarding-welcome-skip")
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.lg)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Colors.bg)
        .accessibilityIdentifier("onboarding-welcome")
    }
}
