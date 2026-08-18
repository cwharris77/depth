import SwiftUI

// Account settings surface shared by anonymous and authenticated users. Sign-in is a
// sheet rather than a navigation replacement, preserving public browsing continuity.
// The About section satisfies design spec Gate 0 item 9 (in-app non-affiliation
// disclaimer) and DEP-160's Apple requirement that the privacy policy be reachable from
// within the app — the row links to the live production /privacy page
// (AppBuildInfo.privacyPolicyURL) via the system browser. A support contact remains a
// future Gate 0 item; no placeholder email is invented here.
struct SettingsView: View {
    @Bindable var sessionStore: AuthSessionStore

    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    var clearPrivateData: @Sendable () async -> Void = {}

    @State private var showAuth = false
    @State private var showDeletion = false
    @State private var signOutError: DepthAuthError?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    sectionLabel("Account")
                    accountCard

                    if let signOutError {
                        sectionLabel("Sign out")
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text(signOutError.message)
                                .font(.footnote)
                                .foregroundStyle(DesignTokens.Colors.danger)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .depthCard()
                    }

                    sectionLabel("About")
                    aboutCard
                }
                .padding(DesignTokens.Spacing.md)
            }
            .background(DesignTokens.Colors.bg)
            .navigationTitle("Account")
        }
        .sheet(isPresented: $showAuth) {
            AuthSheet(service: authService, sessionStore: sessionStore, events: events)
                .presentationBackground(DesignTokens.Colors.bg)
        }
        .sheet(isPresented: $showDeletion) {
            if let email = sessionStore.user?.email {
                AccountDeletionSheet(
                    viewModel: AccountDeletionViewModel(
                        email: email,
                        service: authService,
                        sessionStore: sessionStore,
                        clearPrivateData: clearPrivateData
                    )
                )
                .presentationBackground(DesignTokens.Colors.bg)
            }
        }
    }

    // Section headers read as muted captions above each card, matching web's
    // section-label pattern rather than Form's built-in grouped headers.
    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textMuted)
    }

    private var accountCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let user = sessionStore.user {
                LabeledContent("Email", value: user.email)
                Button("Sign Out") {
                    Task { await signOut() }
                }
                Button("Delete Account", role: .destructive) {
                    showDeletion = true
                }
            } else {
                Text(
                    "Sign in only when you want to save private preferences or depth orders."
                )
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                Button("Sign In") { showAuth = true }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .depthCard()
    }

    private var aboutCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            LabeledContent("Name", value: AppBuildInfo.displayName)
                .accessibilityIdentifier("settings-about-name")
            LabeledContent("Version", value: AppBuildInfo.versionAndBuild)
                .accessibilityIdentifier("settings-about-version")
            if let url = AppBuildInfo.privacyPolicyURL {
                Link("Privacy Policy", destination: url)
                    .accessibilityIdentifier("settings-about-privacy")
            }
            Text(AppBuildInfo.nonAffiliationDisclaimer)
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .accessibilityIdentifier("settings-about-disclaimer")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .depthCard()
    }

    private func signOut() async {
        signOutError = nil
        do {
            try await sessionStore.signOut()
            await clearPrivateData()
        } catch let error as DepthAuthError {
            signOutError = error
        } catch {
            signOutError = .server
        }
    }
}
