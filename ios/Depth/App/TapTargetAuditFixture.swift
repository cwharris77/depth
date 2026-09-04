#if targetEnvironment(simulator)
import SwiftUI

// DEP-395: opt-in simulator fixture for the real deletion sheet's code-entry state.
// No account, OTP email, or hosted write is needed to test the field's hit area.
// Excluded from device builds; reached only with UI_TESTING_DELETE_TAP_TARGET.
struct TapTargetAuditFixture: View {
    @State private var model: AccountDeletionViewModel

    init() {
        let service = TapTargetAuditAuthService()
        _model = State(initialValue: AccountDeletionViewModel(
            email: "tap-audit@example.com", service: service,
            sessionStore: AuthSessionStore(service: service)
        ))
    }

    var body: some View {
        AccountDeletionSheet(viewModel: model)
            .task { await model.requestFreshCode() }
    }
}

private struct TapTargetAuditAuthService: DepthAuthServicing {
    func sessionChanges() async -> AsyncStream<DepthUser?> { AsyncStream { $0.finish() } }
    func currentUser() async -> DepthUser? { nil }
    func sendEmailOtp(to email: String, shouldCreateUser: Bool) async throws {}
    func verifyEmailOtp(email: String, code: String) async throws -> DepthUser {
        throw DepthAuthError.invalidCode
    }
    func refreshSession() async throws -> DepthUser { throw DepthAuthError.unauthenticated }
    func signOut() async throws {}
    func deleteAccount() async throws { throw DepthAuthError.unauthenticated }
}
#endif
