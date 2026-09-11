import SwiftUI

// Destructive account flow with an explicit warning followed by fresh email verification.
// Dismissal remains available after any failure because the session is intentionally kept.
// Card-based surface (DEP-269): ScrollView + depthCard() like SettingsView, replacing the
// stock Form's grouped-background treatment so both screens in the account flow share one
// card system. Full-height presentation is kept as-is — the typed-confirmation field makes
// full height safe, and detent parity with AuthSheet is deferred to DEP-257.
struct AccountDeletionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: AccountDeletionViewModel
    @FocusState private var codeFocused: Bool

    init(viewModel: AccountDeletionViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        DepthSheet(
            title: "Delete Account",
            closeDisabled: viewModel.step == .deleting,
            dismissDisabled: viewModel.step == .deleting
        ) {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    switch viewModel.step {
                    case .warning:
                        warningCard
                    case .code, .deleting:
                        codeEntryCard
                    case .completed:
                        EmptyView()
                    }

                    if let error = viewModel.error {
                        // Same standalone error-card treatment SettingsView uses for its
                        // sign-out error — below the flow card, danger-colored footnote.
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text(error.message)
                                .font(.footnote)
                                .foregroundStyle(DesignTokens.Colors.danger)
                                .accessibilityIdentifier("delete-error")
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .depthCard()
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
        }
    }

    private var warningCard: some View {
        VStack(alignment: .center, spacing: DesignTokens.Spacing.sm) {
            Text(
                "This permanently deletes your account, preferences, saved depth orders, and shared boards. This can't be undone."
            )
            .foregroundStyle(DesignTokens.Colors.textPrimary)
            .multilineTextAlignment(.center)
            destructiveButton(title: "Continue", identifier: "delete-request-code") {
                Task { await viewModel.requestFreshCode() }
            }
        }
        .frame(maxWidth: .infinity)
        .depthCard()
    }

    private var codeEntryCard: some View {
        VStack(alignment: .center, spacing: DesignTokens.Spacing.sm) {
            Text("Enter the new six-digit code sent to your verified email.")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
            TextField("Code", text: $viewModel.code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .focused($codeFocused)
                .accessibilityIdentifier("delete-code")
                .padding(DesignTokens.Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Colors.surfaceRaised)
                )
                // DEP-395: padding is drawn outside the text box; forward its taps
                // through the same focus route as DepthSearchField.
                .contentShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                .onTapGesture { codeFocused = true }
            destructiveButton(title: "Delete My Account", identifier: "delete-confirm") {
                Task {
                    if await viewModel.confirmDeletion() { dismiss() }
                }
            }
            TimelineView(.periodic(from: .now, by: 1)) { context in
                if viewModel.canResend(at: context.date) {
                    destructiveButton(title: "Send a new code") {
                        Task { await viewModel.requestFreshCode() }
                    }
                } else if let availableAt = viewModel.resendAvailableAt {
                    Text(
                        "Send a new code in \(max(1, Int(availableAt.timeIntervalSince(context.date).rounded(.up))))s"
                    )
                    .font(.footnote)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                }
            }
            if viewModel.step == .deleting {
                ProgressView("Deleting…")
                    .tint(DesignTokens.Colors.accent)
            }
        }
        .frame(maxWidth: .infinity)
        .depthCard()
    }

    @ViewBuilder
    private func destructiveButton(
        title: String,
        identifier: String? = nil,
        action: @escaping () -> Void
    ) -> some View {
        let button = Button(action: action) {
            Text(title)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(DesignTokens.Colors.danger)
        .disabled(viewModel.isSubmitting)
        .frame(maxWidth: .infinity, minHeight: 44)
        if let identifier {
            button.accessibilityIdentifier(identifier)
        } else {
            button
        }
    }
}
