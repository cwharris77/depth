import SwiftUI

// First-run tutorial, screen one of two: a single full-screen welcome shown
// before any coachmark, with an explicit Skip action.
// Presented as a `.fullScreenCover` from ContentView so it reads as the app's own
// opening screen rather than a sheet stacked over content the user hasn't seen yet.
// Both actions end here: the main one hands off to OnboardingController, which goes on
// to the setup steps or straight to the coachmark tour; "Skip" ends the whole flow
// immediately. The tour is optional and this screen is not a gate.
struct WelcomeView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let controller: OnboardingController

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            ScrollView { welcomeContent }
                .background(DesignTokens.Colors.bg)
        } else {
            welcomeContent
        }
    }

    private var welcomeContent: some View {
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
                    controller.continueFromWelcome()
                } label: {
                    Text(controller.offersSetup ? "Get Started" : "Take the Tour")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .tint(DesignTokens.Colors.accent)
                .foregroundStyle(DesignTokens.Colors.onAccent)
                .accessibilityIdentifier("onboarding-welcome-tour")

                Button {
                    controller.skipWelcome()
                } label: {
                    Text("Skip")
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
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
