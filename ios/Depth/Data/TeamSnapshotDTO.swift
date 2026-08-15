import Foundation

// Supabase/PostgREST DTOs for the projected team-snapshot query — the exact shape of
// `SELECT ... FROM teams` with nested depth_chart_entries/special_teams_slots/uniforms
// embeds (SupabaseDepthRepository.teamSnapshotSelect). Never crosses into Features/;
// TeamSnapshotMapper converts to the immutable Domain structs. Stays in lockstep with
// supabase/migrations' actual column names (verified against local Supabase, not
// guessed) — explicit CodingKeys per field, no blanket snake_case conversion, so a
// column rename is a compile error here rather than a silent decode failure.

struct TeamDTO: Decodable {
    let id: String
    let abbrev: String
    let city: String
    let name: String
    let conference: String
    let division: String
    let colorPrimary: String
    let colorSecondary: String
    let colorAccent: String
    let uiAccent: String
    let onAccent: String
    let logoUrl: String?
    let logoDarkUrl: String?
    let depthChartEntries: [DepthChartEntryDTO]
    let specialTeamsSlots: [SpecialTeamsSlotDTO]
    let uniforms: [UniformDTO]

    enum CodingKeys: String, CodingKey {
        case id, abbrev, city, name, conference, division
        case colorPrimary = "color_primary"
        case colorSecondary = "color_secondary"
        case colorAccent = "color_accent"
        case uiAccent = "ui_accent"
        case onAccent = "on_accent"
        case logoUrl = "logo_url"
        case logoDarkUrl = "logo_dark_url"
        case depthChartEntries = "depth_chart_entries"
        case specialTeamsSlots = "special_teams_slots"
        case uniforms
    }
}

// Flat team-only projection for the 32-team list (DepthRepository.teams()) — no nested
// depth-chart/uniform embeds, so a `TeamDTO` (which requires them) can't be reused here.
struct TeamListRowDTO: Decodable {
    let id: String
    let abbrev: String
    let city: String
    let name: String
    let conference: String
    let division: String
    let colorPrimary: String
    let colorSecondary: String
    let colorAccent: String
    let uiAccent: String
    let onAccent: String
    let logoUrl: String?
    let logoDarkUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, abbrev, city, name, conference, division
        case colorPrimary = "color_primary"
        case colorSecondary = "color_secondary"
        case colorAccent = "color_accent"
        case uiAccent = "ui_accent"
        case onAccent = "on_accent"
        case logoUrl = "logo_url"
        case logoDarkUrl = "logo_dark_url"
    }
}

// The public `app_config` singleton row.
struct AppConfigDTO: Decodable {
    let minimumSupportedBuild: Int
    let maintenanceMessage: String?

    enum CodingKeys: String, CodingKey {
        case minimumSupportedBuild = "minimum_supported_build"
        case maintenanceMessage = "maintenance_message"
    }
}

struct PlayerDTO: Decodable {
    let id: String
    let teamId: String
    let name: String
    let number: Int?
    let position: String
    let status: String?
    let age: Int?
    let college: String?
    let experience: Int?
    let height: String?
    let weight: Int?
    let bio: String?
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, name, number, position, status, age, college, experience, height, weight, bio
        case teamId = "team_id"
        case photoUrl = "photo_url"
    }
}

struct DepthChartEntryDTO: Decodable {
    let teamId: String
    let position: String
    let depthRank: Int
    let playerId: String
    let player: PlayerDTO

    enum CodingKeys: String, CodingKey {
        case position, player
        case teamId = "team_id"
        case depthRank = "depth_rank"
        case playerId = "player_id"
    }
}

struct SpecialTeamsSlotDTO: Decodable {
    let id: String
    let teamId: String
    let label: String
    let playerId: String?
    let x: Double
    let y: Double
    let player: PlayerDTO?

    enum CodingKeys: String, CodingKey {
        case id, label, x, y, player
        case teamId = "team_id"
        case playerId = "player_id"
    }
}

struct UniformDTO: Decodable {
    let id: String
    let teamId: String
    let kind: String
    let name: String
    let yearStart: Int?
    let yearEnd: Int?
    let isCurrent: Bool
    let colorPrimary: String
    let colorSecondary: String
    let colorAccent: String
    let uiAccent: String
    let onAccent: String
    let imagePath: String?

    enum CodingKeys: String, CodingKey {
        case id, kind, name
        case teamId = "team_id"
        case yearStart = "year_start"
        case yearEnd = "year_end"
        case isCurrent = "is_current"
        case colorPrimary = "color_primary"
        case colorSecondary = "color_secondary"
        case colorAccent = "color_accent"
        case uiAccent = "ui_accent"
        case onAccent = "on_accent"
        case imagePath = "image_path"
    }
}
