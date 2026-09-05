import Foundation
import Supabase

// Feature-scoped authentication boundary for private native operations. It deliberately
// does not widen DepthRepository: public roster reads keep their stable contract while
// auth, owner writes, and privileged deletion remain explicit capabilities.
struct DepthUser: Equatable, Sendable {
    let id: UUID
    let email: String
}

enum DepthAuthError: Error, Equatable, Sendable {
    case invalidEmail
    case invalidCode
    case expiredCode
    case rateLimited
    case offline
    case unauthenticated
    case freshOtpRequired
    case deletionFailed(correlationId: String?)
    case server

    var message: String {
        switch self {
        case .invalidEmail: "Enter a valid email address."
        case .invalidCode: "That code isn't valid. Check the email and try again."
        case .expiredCode: "That code expired. Request a new one."
        case .rateLimited: "Too many attempts. Wait a moment before trying again."
        case .offline: "You're offline. Reconnect and try again."
        case .unauthenticated: "Your session expired. Sign in again to continue."
        case .freshOtpRequired: "Enter a new email code before deleting your account."
        case .deletionFailed(let correlationId):
            if let correlationId {
                "Deletion failed. Support code: \(correlationId)"
            } else {
                "Deletion failed. Try again or contact support."
            }
        case .server: "Something went wrong. Try again."
        }
    }

    /// Reuses `DepthError`'s telemetry vocabulary (design spec Milestone 2B item 26)
    /// rather than adding auth-specific DB categories — coarse buckets, not an
    /// exhaustive enumeration of every UI error case.
    var telemetryCategory: String {
        switch self {
        case .invalidEmail, .invalidCode, .expiredCode, .rateLimited, .freshOtpRequired: "validation"
        case .offline: "offline"
        case .unauthenticated: "unauthenticated"
        case .deletionFailed, .server: "server"
        }
    }
}

protocol DepthAuthServicing: Sendable {
    func sessionChanges() async -> AsyncStream<DepthUser?>
    func currentUser() async -> DepthUser?
    func sendEmailOtp(to email: String, shouldCreateUser: Bool) async throws
    func verifyEmailOtp(email: String, code: String) async throws -> DepthUser
    func refreshSession() async throws -> DepthUser
    func signOut() async throws
    func deleteAccount() async throws
}

actor SupabaseDepthAuthService: DepthAuthServicing {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    func sessionChanges() -> AsyncStream<DepthUser?> {
        let changes = client.auth.authStateChanges
        return AsyncStream { continuation in
            let task = Task {
                for await (_, session) in changes {
                    // With emitLocalSessionAsInitialSession the stored session is emitted
                    // before any refresh, so it may be expired — never treat an expired
                    // session as a signed-in user (supabase-swift #822 guidance).
                    if let session, session.isExpired {
                        continuation.yield(nil)
                    } else {
                        continuation.yield(session.flatMap { Self.depthUser($0.user) })
                    }
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    func currentUser() -> DepthUser? {
        client.auth.currentUser.flatMap(Self.depthUser)
    }

    func sendEmailOtp(to email: String, shouldCreateUser: Bool) async throws {
        do {
            try await client.auth.signInWithOTP(email: email, shouldCreateUser: shouldCreateUser)
        } catch {
            throw Self.map(error)
        }
    }

    func verifyEmailOtp(email: String, code: String) async throws -> DepthUser {
        do {
            let response = try await client.auth.verifyOTP(email: email, token: code, type: .email)
            guard let user = Self.depthUser(response.user) else { throw DepthAuthError.server }
            return user
        } catch {
            throw Self.map(error)
        }
    }

    func refreshSession() async throws -> DepthUser {
        do {
            let session = try await client.auth.refreshSession()
            guard let user = Self.depthUser(session.user) else { throw DepthAuthError.server }
            return user
        } catch {
            throw Self.map(error)
        }
    }

    func signOut() async throws {
        do {
            try await client.auth.signOut(scope: .local)
        } catch {
            throw Self.map(error)
        }
    }

    func deleteAccount() async throws {
        struct DeletionResponse: Decodable { let ok: Bool }
        do {
            let response: DeletionResponse = try await client.functions.invoke("account-delete")
            guard response.ok else { throw DepthAuthError.deletionFailed(correlationId: nil) }
        } catch let FunctionsError.httpError(code, data) {
            struct Failure: Decodable {
                let error: String
                let correlationId: String?
            }
            let failure = try? JSONDecoder().decode(Failure.self, from: data)
            if code == 401 { throw DepthAuthError.unauthenticated }
            if code == 403 { throw DepthAuthError.freshOtpRequired }
            throw DepthAuthError.deletionFailed(correlationId: failure?.correlationId)
        } catch let error as DepthAuthError {
            throw error
        } catch {
            throw Self.map(error)
        }
    }

    private static func depthUser(_ user: User) -> DepthUser? {
        guard let email = user.email, !email.isEmpty else { return nil }
        return DepthUser(id: user.id, email: email)
    }

    // Internal for deterministic error-classification coverage. The service remains the
    // only production caller, so feature code still receives DepthAuthError rather than
    // interpreting GoTrue's unstable strings itself.
    static func map(_ error: Error) -> DepthAuthError {
        if let depthError = error as? DepthAuthError { return depthError }
        if let urlError = error as? URLError, urlError.isNetworkUnavailable {
            return .offline
        }
        if let authError = error as? AuthError, authError == .sessionMissing {
            return .unauthenticated
        }

        let message = error.localizedDescription.lowercased()
        if message.contains("rate") || message.contains("429") || message.contains("only request this after") {
            return .rateLimited
        }
        if message.contains("expired") { return .expiredCode }
        if message.contains("invalid") || message.contains("token") { return .invalidCode }
        return .server
    }
}
