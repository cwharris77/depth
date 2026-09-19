import Foundation
import Observation

// Feature-local email-code state with deterministic resend timing. Failed verification
// leaves the email/code in place so delayed, expired, and offline flows are retryable.
@Observable
@MainActor
final class AuthFlowViewModel {
    enum Step: Equatable { case email, code, success }

    var email = ""
    var code = ""
    private(set) var step: Step = .email
    private(set) var isSubmitting = false
    private(set) var error: DepthAuthError?
    private(set) var resendAvailableAt: Date?

    /// The address the most recent code actually reached. The resend cooldown is
    /// email-wide and server-owned, so a cooldown alone does not mean a code is
    /// waiting for whatever is currently typed — DEP-598.
    private(set) var lastSentEmail: String?

    @ObservationIgnored private let service: any DepthAuthServicing
    @ObservationIgnored private let sessionStore: AuthSessionStore
    @ObservationIgnored private let now: @Sendable () -> Date
    @ObservationIgnored private let events: any AppEventsRecording

    init(
        service: any DepthAuthServicing,
        sessionStore: AuthSessionStore,
        now: @escaping @Sendable () -> Date = Date.init,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        self.service = service
        self.sessionStore = sessionStore
        self.now = now
        self.events = events
    }

    var normalizedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    func canResend(at date: Date) -> Bool {
        resendWait(at: date) == nil
    }

    /// Whole seconds left on the resend cooldown at `date`, or nil once a send is
    /// allowed. Views render this so the cooldown is visible before it blocks a tap
    /// (DEP-598); rounded up and floored at 1 so it never reads "0s".
    func resendWait(at date: Date) -> Int? {
        guard let resendAvailableAt, date < resendAvailableAt else { return nil }
        return max(1, Int(resendAvailableAt.timeIntervalSince(date).rounded(.up)))
    }

    func sendCode(shouldCreateUser: Bool = true) async {
        guard Self.isValidEmail(normalizedEmail) else {
            error = .invalidEmail
            return
        }
        guard !isSubmitting else { return }
        // DEP-598: this used to return with no state change at all, so on the email step
        // — which renders no countdown — "Email me a code" read as a dead button for the
        // whole cooldown, including for an address the user had just switched to. The
        // cooldown is email-wide and server-owned, so it still blocks; it just says so.
        if let wait = resendWait(at: now()) {
            // The code step already renders the countdown in place of its resend button,
            // so only the email step needs the refusal spelled out.
            if step == .email { error = .rateLimited(retryAfterSeconds: wait) }
            return
        }

        isSubmitting = true
        error = nil
        defer { isSubmitting = false }
        do {
            try await service.sendEmailOtp(to: normalizedEmail, shouldCreateUser: shouldCreateUser)
            step = .code
            lastSentEmail = normalizedEmail
            resendAvailableAt = now().addingTimeInterval(60)
            events.record(.authStarted)
        } catch let authError as DepthAuthError {
            if case .rateLimited(let retryAfterSeconds) = authError {
                resendAvailableAt = now().addingTimeInterval(TimeInterval(retryAfterSeconds))
                if let lastSentEmail, lastSentEmail != normalizedEmail {
                    // DEP-598: nothing has reached this address, so the code step would
                    // claim a send that never happened. Stay put and show the wait.
                    error = authError
                } else {
                    // Another app instance may have sent a valid code already. Let this
                    // one accept it while honoring the server's email-wide resend cooldown.
                    step = .code
                    error = nil
                }
            } else {
                error = authError
            }
            events.record(.error(category: authError.telemetryCategory))
        } catch {
            self.error = .server
            events.record(.error(category: "server"))
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
            step = .success
            events.record(.authCompleted)
            return true
        } catch let authError as DepthAuthError {
            error = authError
            events.record(.error(category: authError.telemetryCategory))
            return false
        } catch {
            self.error = .server
            events.record(.error(category: "server"))
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
