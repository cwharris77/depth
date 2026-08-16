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

// A player-search row with its embedded team (DepthRepository.searchPlayers) — the
// flat teams projection is reused, so a search hit can carry the full Team identity the
// chart needs to switch to.
struct PlayerSearchRowDTO: Decodable {
    let id: String
    let name: String
    let number: Int?
    let position: String
    let college: String?
    let photoUrl: String?
    let teams: TeamListRowDTO?

    enum CodingKeys: String, CodingKey {
        case id, name, number, position, college, teams
        case photoUrl = "photo_url"
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

// Public `player_stats` projection for a profile's independent on-demand read. The
// nested team relation deliberately selects only its text abbreviation; native team-logo
// use remains out of scope until rights are cleared.
struct TeamAbbreviationDTO: Decodable {
    let abbrev: String
}

struct PlayerSeasonStatsDTO: Decodable {
    let season: Int
    let seasonType: String
    let games: Int?
    let completions: Int?
    let attempts: Int?
    let passingYards: Int?
    let passingTds: Int?
    let passingInterceptions: Int?
    let carries: Int?
    let rushingYards: Int?
    let rushingTds: Int?
    let receptions: Int?
    let targets: Int?
    let receivingYards: Int?
    let receivingTds: Int?
    let defTacklesSolo: Int?
    let defSacks: Double?
    let defInterceptions: Int?
    let fgMade: Int?
    let fgAtt: Int?
    let teams: TeamAbbreviationDTO?

    enum CodingKeys: String, CodingKey {
        case season, games, completions, attempts, carries, receptions, targets, teams
        case seasonType = "season_type"
        case passingYards = "passing_yards"
        case passingTds = "passing_tds"
        case passingInterceptions = "passing_interceptions"
        case rushingYards = "rushing_yards"
        case rushingTds = "rushing_tds"
        case receivingYards = "receiving_yards"
        case receivingTds = "receiving_tds"
        case defTacklesSolo = "def_tackles_solo"
        case defSacks = "def_sacks"
        case defInterceptions = "def_interceptions"
        case fgMade = "fg_made"
        case fgAtt = "fg_att"
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
