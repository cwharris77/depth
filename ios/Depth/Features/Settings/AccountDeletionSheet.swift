import SwiftUI

// Destructive account flow with an explicit warning followed by fresh email verification.
// Dismissal remains available after any failure because the session is intentionally kept.
struct AccountDeletionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: AccountDeletionViewModel

    init(viewModel: AccountDeletionViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            Form {
                switch viewModel.step {
                case .warning:
                    warning
                case .code, .deleting:
                    codeEntry
                case .completed:
                    EmptyView()
                }
            }
            .navigationTitle("Delete Account")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(viewModel.step == .deleting)
                }
            }
        }
        .interactiveDismissDisabled(viewModel.step == .deleting)
    }

    private var warning: some View {
        Section {
            Text(
                "This permanently deletes your account, preferences, saved depth orders, and shared boards. This can't be undone."
            )
            Button("Continue", role: .destructive) {
                Task { await viewModel.requestFreshCode() }
            }
            .disabled(viewModel.isSubmitting)
            .accessibilityIdentifier("delete-request-code")
        } footer: {
            inlineError
        }
    }

    private var codeEntry: some View {
        Section {
            Text("Enter the new six-digit code sent to your verified email.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            TextField("Code", text: $viewModel.code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .accessibilityIdentifier("delete-code")
            Button("Delete My Account", role: .destructive) {
                Task {
                    if await viewModel.confirmDeletion() { dismiss() }
                }
            }
            .disabled(viewModel.isSubmitting)
            .accessibilityIdentifier("delete-confirm")
            TimelineView(.periodic(from: .now, by: 1)) { context in
                if viewModel.canResend(at: context.date) {
                    Button("Send a new code") {
                        Task { await viewModel.requestFreshCode() }
                    }
                    .disabled(viewModel.isSubmitting)
                } else if let availableAt = viewModel.resendAvailableAt {
                    Text(
                        "Send a new code in \(max(1, Int(availableAt.timeIntervalSince(context.date).rounded(.up))))s"
                    )
                    .foregroundStyle(.secondary)
                }
            }
            if viewModel.step == .deleting {
                ProgressView("Deleting…")
            }
        } footer: {
            inlineError
        }
    }

    @ViewBuilder
    private var inlineError: some View {
        if let error = viewModel.error {
            Text(error.message)
                .foregroundStyle(.red)
                .accessibilityIdentifier("delete-error")
        }
    }
}
