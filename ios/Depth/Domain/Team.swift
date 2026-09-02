import Foundation

// Mirrors lib/types.ts's TeamColors — the three colors that describe a real jersey.
//
// `ui_accent`/`on_accent` are deliberately absent. They were rendering policy stored as
// jersey data, and every surface now resolves from these three through TeamSurfaces. The
// columns still exist in Postgres for builds already on devices (lib/uniforms/legacy-accents.ts
// holds their frozen values), but this build neither selects nor decodes them, so a later
// DROP COLUMN cannot break it. See ../../../obsidian/Projects/depth/specs/
// 2026-09-01-team-color-surface-rules-design.md, "Retirement path".
struct TeamColors: Codable, Equatable {
    let primary: String
    let secondary: String
    let accent: String
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

// Mirrors lib/types.ts's TeamFormation — one real FTN-charted formation a team ran for a
// season, scoped to a unit (offense/defense). `alignment` is FTN's offense_formation
// ('SHOTGUN' | 'UNDER CENTER' | 'PISTOL') for offense, or the front name for defense;
// `personnel` is the `{RB}{TE}` shorthand (offense) or the "{dl}-{lb}-{db}" count (defense)
// that buildRealFormation/buildRealDefenseFormation turn into a layout. Carried on
// TeamSnapshot and turned into render slots by Formations.swift's topFormationSlots.
struct TeamFormation: Codable, Hashable {
    let season: Int
    let rank: Int
    let unit: Unit
    let alignment: String
    let personnel: String
    let pct: Int
}

// The full team snapshot the native app caches and renders — team identity, every
// depth-chart/special-teams player, the uniform archive, and the team's real per-team
// formations. Mirrors lib/types.ts's TeamRoster (which carries TeamFormation[] alongside
// uniforms), built from one projected Supabase query (SupabaseDepthRepository).
// Codable so T5's cache layer can encode/decode it as one JSON payload per SwiftData row.
//
// `formations` defaults to empty so existing call sites (and the memberwise initializer)
// keep compiling. A historical season always has an empty array (the ingest only covers
// the latest season — HistoricalRosterMapper never sets it), which is what makes the
// field fall back to the generic layout there. Old cached payloads predating this field
// fail the snapshot's trial decode and are discarded via the cache's "safe schema discard"
// path (a one-time refetch, not a crash).
struct TeamSnapshot: Equatable, Codable {
    let team: Team
    let players: [Player]
    let specialTeams: [SpecialSlot]
    let uniforms: [Uniform]
    let formations: [TeamFormation]

    init(
        team: Team,
        players: [Player],
        specialTeams: [SpecialSlot],
        uniforms: [Uniform],
        formations: [TeamFormation] = []
    ) {
        self.team = team
        self.players = players
        self.specialTeams = specialTeams
        self.uniforms = uniforms
        self.formations = formations
    }
}
