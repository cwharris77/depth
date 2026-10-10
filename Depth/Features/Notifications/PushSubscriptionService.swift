import Foundation
import Supabase

/// What the server stores for this device. `token` is lowercase hex.
struct PushRegistration: Sendable, Equatable {
    let token: String
    let teamId: String
    let tier: NotificationTier
    let bundleId: String
    /// "sandbox" or "production": which APNs host can reach this build's token.
    let environment: String

    /// Internal builds are signed for development, so their tokens are only reachable
    /// through the APNs sandbox; store builds use production.
    static func apnsEnvironment(isInternalBuild: Bool) -> String {
        isInternalBuild ? "sandbox" : "production"
    }
}

protocol PushSubscriptionServicing: Sendable {
    /// Creates or updates this device's row. Safe to repeat.
    func register(_ registration: PushRegistration) async throws
}

/// Calls the `register_push_device` function, the only server entry point for a device.
/// No account is involved, so this works signed out.
struct SupabasePushSubscriptionService: PushSubscriptionServicing {
    let client: SupabaseClient

    private struct Parameters: Encodable {
        let token: String
        let teamId: String
        let tier: String
        let bundleId: String
        let environment: String

        enum CodingKeys: String, CodingKey {
            case token = "p_token"
            case teamId = "p_team_id"
            case tier = "p_tier"
            case bundleId = "p_bundle_id"
            case environment = "p_environment"
        }
    }

    func register(_ registration: PushRegistration) async throws {
        do {
            try await client.rpc(
                "register_push_device",
                params: Parameters(
                    token: registration.token, teamId: registration.teamId,
                    tier: registration.tier.rawValue, bundleId: registration.bundleId,
                    environment: registration.environment)
            ).execute()
        } catch let error as URLError {
            throw error.isNetworkUnavailable
                ? DepthError.offline : DepthError.server(error.localizedDescription)
        } catch {
            throw DepthError.server("\(error)")
        }
    }
}

/// Test, preview and fixture-backend double: registers nothing.
struct NoOpPushSubscriptionService: PushSubscriptionServicing {
    func register(_ registration: PushRegistration) async throws {}
}
