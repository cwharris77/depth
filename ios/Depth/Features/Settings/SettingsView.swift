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
// DEP-319: the Settings card also carries the favorite-team picker and the
// "open this team when I start the app" toggle, mirroring web's AccountView (the picker
// is where the web puts favorites — the settings surface, not a per-team control). Both
// are account-gated by RLS (rows surface only while signed in; signing out hides them
// entirely, like web's signed-out sign-in prompt), setting a favorite opts into
// auto-opening, and the toggle row appears only once a favorite is set.
//
// Layout (design import, Settings.dc.html): Account / Preferences / About cards, each
// under its own section label, with Sign Out and Delete Account demoted out of the
// cards entirely — Sign Out as a full-width secondary button, Delete Account as a
// centered text link below it — so the two routine-vs-destructive account actions read
// at their own weight instead of living inside a settings card. Tight spacing within
// each card, generous spacing between tiers, so the grouping is visible at a glance
// rather than one repeated gap value flattening everything.
struct SettingsView: View {
    @Bindable var sessionStore: AuthSessionStore

    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    var clearPrivateData: @Sendable () async -> Void = {}
    /// DEP-251: drives the "Take the tour" row below — replays the first-run welcome +
    /// coachmark sequence on demand, independent of whether it's already been seen.
    let onboarding: OnboardingController

    /// DEP-323: the user's chosen name-presentation style, shared with TeamDetailView
    /// through the same defaults key so the field picks it up immediately. Persisted via
    /// AppStorage (UserDefaults), so the choice survives relaunch.
    @AppStorage(FieldNameMode.storageKey) private var fieldNameMode: FieldNameMode = .callouts

    // DEP-319: favorite-team + start-on-favorite state for this sheet, backed by the
    // shared user_settings row. Injected (not read from DepthEnvironment) so the sheet
    // is testable and the three call sites (TeamDetailView, CompareView, UniformsTab)
    // share one store instance.
    private let settingsStore: UserSettingsStore
    /// The 32-team list driving the favorite picker, loaded once when the sheet appears.
    @State private var teams: [Team] = []

    @State private var showAuth = false
    @State private var showDeletion = false
    @State private var signOutError: DepthAuthError?
    // DEP-252 (Cooper review): Account moved from a full tab to a sheet, so it needs an
    // explicit close affordance now — a tab never had this problem (switching tabs was
    // the exit), a modal sheet does.
    @Environment(\.dismiss) private var dismiss

    init(
        sessionStore: AuthSessionStore,
        authService: any DepthAuthServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        clearPrivateData: @escaping @Sendable () async -> Void = {},
        onboarding: OnboardingController,
        settingsStore: UserSettingsStore
    ) {
        self.sessionStore = sessionStore
        self.authService = authService
        self.events = events
        self.clearPrivateData = clearPrivateData
        self.onboarding = onboarding
        self.settingsStore = settingsStore
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    if let user = sessionStore.user {
                        accountTier(email: user.email)
                        settingsTier
                        signOutButton
                        dangerLink
                    } else {
                        signInPrompt
                        // The name-presentation preference is a local, account-independent
                        // choice, so it stays reachable whether or not the user is signed in.
                        settingsTier
                    }

                    aboutTier
                }
                .padding(DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
            .background(DesignTokens.Colors.bg)
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Close")
                    .accessibilityIdentifier("account-close-button")
                }
            }
        }
        .tint(DesignTokens.Colors.accent)
        .task {
            // DEP-319: refresh the favorite/toggle from the server row on every sheet
            // presentation (idempotent; remote is nil while signed out, so this is a
            // no-op there) and resolve the 32-team list for the picker once.
            await settingsStore.load()
            guard let teams = try? await DepthEnvironment.repository.teams() else { return }
            self.teams = teams
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

    // Account card — the avatar reuses AuthSheet's success-circle tint/border treatment
    // (accent 14%-fill, accent 30%-stroke) so the two identity moments in the account
    // flow read as one system.
    private func accountTier(email: String) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel("Account", tint: DesignTokens.Colors.accent)
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
            .frame(maxWidth: .infinity, alignment: .leading)
            .depthCard()
        }
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
            sectionLabel("Preferences", tint: DesignTokens.Colors.accent)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                if sessionStore.user != nil {
                    // DEP-319: favorite-team picker, mirroring web's AccountView select.
                    // Rendered only while signed in — settingsTier itself is shown to both
                    // signed-in and signed-out visitors (DEP-323 promoted Player Names to
                    // always-visible), but the favorite row is still RLS-gated, so it needs
                    // its own explicit guard here rather than inheriting one from the tier.
                    favoriteTeamPicker
                    if let favoriteTeamId = settingsStore.favoriteTeamId, !favoriteTeamId.isEmpty {
                        Divider().overlay(DesignTokens.Colors.borderSubtle)
                        startOnFavoriteToggle
                    }
                    if let updateError = settingsStore.updateError {
                        Divider().overlay(DesignTokens.Colors.borderSubtle)
                        Text(updateError)
                            .font(.footnote)
                            .foregroundStyle(DesignTokens.Colors.textMuted)
                            .accessibilityIdentifier("settings-favorite-update-error")
                    }
                    Divider().overlay(DesignTokens.Colors.borderSubtle)
                }

                // A menu picker rather than DepthSegmentedControl: three labels this long
                // do not fit a segmented track at phone width, and shortening them to fit
                // ("Lines"/"Fit"/"Off") would leave users guessing what they picked.
                Picker("Player Names", selection: $fieldNameMode) {
                    ForEach(FieldNameMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .accessibilityIdentifier("settings-field-name-mode")

                Text(
                    "How player names appear on the depth chart. Names under the dot are "
                        + "easiest to read; leader lines keep every name on screen when the "
                        + "field gets crowded."
                )
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .depthCard()
        }
    }

    // DEP-319: mirrors web's favorite-team select (components/AccountView.tsx) — the
    // menu lists "No favorite" plus every team, alphabetized like the sign-in page's
    // options list. Renders a redacted placeholder while the row is still loading so it
    // never flashes the wrong value before the server read lands.
    private var favoriteTeamPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text("Favorite Team")
                .font(.caption2.weight(.bold))
                .tracking(0.6)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            if settingsStore.isLoading {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Colors.surfacePlaceholder)
                    .frame(height: 44)
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
                    .accessibilityIdentifier("settings-favorite-loading")
            } else {
                Picker("Favorite Team", selection: favoriteTeamSelection) {
                    Text("No favorite").tag(String?.none)
                    ForEach(teams, id: \.id) { team in
                        Text("\(team.city) \(team.name)").tag(String?.some(team.id))
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .accessibilityIdentifier("settings-favorite-team")
            }
            Text("Your favorite opens automatically when you start the app.")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textMuted)
        }
    }

    private var favoriteTeamSelection: Binding<String?> {
        Binding(
            get: { settingsStore.favoriteTeamId },
            set: { settingsStore.selectTeam($0) }
        )
    }

    // DEP-319: the "open this team when I start the app" toggle. Shown only once a
    // favorite is set (web parity) and only consulted by startup resolution when one is.
    private var startOnFavoriteToggle: some View {
        Toggle(isOn: startOnFavoriteBinding) {
            Text("Open this team when I start the app")
                .font(.body)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
        }
        .tint(DesignTokens.Colors.accent)
        .frame(minHeight: 44)
        .accessibilityIdentifier("settings-start-on-favorite")
    }

    private var startOnFavoriteBinding: Binding<Bool> {
        Binding(
            get: { settingsStore.startOnFavorite },
            set: { settingsStore.setStartOnFavorite($0) }
        )
    }

    // DEP-269: 44pt hit target on every account action. Full-width secondary button
    // rather than a card row (design import, Settings.dc.html) — Sign Out is routine
    // enough to stand on its own, not bundled into the preferences card.
    private var signOutButton: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Button {
                Task { await signOut() }
            } label: {
                Text("Sign Out")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(DesignTokens.Colors.textPrimary)
            .frame(minHeight: 44)

            if let signOutError {
                errorChip(signOutError.message, identifier: "settings-sign-out-error")
            }
        }
    }

    // Plain centered text link, not a card + button (design import, Settings.dc.html) —
    // reads at a lower, more deliberate weight than Sign Out so a permanently
    // destructive action never competes visually with a routine one.
    private var dangerLink: some View {
        Button("Delete Account", role: .destructive) {
            showDeletion = true
        }
        .font(.footnote)
        .frame(maxWidth: .infinity, minHeight: 44)
        .accessibilityIdentifier("settings-delete-account")
    }

    private var aboutTier: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel("About", tint: DesignTokens.Colors.textMuted)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                LabeledContent("Name", value: AppBuildInfo.displayName)
                    .accessibilityIdentifier("settings-about-name")
                Divider().overlay(DesignTokens.Colors.borderSubtle)
                LabeledContent("Version", value: AppBuildInfo.version)
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
