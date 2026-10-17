import SwiftUI

// Settings, shared by signed-out and signed-in users. Sign-in is a sheet rather than a
// navigation replacement, preserving public browsing continuity.
//
// Layout: plain rows on the page background under small section labels, with no card,
// separator or leading icon. Spacing carries the grouping: tight inside a section, wide
// between sections. The accent appears only on a switch that is on and on the selected
// option. Each kind of choice has one control: a switch for on or off, visible option
// rows for one of a few, and the team picker sheet for one of 32.
//
// Account actions sit at the bottom: the signed-in address directly above Sign Out, and
// Delete Account as a quieter link below it.
struct SettingsView: View {
    @Bindable var sessionStore: AuthSessionStore

    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    var clearPrivateData: @Sendable () async -> Void = {}
    /// Drives the "Take the tour" row below — replays the first-run welcome +
    /// coachmark sequence on demand, independent of whether it's already been seen.
    let onboarding: OnboardingController

    /// The user's chosen name-presentation style, shared with TeamDetailView
    /// through the same defaults key so the field picks it up immediately. Persisted via
    /// AppStorage (UserDefaults), so the choice survives relaunch.
    @AppStorage(FieldNameMode.storageKey) private var fieldNameMode: FieldNameMode = .callouts

    // Favorite-team + start-on-favorite state for this sheet, backed by the
    // shared user_settings row. Injected (not read from DepthEnvironment) so the sheet
    // is testable and the three call sites (TeamDetailView, CompareView, UniformsTab)
    // share one store instance.
    private let settingsStore: UserSettingsStore
    /// The 32-team list driving the favorite picker, loaded once when the sheet appears.
    @State private var teams: [Team] = []

    @State private var showAuth = false
    @State private var showFavoritePicker = false
    @State private var showDeletion = false
    @State private var signOutError: DepthAuthError?
    #if INTERNAL_BUILD
        @State private var showFeatureFlags = false
    #endif
    // Account is presented in a sheet rather than a full tab, so it needs an explicit
    // close affordance — a tab never had this problem (switching tabs was
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
        DepthSheet(
            title: "Settings",
            closeIdentifier: "account-close-button"
        ) {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    if settingsStore.canHoldFavorite { teamSection }
                    if DepthEnvironment.featureFlags.isEnabled(.proactiveNotifications) {
                        SettingsSection("Notifications") {
                            NotificationSettingsRows(
                                store: DepthEnvironment.notificationSettings,
                                favoriteTeam: favoriteTeam,
                                onChooseFavorite: { showFavoritePicker = true })
                        }
                    }
                    playerNamesSection
                    aboutSection
                    if let user = sessionStore.user {
                        accountSection(email: user.email)
                    } else {
                        signInPrompt
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
        }
        .tint(DesignTokens.Colors.accent)
        .task {
            // Refresh the favorite/toggle from the server row on every sheet
            // presentation (idempotent; a no-op read while signed out) and resolve the
            // 32-team list once.
            await settingsStore.load()
            if let teams = try? await DepthEnvironment.repository.teams() {
                self.teams = teams
            }
            // The permission may have changed in iOS Settings since the last foreground.
            // Inert while the feature is switched off.
            await DepthEnvironment.notificationSettings.refresh()
        }
        .sheet(isPresented: $showAuth) {
            AuthSheet(service: authService, sessionStore: sessionStore, events: events)
        }
        .sheet(isPresented: $showFavoritePicker) {
            TeamListPickerSheet(
                repository: DepthEnvironment.repository,
                events: events,
                title: "Favorite Team",
                selectedTeamId: settingsStore.favoriteTeamId ?? "",
                leadingOption: .noFavorite(in: settingsStore)
            ) { teamId in
                settingsStore.selectTeam(teamId)
            }
        }
        #if INTERNAL_BUILD
            .sheet(isPresented: $showFeatureFlags) {
                FeatureFlagsSheet(store: DepthEnvironment.featureFlags)
            }
        #endif
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
            }
        }
    }

    private var favoriteTeam: Team? {
        guard let id = settingsStore.favoriteTeamId else { return nil }
        return teams.first { $0.id == id }
    }

    // MARK: - Your team

    private var teamSection: some View {
        SettingsSection("Your team") {
            if settingsStore.isLoading, settingsStore.favoriteTeamId == nil {
                SettingsRowSkeleton()
                    .accessibilityIdentifier("settings-favorite-loading")
            } else {
                Button {
                    showFavoritePicker = true
                } label: {
                    SettingsValueRow(
                        title: "Favorite team",
                        value: favoriteTeam.map { "\($0.city) \($0.name)" } ?? "None",
                        symbol: "chevron.right")
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("settings-favorite-team")
            }
            if let favoriteTeamId = settingsStore.favoriteTeamId, !favoriteTeamId.isEmpty {
                Toggle("Open on launch", isOn: startOnFavoriteBinding)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .frame(minHeight: SettingsMetrics.rowHeight)
                    .accessibilityIdentifier("settings-start-on-favorite")
            }
            if let updateError = settingsStore.updateError {
                Text(updateError)
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .accessibilityIdentifier("settings-favorite-update-error")
            }
        }
    }

    private var startOnFavoriteBinding: Binding<Bool> {
        Binding(
            get: { settingsStore.startOnFavorite },
            set: { settingsStore.setStartOnFavorite($0) }
        )
    }

    // MARK: - Player names

    private var playerNamesSection: some View {
        SettingsSection("Player names on the field") {
            ForEach(FieldNameMode.allCases) { mode in
                SettingsOptionRow(
                    title: mode.title, detail: mode.summary, isSelected: mode == fieldNameMode
                ) {
                    fieldNameMode = mode
                }
                .accessibilityIdentifier("settings-field-name-mode-\(mode.rawValue)")
            }
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        SettingsSection("About") {
            if let url = AppBuildInfo.privacyPolicyURL {
                Link(destination: url) {
                    SettingsValueRow(title: "Privacy Policy", symbol: "arrow.up.right")
                }
                .accessibilityIdentifier("settings-about-privacy")
            }
            if let url = AppBuildInfo.termsOfServiceURL {
                Link(destination: url) {
                    SettingsValueRow(title: "Terms of Service", symbol: "arrow.up.right")
                }
                .accessibilityIdentifier("settings-about-terms")
            }
            if let url = AppBuildInfo.feedbackMailtoURL {
                Link(destination: url) {
                    SettingsValueRow(title: "Send Feedback", symbol: "arrow.up.right")
                }
                .accessibilityIdentifier("settings-about-feedback")
            }
            // Dismisses this sheet first: the coachmark targets live on the page
            // underneath it, and a sheet left presented would resurface mid-tour.
            Button {
                dismiss()
                onboarding.replay()
            } label: {
                SettingsValueRow(title: "Take the Tour", symbol: "chevron.right")
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("settings-take-the-tour")
            #if INTERNAL_BUILD
                Toggle(
                    "Bypass forced-update gate",
                    isOn: Bindable(DepthEnvironment.developerSettings).bypassUpdateGate
                )
                .tint(DesignTokens.Colors.accent)
                .frame(minHeight: SettingsMetrics.linkRowHeight)
                .accessibilityIdentifier("settings-bypass-update-gate")
                Button {
                    showFeatureFlags = true
                } label: {
                    SettingsValueRow(title: "Feature Flags", symbol: "chevron.right")
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("settings-feature-flags")
            #endif
            LabeledContent("Version", value: AppBuildInfo.version)
                .frame(minHeight: SettingsMetrics.linkRowHeight)
                .accessibilityIdentifier("settings-about-version")

            Text(AppBuildInfo.nonAffiliationDisclaimer)
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .padding(.top, DesignTokens.Spacing.sm)
                .accessibilityIdentifier("settings-about-disclaimer")
        }
    }

    // MARK: - Account

    private func accountSection(email: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            (Text("Signed in as ").foregroundStyle(DesignTokens.Colors.textMuted)
                + Text(email).foregroundStyle(DesignTokens.Colors.textPrimary))
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .accessibilityIdentifier("settings-signed-in-as")

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

            Button("Delete Account", role: .destructive) {
                showDeletion = true
            }
            .font(.footnote)
            .frame(maxWidth: .infinity, minHeight: 44)
            .accessibilityIdentifier("settings-delete-account")
        }
    }

    private var signInPrompt: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Sign in")
                .font(.title2.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .frame(maxWidth: .infinity)
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

// MARK: - Row primitives

enum SettingsMetrics {
    /// Rows that hold a control or a value.
    static let rowHeight: CGFloat = 52
    /// Rows that only lead somewhere.
    static let linkRowHeight: CGFloat = 48
}

/// A small label over a group of rows. The gap inside a section is tight; the caller
/// spaces sections apart.
struct SettingsSection<Content: View>: View {
    private let title: String
    private let content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .accessibilityAddTraits(.isHeader)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// A row's label: a title, an optional current value, and a trailing symbol saying where
/// a tap leads. Stacks at accessibility sizes, where a title and a value no longer fit
/// on one line. The frame and content shape are part of the label so the whole row
/// accepts taps.
struct SettingsValueRow: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let title: String
    var value: String?
    let symbol: String

    var body: some View {
        let stacks = dynamicTypeSize.isAccessibilitySize && value != nil
        let layout =
            stacks
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.xs))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.sm))
        layout {
            Text(title)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            if !stacks { Spacer(minLength: DesignTokens.Spacing.sm) }
            if let value {
                Text(value)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .lineLimit(stacks ? nil : 1)
                    .minimumScaleFactor(stacks ? 1 : 0.75)
            }
            if !stacks {
                Image(systemName: symbol)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                    .accessibilityHidden(true)
            }
        }
        .frame(
            maxWidth: .infinity,
            minHeight: value == nil ? SettingsMetrics.linkRowHeight : SettingsMetrics.rowHeight,
            alignment: .leading
        )
        .contentShape(Rectangle())
    }
}

/// One choice out of a few, shown with what it means so the choice can be read before
/// it is made. The selected row carries the only accent in its group.
struct SettingsOptionRow: View {
    let title: String
    let detail: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body.weight(isSelected ? .semibold : .regular))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text(detail)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(
                        isSelected ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textFaint,
                        DesignTokens.Colors.accent
                    )
                    .accessibilityHidden(true)
            }
            .padding(.vertical, DesignTokens.Spacing.sm)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Stands in for a value row while its value is loading, with the same height so the
/// rows below do not move when it arrives.
private struct SettingsRowSkeleton: View {
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(maxWidth: 110, maxHeight: 14)
            Spacer()
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Colors.surfacePlaceholder)
                .frame(maxWidth: 90, maxHeight: 14)
        }
        .frame(maxWidth: .infinity, minHeight: SettingsMetrics.rowHeight)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading favorite team")
    }
}
