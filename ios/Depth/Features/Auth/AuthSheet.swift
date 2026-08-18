import SwiftUI

// Native email OTP sheet for every private-feature entry point. It never replaces the
// public navigation stack; dismissal returns the user to the content they were browsing.
struct AuthSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: AuthFlowViewModel

    init(
        service: any DepthAuthServicing, sessionStore: AuthSessionStore,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        _viewModel = State(
            initialValue: AuthFlowViewModel(service: service, sessionStore: sessionStore, events: events))
    }

    var body: some View {
        NavigationStack {
            Form {
                if viewModel.step == .email {
                    emailSection
                } else {
                    codeSection
                }
            }
            .scrollIndicators(.hidden)
            .navigationTitle("Sign In")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private var emailSection: some View {
        Section {
            TextField("Email", text: $viewModel.email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .accessibilityIdentifier("auth-email")
            Button("Email me a code") {
                Task { await viewModel.sendCode() }
            }
            .disabled(viewModel.isSubmitting)
            .accessibilityIdentifier("auth-send-code")
        } footer: {
            inlineError
        }
    }

    private var codeSection: some View {
        Section {
            Text("Enter the six-digit code sent to \(viewModel.normalizedEmail).")
                .font(.footnote)
                .foregroundStyle(.secondary)
            TextField("Code", text: $viewModel.code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .accessibilityIdentifier("auth-code")
            Button("Verify") {
                Task {
                    if await viewModel.verifyCode() { dismiss() }
                }
            }
            .disabled(viewModel.isSubmitting)
            .accessibilityIdentifier("auth-verify-code")

            TimelineView(.periodic(from: .now, by: 1)) { context in
                if viewModel.canResend(at: context.date) {
                    Button("Send a new code") { Task { await viewModel.sendCode() } }
                        .disabled(viewModel.isSubmitting)
                } else if let availableAt = viewModel.resendAvailableAt {
                    Text(
                        "Send a new code in \(max(1, Int(availableAt.timeIntervalSince(context.date).rounded(.up))))s"
                    )
                    .foregroundStyle(.secondary)
                }
            }
            Button("Use a different email") { viewModel.editEmail() }
        } footer: {
            inlineError
        }
    }

    @ViewBuilder
    private var inlineError: some View {
        if let error = viewModel.error {
            Text(error.message)
                .foregroundStyle(.red)
                .accessibilityIdentifier("auth-error")
        }
    }
}
