import Foundation
import Supabase

// Owner-write adapter for one complete position group. The RPC derives ownership from
// auth.uid() and commits atomically, avoiding the web client's delete-then-insert gap.
protocol DepthOverrideWriting: Sendable {
    func save(teamId: String, position: String, playerIds: [String]) async throws
    /// Removes a position's custom order entirely (web's reset-to-default push: its PUT
    /// clears the position out of the team override). Signed out, a no-op on the remote —
    /// the local cache was already cleared by the caller.
    func clear(teamId: String, position: String) async throws
}

protocol DepthOverrideServicing: DepthOverrideWriting {
    func load(teamId: String) async throws -> [Position: [String]]
    /// Every team the signed-in user has a server-side override for (DEP-219's
    /// sign-in merge — mirrors web's unfiltered `GET /api/overrides`).
    func loadAll() async throws -> [String: [Position: [String]]]
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

    func loadAll() async throws -> [String: [Position: [String]]] {
        struct Row: Decodable {
            let teamId: String
            let position: String
            let playerIds: [String]

            enum CodingKeys: String, CodingKey {
                case teamId = "team_id"
                case position
                case playerIds = "player_ids"
            }
        }

        do {
            // No team_id filter — RLS already scopes rows to auth.uid() (AGENTS.md
            // invariant 10), so this is every team the signed-in user has an override
            // for, same as web's unfiltered GET /api/overrides.
            let rows: [Row] = try await client.from("depth_overrides")
                .select("team_id, position, player_ids")
                .execute().value
            var byTeam: [String: [Position: [String]]] = [:]
            for row in rows {
                guard let position = Position(rawValue: row.position) else { continue }
                byTeam[row.teamId, default: [:]][position] = row.playerIds
            }
            return byTeam
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

    func clear(teamId: String, position: String) async throws {
        // Direct delete, not an RPC: the table's existing "own overrides" policy already
        // scopes deletes to auth.uid(), so this can never remove another user's row
        // (20260710120000_depth_overrides.sql).
        do {
            try await client.from("depth_overrides")
                .delete()
                .eq("team_id", value: teamId)
                .eq("position", value: position)
                .execute()
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

// DEP-219: literal port of web's `pushTeamOverride` (lib/utils/depth-chart/overrides-sync.ts)
// — every write hits the local cache first (always succeeds, no network dependency), then
// mirrors to the server when signed in as fire-and-forget: a dropped request isn't
// surfaced to the editor UI as a failure, matching web's catch-and-ignore. `remote: nil`
// (signed out) skips the server leg entirely, same as web's `if (user)` guard.
struct LocalFirstOverrideWriter: DepthOverrideWriting {
    let preferences: UserPreferences
    let remote: (any DepthOverrideWriting)?

    func save(teamId: String, position: String, playerIds: [String]) async throws {
        guard let resolvedPosition = Position(rawValue: position) else { return }
        preferences.setPositionOrder(teamId: teamId, position: resolvedPosition, ids: playerIds)
        guard let remote else { return }
        try? await remote.save(teamId: teamId, position: position, playerIds: playerIds)
    }

    func clear(teamId: String, position: String) async throws {
        guard let resolvedPosition = Position(rawValue: position) else { return }
        preferences.clearPositionOrder(teamId: teamId, position: resolvedPosition)
        guard let remote else { return }
        try? await remote.clear(teamId: teamId, position: position)
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

        for (index, player) in rerankedPlayers(ordered).enumerated() {
            playersById[player.id] = player
        }
    }

    return TeamSnapshot(
        team: snapshot.team,
        players: snapshot.players.compactMap { playersById[$0.id] },
        specialTeams: snapshot.specialTeams,
        uniforms: snapshot.uniforms
    )
}

// Literal port of web's statusForRank + rank-capping loop (lib/utils/depth-chart/
// depth-overrides.ts's applyTeamOverride): reorder assignments preserve rookie/injured,
// flip everything else to starter at rank 1 / backup at rank 2+, and cap depthRank at 3.
// Mirrors the whole-player rebuild web does — `Player` is value-typed, so changing rank
// means reconstructing with every field carried through (a partial rebuild silently drops
// college/bio/vitals/status, which is what DEP-226's reorder UI surfaced).
func rerankedPlayers(_ players: [Player]) -> [Player] {
    players.enumerated().map { index, player in
        Player(
            id: player.id,
            name: player.name,
            position: player.position,
            depthRank: min(index + 1, 3),
            number: player.number,
            order: index,
            status: statusForRank(player.status, rank: index + 1),
            age: player.age,
            college: player.college,
            experience: player.experience,
            height: player.height,
            weight: player.weight,
            bio: player.bio,
            photoUrl: player.photoUrl
        )
    }
}

private func statusForRank(_ previous: PlayerStatus, rank: Int) -> PlayerStatus {
    if previous == .injured || previous == .rookie { return previous }
    return rank == 1 ? .starter : .backup
}
