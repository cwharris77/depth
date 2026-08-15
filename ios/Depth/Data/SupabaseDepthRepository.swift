import Foundation
import Supabase

// One projected nested query loads a team snapshot (design spec locked decision #7) —
// team + depth-chart entries + special-teams slots + uniforms in a single round trip,
// replacing the web app's four-parallel-reads-plus-a-player-read pattern
// (lib/roster-source.db.ts fetchTeamRoster). Column list is explicit; `select(*)` is
// prohibited (Performance Review #1) so payload size stays bounded to what v1 renders.
actor SupabaseDepthRepository: DepthRepository {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    private static let teamSnapshotSelect = """
        id, abbrev, city, name, conference, division, \
        color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url, \
        depth_chart_entries(team_id, position, depth_rank, player_id, \
        player:players(id, team_id, name, number, position, status, age, college, experience, height, weight, bio, photo_url)), \
        special_teams_slots(id, team_id, label, player_id, x, y, \
        player:players(id, team_id, name, number, position, status, age, college, experience, height, weight, bio, photo_url)), \
        uniforms(id, team_id, kind, name, year_start, year_end, is_current, \
        color_primary, color_secondary, color_accent, ui_accent, on_accent, image_path)
        """

    func teamSnapshot(teamId: String) async throws -> TeamSnapshot {
        do {
            let dto: TeamDTO = try await client
                .from("teams")
                .select(Self.teamSnapshotSelect)
                .eq("id", value: teamId)
                .single()
                .execute()
                .value
            return try TeamSnapshotMapper.map(dto)
        } catch let error as DepthError {
            throw error
        } catch let error as PostgrestError {
            throw Self.mapPostgrestError(error)
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch is URLError {
            throw DepthError.offline
        } catch {
            throw DepthError.server("\(error)")
        }
    }

    /// PostgREST error codes seen with `.single()` and RLS-restricted tables — see
    /// https://postgrest.org/en/stable/references/errors.html. Anything unrecognized
    /// maps to `.server` rather than being silently swallowed.
    private static func mapPostgrestError(_ error: PostgrestError) -> DepthError {
        switch error.code {
        case "PGRST116": // single() matched zero (or more than one) row
            return .notFound
        case "42501": // insufficient_privilege — RLS denied
            return .permissionDenied
        default:
            return .server(error.message)
        }
    }
}
