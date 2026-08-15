import Foundation
import Supabase

// Owner-write adapter for one complete position group. The RPC derives ownership from
// auth.uid() and commits atomically, avoiding the web client's delete-then-insert gap.
protocol DepthOverrideWriting: Sendable {
    func save(teamId: String, position: String, playerIds: [String]) async throws
}

protocol DepthOverrideServicing: DepthOverrideWriting {
    func load(teamId: String) async throws -> [Position: [String]]
}

actor SupabaseDepthOverrideService: DepthOverrideServicing {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    func load(teamId: String) async throws -> [Position: [String]] {
        struct Row: Decodable {
            let position: String
            let playerIds: [String]

            enum CodingKeys: String, CodingKey {
                case position
                case playerIds = "player_ids"
            }
        }

        do {
            let rows: [Row] = try await client.from("depth_overrides")
                .select("position, player_ids")
                .eq("team_id", value: teamId)
                .execute().value
            return Dictionary(
                uniqueKeysWithValues: rows.compactMap { row in
                    Position(rawValue: row.position).map { ($0, row.playerIds) }
                }
            )
        } catch is URLError {
            throw DepthError.offline
        } catch let error as PostgrestError {
            throw Self.map(error)
        } catch {
            throw DepthError.server(error.localizedDescription)
        }
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
            throw Self.map(error)
        } catch {
            throw DepthError.server(error.localizedDescription)
        }
    }

    private static func map(_ error: PostgrestError) -> DepthError {
        let message = error.localizedDescription.lowercased()
        if message.contains("authentication") { return .unauthenticated }
        if message.contains("permission") { return .permissionDenied }
        if message.contains("required") || message.contains("unique") || message.contains("empty") {
            return .validation(error.localizedDescription)
        }
        return .server(error.localizedDescription)
    }
}

// Native equivalent of the web overlay projection: persisted ids come first, unknown ids
// are ignored, roster additions retain default order, and visible depth labels are reranked.
func applyingDepthOverrides(
    to snapshot: TeamSnapshot,
    orders: [Position: [String]]
) -> TeamSnapshot {
    guard !orders.isEmpty else { return snapshot }
    var playersById = Dictionary(uniqueKeysWithValues: snapshot.players.map { ($0.id, $0) })

    for (position, playerIds) in orders {
        let group = snapshot.players.filter { $0.position == position }
        var remaining = Dictionary(uniqueKeysWithValues: group.map { ($0.id, $0) })
        var ordered: [Player] = []
        for playerId in playerIds {
            if let player = remaining.removeValue(forKey: playerId) {
                ordered.append(player)
            }
        }
        ordered.append(contentsOf: remaining.values.sorted(by: byDepthOrder))

        for (index, player) in ordered.enumerated() {
            playersById[player.id] = Player(
                id: player.id,
                name: player.name,
                position: player.position,
                depthRank: min(index + 1, 3),
                number: player.number,
                order: index,
                photoUrl: player.photoUrl
            )
        }
    }

    return TeamSnapshot(
        team: snapshot.team,
        players: snapshot.players.compactMap { playersById[$0.id] },
        specialTeams: snapshot.specialTeams,
        uniforms: snapshot.uniforms
    )
}
