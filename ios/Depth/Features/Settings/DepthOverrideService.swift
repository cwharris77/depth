import Foundation
import Supabase

// Owner-write adapter for one complete position group. The RPC derives ownership from
// auth.uid() and commits atomically, avoiding the web client's delete-then-insert gap.
protocol DepthOverrideWriting: Sendable {
    func save(teamId: String, position: String, playerIds: [String]) async throws
}

actor SupabaseDepthOverrideService: DepthOverrideWriting {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    func save(teamId: String, position: String, playerIds: [String]) async throws {
        struct Parameters: Encodable {
            let teamId: String
            let position: String
            let playerIds: [String]

            enum CodingKeys: String, CodingKey {
                case teamId = "p_team_id"
                case position = "p_position"
                case playerIds = "p_player_ids"
            }
        }

        do {
            try await client.rpc(
                "upsert_depth_override_group",
                params: Parameters(teamId: teamId, position: position, playerIds: playerIds)
            ).execute()
        } catch is URLError {
            throw DepthError.offline
        } catch let error as PostgrestError {
            let message = error.localizedDescription.lowercased()
            if message.contains("authentication") { throw DepthError.unauthenticated }
            if message.contains("permission") { throw DepthError.permissionDenied }
            if message.contains("required") || message.contains("unique")
                || message.contains("empty")
            {
                throw DepthError.validation(error.localizedDescription)
            }
            throw DepthError.server(error.localizedDescription)
        } catch {
            throw DepthError.server(error.localizedDescription)
        }
    }
}
