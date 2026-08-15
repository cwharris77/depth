import Foundation
import Observation

// Feature-local email-code state with deterministic resend timing. Failed verification
// leaves the email/code in place so delayed, expired, and offline flows are retryable.
@Observable
@MainActor
final class AuthFlowViewModel {
    enum Step: Equatable { case email, code }

    var email = ""
    var code = ""
    private(set) var step: Step = .email
    private(set) var isSubmitting = false
    private(set) var error: DepthAuthError?
    private(set) var resendAvailableAt: Date?

    @ObservationIgnored private let service: any DepthAuthServicing
    @ObservationIgnored private let sessionStore: AuthSessionStore
    @ObservationIgnored private let now: @Sendable () -> Date

    init(
        service: any DepthAuthServicing,
        sessionStore: AuthSessionStore,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.service = service
        self.sessionStore = sessionStore
        self.now = now
    }

    var normalizedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    func canResend(at date: Date) -> Bool {
        guard let resendAvailableAt else { return true }
        return date >= resendAvailableAt
    }

    func sendCode(shouldCreateUser: Bool = true) async {
        guard Self.isValidEmail(normalizedEmail) else {
            error = .invalidEmail
            return
        }
        guard !isSubmitting, canResend(at: now()) else { return }

        isSubmitting = true
        error = nil
        defer { isSubmitting = false }
        do {
            try await service.sendEmailOtp(to: normalizedEmail, shouldCreateUser: shouldCreateUser)
            step = .code
            resendAvailableAt = now().addingTimeInterval(60)
        } catch let authError as DepthAuthError {
            error = authError
        } catch {
            self.error = .server
        }
    }

    func verifyCode() async -> Bool {
        let normalizedCode = code.filter(\.isNumber)
        guard normalizedCode.count == 6 else {
            error = .invalidCode
            return false
        }
        guard !isSubmitting else { return false }

        isSubmitting = true
        error = nil
        defer { isSubmitting = false }
        do {
            let user = try await service.verifyEmailOtp(
                email: normalizedEmail, code: normalizedCode)
            sessionStore.accept(user)
            return true
        } catch let authError as DepthAuthError {
            error = authError
            return false
        } catch {
            self.error = .server
            return false
        }
    }

    func editEmail() {
        step = .email
        code = ""
        error = nil
    }

    private static func isValidEmail(_ email: String) -> Bool {
        let parts = email.split(separator: "@", omittingEmptySubsequences: false)
        return parts.count == 2 && !parts[0].isEmpty && parts[1].contains(".")
    }
}
