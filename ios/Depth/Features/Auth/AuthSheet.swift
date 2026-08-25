import SwiftUI

// Native email OTP sheet for every private-feature entry point. It never replaces the
// public navigation stack; dismissal returns the user to the content they were browsing.
// Card-based surface (DEP-257 design pass), matching AccountDeletionSheet's ScrollView +
// depthCard() treatment rather than a stock Form — the two sheets in the account flow now
// share one visual system. A boxed OtpCodeField (matching web's OtpInput) replaces the bare
// numeric TextField, and a success step (matching web's DEP-75 "You're signed in"
// confirmation) replaces the old silent dismiss-on-verify.
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
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    switch viewModel.step {
                    case .email: emailCard
                    case .code: codeCard
                    case .success: successCard
                    }

                    if let error = viewModel.error, viewModel.step != .success {
                        errorCard(error)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
            .background(DesignTokens.Colors.bg)
            .navigationTitle(viewModel.step == .success ? "" : "Sign In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if viewModel.step != .success {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                }
            }
        }
        .presentationDetents([.large])
    }

    private var emailCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Sign in")
                .font(.title2.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text("Sign in only when you want to save private preferences or depth orders.")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textMuted)

            TextField("Email", text: $viewModel.email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(DesignTokens.Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Colors.surfaceRaised)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .strokeBorder(DesignTokens.Colors.borderInput, lineWidth: 1)
                )
                .accessibilityIdentifier("auth-email")

            Button {
                Task { await viewModel.sendCode() }
            } label: {
                Text(viewModel.isSubmitting ? "Sending…" : "Email me a code")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Colors.accent)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .disabled(viewModel.isSubmitting)
            .frame(minHeight: 44)
            .accessibilityIdentifier("auth-send-code")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .depthCard()
    }

    private var codeCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Check your email")
                .font(.title2.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text("We sent a 6-digit code to \(viewModel.normalizedEmail).")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textMuted)

            OtpCodeField(
                code: $viewModel.code, disabled: viewModel.isSubmitting,
                onComplete: { Task { _ = await viewModel.verifyCode() } }
            )
            .padding(.vertical, DesignTokens.Spacing.xs)

            Button {
                Task { _ = await viewModel.verifyCode() }
            } label: {
                Text(viewModel.isSubmitting ? "Verifying…" : "Verify")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Colors.accent)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .disabled(viewModel.isSubmitting || viewModel.code.count != 6)
            .frame(minHeight: 44)
            .accessibilityIdentifier("auth-verify-code")

            TimelineView(.periodic(from: .now, by: 1)) { context in
                if viewModel.canResend(at: context.date) {
                    Button("Send a new code") { Task { await viewModel.sendCode() } }
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .disabled(viewModel.isSubmitting)
                        .frame(minHeight: 44, alignment: .leading)
                } else if let availableAt = viewModel.resendAvailableAt {
                    Text(
                        "Send a new code in \(max(1, Int(availableAt.timeIntervalSince(context.date).rounded(.up))))s"
                    )
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
                }
            }
            Button("Use a different email") { viewModel.editEmail() }
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .frame(minHeight: 44, alignment: .leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .depthCard()
    }

    private var successCard: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Colors.accent.opacity(0.14))
                    .frame(width: 64, height: 64)
                Circle()
                    .strokeBorder(DesignTokens.Colors.accent.opacity(0.3), lineWidth: 1)
                    .frame(width: 64, height: 64)
                Image(systemName: "checkmark")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(DesignTokens.Colors.accent)
            }

            VStack(spacing: DesignTokens.Spacing.xs) {
                Text("You're signed in")
                    .font(.title3.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text("Signed in as \(viewModel.normalizedEmail). Your favorite team and settings now sync across devices.")
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .multilineTextAlignment(.center)
            }

            Button {
                dismiss()
            } label: {
                Text("Manage account settings")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Colors.accent)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .frame(minHeight: 44)
            .accessibilityIdentifier("auth-success-manage-account")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.lg)
        .multilineTextAlignment(.center)
    }

    private func errorCard(_ error: DepthAuthError) -> some View {
        Text(error.message)
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
            .accessibilityIdentifier("auth-error")
    }
}
