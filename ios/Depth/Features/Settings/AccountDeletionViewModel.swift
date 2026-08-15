import Foundation
import Observation

// Fresh-OTP deletion state machine. A failed verification or function call preserves the
// authenticated session; local sign-out and private cleanup happen only after server success.
@Observable
@MainActor
final class AccountDeletionViewModel {
    enum Step: Equatable { case warning, code, deleting, completed }

    var code = ""
    private(set) var step: Step = .warning
    private(set) var error: DepthAuthError?
    private(set) var isSubmitting = false
    private(set) var resendAvailableAt: Date?

    @ObservationIgnored private let email: String
    @ObservationIgnored private let service: any DepthAuthServicing
    @ObservationIgnored private let sessionStore: AuthSessionStore
    @ObservationIgnored private let clearPrivateData: @Sendable () async -> Void
    @ObservationIgnored private let now: @Sendable () -> Date

    init(
        email: String,
        service: any DepthAuthServicing,
        sessionStore: AuthSessionStore,
        clearPrivateData: @escaping @Sendable () async -> Void = {},
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.email = email
        self.service = service
        self.sessionStore = sessionStore
        self.clearPrivateData = clearPrivateData
        self.now = now
    }

    func canResend(at date: Date) -> Bool {
        guard let resendAvailableAt else { return true }
        return date >= resendAvailableAt
    }

    func requestFreshCode() async {
        guard !isSubmitting, canResend(at: now()) else { return }
        isSubmitting = true
        error = nil
        defer { isSubmitting = false }
        do {
            try await service.sendEmailOtp(to: email, shouldCreateUser: false)
            step = .code
            resendAvailableAt = now().addingTimeInterval(60)
        } catch let authError as DepthAuthError {
            error = authError
        } catch {
            self.error = .server
        }
    }

    func confirmDeletion() async -> Bool {
        let normalizedCode = code.filter(\.isNumber)
        guard normalizedCode.count == 6 else {
            error = .invalidCode
            return false
        }
        guard !isSubmitting else { return false }

        isSubmitting = true
        error = nil
        do {
            let refreshedUser = try await service.verifyEmailOtp(email: email, code: normalizedCode)
            sessionStore.accept(refreshedUser)
            step = .deleting
            try await service.deleteAccount()

            // Server deletion is confirmed. Local sign-out is best-effort because the user no
            // longer exists remotely; cleanup must still complete if logout returns 401.
            try? await service.signOut()
            await clearPrivateData()
            sessionStore.accountWasDeleted()
            step = .completed
            isSubmitting = false
            return true
        } catch let authError as DepthAuthError {
            error = authError
        } catch {
            self.error = .server
        }
        step = .code
        isSubmitting = false
        return false
    }
}
