import Foundation

// Mirrors lib/types.ts's TeamColors.
struct TeamColors: Codable, Equatable {
    let primary: String
    let secondary: String
    let accent: String
    let uiAccent: String
    let onAccent: String
}

// Mirrors lib/types.ts's Team.
struct Team: Codable, Equatable, Identifiable {
    let id: String
    let city: String
    let name: String
    let abbrev: String
    let conference: String
    let division: String
    let colors: TeamColors
    let logo: String?
    let logoDark: String?
}

// Mirrors lib/types.ts's UniformKind.
enum UniformKind: String, Codable {
    case home
    case away
    case throwback
    case colorRush = "color-rush"
    case alternate
}

// Mirrors lib/types.ts's Uniform.
struct Uniform: Codable, Equatable, Identifiable {
    let id: String
    let teamId: String
    let kind: UniformKind
    let name: String
    let yearStart: Int?
    let yearEnd: Int?
    let isCurrent: Bool
    let colors: TeamColors
    let imagePath: String?
}

// The full team snapshot the native app caches and renders — team identity, every
// depth-chart/special-teams player, and the uniform archive. Mirrors lib/types.ts's
// TeamRoster, built from one projected Supabase query (SupabaseDepthRepository).
struct TeamSnapshot: Equatable {
    let team: Team
    let players: [Player]
    let specialTeams: [SpecialSlot]
    let uniforms: [Uniform]
}
