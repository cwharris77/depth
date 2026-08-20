import SwiftUI

// Account settings surface shared by anonymous and authenticated users. Sign-in is a
// sheet rather than a navigation replacement, preserving public browsing continuity.
// The About section satisfies design spec Gate 0 item 9 (in-app non-affiliation
// disclaimer) and DEP-160's Apple requirement that the privacy policy be reachable from
// within the app — the row links to the live production /privacy page
// (AppBuildInfo.privacyPolicyURL) via the system browser. A "Send Feedback" row opens a
// pre-addressed mailto (AppBuildInfo.feedbackMailtoURL) — the app's only feedback
// channel, since there's no in-app form or analytics dashboard to otherwise surface
// user-reported issues.
//
// Layout (DEP-257 design pass): three visually distinct tiers instead of one uniform
// stack of look-alike cards — a bare identity header (no card chrome, mirrors web's
// AccountView.tsx avatar+"Signed in as" treatment), a routine-actions card (Sign Out),
// a separately red-tinted danger card (Delete Account, matching web's danger-zone
// treatment so a permanently destructive action never reads at the same weight as a
// routine one), and an About card with the privacy link as a real disclosure row and
// the disclaimer demoted to footer text below the card rather than crammed inside it.
// Tight spacing within each card, generous spacing between tiers, so the grouping is
// visible at a glance rather than one repeated gap value flattening everything.
struct SettingsView: View {
    @Bindable var sessionStore: AuthSessionStore

    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    var clearPrivateData: @Sendable () async -> Void = {}
    /// DEP-251: drives the "Take the tour" row below — replays the first-run welcome +
    /// coachmark sequence on demand, independent of whether it's already been seen.
    let onboarding: OnboardingController

    @State private var showAuth = false
    @State private var showDeletion = false
    @State private var signOutError: DepthAuthError?
    // DEP-252 (Cooper review): Account moved from a full tab to a sheet, so it needs an
    // explicit close affordance now — a tab never had this problem (switching tabs was
    // the exit), a modal sheet does.
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    if let user = sessionStore.user {
                        identityHeader(email: user.email)
                        settingsTier
                        dangerTier
                    } else {
                        signInPrompt
                    }

                    aboutTier
                }
                .padding(DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
            .background(DesignTokens.Colors.bg)
            .navigationTitle("Account")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Close")
                    .accessibilityIdentifier("account-close-button")
                }
            }
        }
        .tint(DesignTokens.Colors.accent)
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

    // Bare identity anchor — no card, matching web's un-boxed header row. The avatar
    // reuses AuthSheet's success-circle tint/border treatment (accent 14%-fill,
    // accent 30%-stroke) so the two identity moments in the account flow read as one
    // system.
    private func identityHeader(email: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Colors.accent.opacity(0.14))
                Circle()
                    .strokeBorder(DesignTokens.Colors.accent.opacity(0.3), lineWidth: 1)
                Text(String(email.prefix(1)).uppercased())
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(DesignTokens.Colors.accent)
            }
            .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: 2) {
                Text("SIGNED IN AS")
                    .font(.caption2.weight(.bold))
                    .tracking(0.8)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                Text(email)
                    .font(.body.weight(.bold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
        }
        .accessibilityElement(children: .combine)
    }

    // No card wrapper — mirrors web's bare "Sign in" heading + copy + button rather
    // than boxing the page's primary call-to-action.
    private var signInPrompt: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Sign in")
                .font(.title2.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text("Sign in only when you want to save private preferences or depth orders.")
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Button {
                showAuth = true
            } label: {
                Text("Sign In")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Colors.accent)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .frame(minHeight: 44)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var settingsTier: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel("Settings", tint: DesignTokens.Colors.accent)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                // DEP-269: 44pt hit target on every account action.
                Button("Sign Out") {
                    Task { await signOut() }
                }
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .depthCard()

            if let signOutError {
                errorChip(signOutError.message, identifier: "settings-sign-out-error")
            }
        }
    }

    private var dangerTier: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel("Danger Zone", tint: DesignTokens.Colors.danger)
            Button("Delete Account", role: .destructive) {
                showDeletion = true
            }
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .depthCard()
        }
    }

    private var aboutTier: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel("About", tint: DesignTokens.Colors.textMuted)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                LabeledContent("Name", value: AppBuildInfo.displayName)
                    .accessibilityIdentifier("settings-about-name")
                Divider().overlay(DesignTokens.Colors.borderSubtle)
                LabeledContent("Version", value: AppBuildInfo.versionAndBuild)
                    .accessibilityIdentifier("settings-about-version")
                Divider().overlay(DesignTokens.Colors.borderSubtle)
                // DEP-251: replays the first-run welcome + coachmark sequence — the
                // ticket's "replayable from Settings" requirement. Independent of the
                // persisted "seen" flag; this always starts the flow from the top.
                // Dismissing this sheet first (rather than leaving TeamDetailView's
                // `showAccount` stale) matters: the coachmark targets live on the roster
                // page underneath this sheet, and leaving `showAccount` true here caused
                // Settings to resurface mid-tour once the welcome cover's own dismissal
                // reconciled — reading as the tour "exiting" right after the first step.
                Button {
                    dismiss()
                    onboarding.replay()
                } label: {
                    HStack {
                        Text("Take the Tour")
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(DesignTokens.Colors.textFaint)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .accessibilityIdentifier("settings-take-the-tour")
                if let url = AppBuildInfo.feedbackMailtoURL {
                    Divider().overlay(DesignTokens.Colors.borderSubtle)
                    Link(destination: url) {
                        HStack {
                            Text("Send Feedback")
                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(DesignTokens.Colors.textFaint)
                        }
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .accessibilityIdentifier("settings-about-feedback")
                }
                if let url = AppBuildInfo.privacyPolicyURL {
                    Divider().overlay(DesignTokens.Colors.borderSubtle)
                    Link(destination: url) {
                        HStack {
                            Text("Privacy Policy")
                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(DesignTokens.Colors.textFaint)
                        }
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .accessibilityIdentifier("settings-about-privacy")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .depthCard()

            Text(AppBuildInfo.nonAffiliationDisclaimer)
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .padding(.top, DesignTokens.Spacing.sm)
                .accessibilityIdentifier("settings-about-disclaimer")
        }
    }

    private func sectionLabel(_ title: String, tint: Color) -> some View {
        Text(title.uppercased())
            .font(.caption.weight(.bold))
            .tracking(0.6)
            .foregroundStyle(tint)
    }

    private func errorChip(_ message: String, identifier: String) -> some View {
        Text(message)
            .font(.footnote)
            .foregroundStyle(DesignTokens.Colors.danger)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Colors.danger.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .strokeBorder(DesignTokens.Colors.danger.opacity(0.3), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .accessibilityIdentifier(identifier)
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
