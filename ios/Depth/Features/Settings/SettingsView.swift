import SwiftUI

// Account settings surface shared by anonymous and authenticated users. Sign-in is a
// sheet rather than a navigation replacement, preserving public browsing continuity.
// The About section satisfies design spec Gate 0 item 9 (in-app non-affiliation
// disclaimer); the Data section satisfies Milestone 2B item 24 ("data timestamps") with
// copy honest about what the timestamp is (an on-device cache time, not ESPN's ingestion
// `updated_at`). Privacy/support entry points are explicitly out of scope here — see
// `.superpowers/sdd/2026-08-14-native-ios-app/task-8d-settings-about-timestamps-brief.md`:
// no real production domain/support contact exists yet (T1/Gate 0 is still open), and
// guessing a placeholder URL/email is worse than omitting the row.
struct SettingsView: View {
    @Bindable var sessionStore: AuthSessionStore

    let authService: any DepthAuthServicing
    /// The team list's on-device cache timestamp, supplied by `AccountTab`.
    let dataSavedAt: Date?
    /// True while `AccountTab` is still reading the timestamp. Account is now reachable
    /// at launch, so this section can render before the value exists — without this the
    /// Data row would show its "no saved data" fallback and then jump to a real date
    /// (AGENTS.md mistake #16). It renders a redacted placeholder instead.
    var dataSavedAtLoading: Bool = false
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    var clearPrivateData: @Sendable () async -> Void = {}

    @State private var showAuth = false
    @State private var showDeletion = false
    @State private var signOutError: DepthAuthError?

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
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
                        .foregroundStyle(.secondary)
                        Button("Sign In") { showAuth = true }
                    }
                }

                if let signOutError {
                    Section { Text(signOutError.message).foregroundStyle(.red) }
                }

                Section("About") {
                    LabeledContent("Name", value: AppBuildInfo.displayName)
                        .accessibilityIdentifier("settings-about-name")
                    LabeledContent("Version", value: AppBuildInfo.versionAndBuild)
                        .accessibilityIdentifier("settings-about-version")
                    Text(AppBuildInfo.nonAffiliationDisclaimer)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("settings-about-disclaimer")
                }

                Section("Data") {
                    if dataSavedAtLoading {
                        SavedOnDeviceLabel(cachedAt: Date())
                            .redacted(reason: .placeholder)
                            .accessibilityHidden(true)
                    } else {
                        SavedOnDeviceLabel(cachedAt: dataSavedAt)
                            .accessibilityIdentifier("settings-data-saved-at")
                    }
                    Text(DataTimestamp.explanation)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("settings-data-explanation")
                }
            }
            .navigationTitle("Account")
        }
        .sheet(isPresented: $showAuth) {
            AuthSheet(service: authService, sessionStore: sessionStore, events: events)
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
            }
        }
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
