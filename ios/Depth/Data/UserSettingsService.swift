import Foundation
import Supabase

// The account-gated team preferences the web persists in `user_settings` (DEP-319): an
// optional favorite team and an opt-in "open the favorite at startup" toggle. iOS reads
// and writes the same three columns (`favorite_team_id`, `last_team_id`,
// `start_on_favorite`) so favorites/startup preferences sync across devices.
//
// Write contract mirrors web's PUT /api/settings exactly (app/api/settings/route.ts): a
// *partial* upsert where only the column keys present in the payload change, merged into
// the existing row by `on_conflict=user_id`. Sending `{ favoriteTeamId }` must leave
// `last_team_id` untouched, and vice versa — the payload is built here from only the
// columns a patch names, never from a read-modify-write of the whole row.
//
// RLS scopes the row to auth.uid() — the supabase client's session supplies the identity,
// the same owner-scoped pattern DepthOverrideService uses, so there is no per-user
// filtering in this code.

/// In-memory mirror of web's `UserSettings` (`lib/utils/team/home-team.ts`). The default
/// value is the same EMPTY row web's API returns when none exists
/// (app/api/settings/route.ts's `EMPTY`): no favorite, no last-viewed, start-on-favorite
/// on so a first-time favorite opts into auto-opening.
struct UserSettings: Equatable, Sendable {
    var favoriteTeamId: String?
    var lastTeamId: String?
    var startOnFavorite = true
}

/// Read + write interface for the settings row. Split this way (rather than one
/// repository-style protocol) so the Settings sheet's optimistic store can hold one
/// protocol value and tests can substitute a fake for either side.
protocol UserSettingsServicing: Sendable {
    func settings() async throws -> UserSettings
    /// Partial upsert: only the columns named in `patch` change. `on_conflict=user_id`
    /// merges them into the existing row (web's PUT /api/settings semantics).
    func update(_ patch: UserSettingsPatch) async throws
}

/// A settings change naming the columns it touches. The shape is the point: web's partial
/// upsert only writes keys present in the body, so each write names exactly the fields it
/// is changing. A `nil` value clears the column; an absent column is left untouched.
struct UserSettingsPatch: Equatable, Sendable {
    enum Column: String, Sendable {
        case favoriteTeamID = "favorite_team_id"
        case lastTeamID = "last_team_id"
        case startOnFavorite = "start_on_favorite"
    }

    /// column → value (nil clears the column).
    let columns: [Column: String?]

    // Each mirrors one web request body. The favorite-with-toggle form is the one
    // two-field body web sends (AccountView.changeFavorite's first-favorite write).
    static func favorite(_ id: String) -> UserSettingsPatch {
        UserSettingsPatch(columns: [.favoriteTeamID: id])
    }

    static func clearFavorite() -> UserSettingsPatch {
        UserSettingsPatch(columns: [.favoriteTeamID: nil])
    }

    static func favorite(_ id: String, startOnFavorite: Bool) -> UserSettingsPatch {
        UserSettingsPatch(columns: [
            .favoriteTeamID: id,
            .startOnFavorite: startOnFavorite ? "true" : "false",
        ])
    }

    static func lastViewed(_ id: String) -> UserSettingsPatch {
        UserSettingsPatch(columns: [.lastTeamID: id])
    }

    static func startOnFavorite(_ on: Bool) -> UserSettingsPatch {
        UserSettingsPatch(columns: [.startOnFavorite: on ? "true" : "false"])
    }
}

/// Concrete Supabase-backed settings service. `client.from("user_settings")` through the
/// session's auth.uid() satisfies RLS — structurally the same owner-scoped reads/writes
/// as SupabaseDepthOverrideService.
actor SupabaseUserSettingsService: UserSettingsServicing {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    func settings() async throws -> UserSettings {
        struct Row: Decodable, Sendable {
            let favoriteTeamId: String?
            let lastTeamId: String?
            let startOnFavorite: Bool

            enum CodingKeys: String, CodingKey {
                case favoriteTeamId = "favorite_team_id"
                case lastTeamId = "last_team_id"
                case startOnFavorite = "start_on_favorite"
            }
        }

        do {
            // user_id is the primary key, so there is at most one row per user — the same
            // maybeSingle() read web's GET /api/settings uses. A missing row is not an
            // error: web returns the EMPTY defaults, so this returns them too.
            let row: Row? = try await client.from("user_settings")
                .select("favorite_team_id, last_team_id, start_on_favorite")
                .maybeSingle()
                .execute().value
            guard let row else { return UserSettings() }
            return UserSettings(
                favoriteTeamId: row.favoriteTeamId,
                lastTeamId: row.lastTeamId,
                startOnFavorite: row.startOnFavorite
            )
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server(error.localizedDescription)
        } catch let error as PostgrestError {
            throw Self.map(error)
        } catch {
            throw DepthError.server(error.localizedDescription)
        }
    }

    func update(_ patch: UserSettingsPatch) async throws {
        // user_id must be the signed-in user's own id — the "own settings" RLS policy
        // rejects any insert/update where user_id != auth.uid() (20260709120000_user_
        // settings.sql). A random UUID here would fail that check silently as a normal
        // PostgrestError (misread as "offline"), and even a successful write would land
        // in a row the next read (scoped to the real auth.uid()) could never find.
        guard let userId = client.auth.currentUser?.id else { throw DepthError.unauthenticated }
        // updated_at rides along so every write touches it, like web's PUT. Only
        // patch.columns carry real values; on_conflict=user_id merges, leaving every
        // other column untouched — the partial-upsert contract.
        var payload: [String: String] = [
            "user_id": userId.uuidString,
            "updated_at": ISO8601DateFormatter().string(from: Date()),
        ]
        for (column, value) in patch.columns {
            payload[column.rawValue] = value
        }

        do {
            try await client.from("user_settings")
                .upsert(payload, onConflict: "user_id")
                .execute()
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server(error.localizedDescription)
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
        if message.contains("required") || message.contains("unique") {
            return .validation(error.localizedDescription)
        }
        return .server(error.localizedDescription)
    }
}