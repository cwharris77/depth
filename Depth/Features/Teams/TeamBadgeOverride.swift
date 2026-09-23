import Foundation

// Per-team badge background override. Default is the team's `primary` fill with a
// `secondary` ring — the same fill/ring pair TeamSurfaces resolves. The override handles a
// team's logo blending into its own background, which the general surface rules cannot see.
// Some teams' logos blend into their own primary (the Buccaneers' all-red flag on a red bg),
// so those get a pinned background drawn from their own palette. Colors are resolved from
// the team's runtime palette so a later ingest update to a color never
// leaves a stale hex behind. Add a row only when primary is not legible.
enum TeamBadgeOverride {
    /// Which of the team's own colors to use — resolved against the live palette, so no
    /// hardcoded hexes to go stale.
    enum ColorSource: Sendable {
        case primary
        case secondary
        case accent
    }

    struct Entry: Sendable {
        let backgroundColorSource: ColorSource
        /// Optional ring override; nil keeps the default `secondary` ring.
        let ringColorSource: ColorSource?
    }

    /// Keyed by team id.
    static let entries: [String: Entry] = [
        // The Panthers do not need an override. A previous background used `uiAccent`, which
        // for that kit was #36A7E0 — a brightened blue the team does not own, retired with
        // the rest of the invented accents. Their real primary #0085CA is already blue and
        // the logo reads on it, so the default applies and no override is needed. If the
        // darker blue reads worse, add a row pointing at one of the team's real colors
        // rather than reintroducing a manufactured hex. The all-red flag blends into a red
        // primary, so the dark pewter background and orange ring keep the badge legible.
        "buccaneers": Entry(backgroundColorSource: .secondary, ringColorSource: .accent),
        // The orange bucking horse blends into an orange primary, so use a navy
        // background with the orange ring — the helmet's own arrangement.
        "broncos": Entry(backgroundColorSource: .secondary, ringColorSource: .primary),
    ]

    static func backgroundColorHex(for team: Team) -> String {
        guard let entry = entries[team.id] else { return team.colors.primary }
        return team.colors[entry.backgroundColorSource]
    }

    static func ringColorHex(for team: Team) -> String {
        guard let entry = entries[team.id] else { return team.colors.secondary }
        return entry.ringColorSource.map { team.colors[$0] } ?? team.colors.secondary
    }
}

extension TeamColors {
    subscript(source: TeamBadgeOverride.ColorSource) -> String {
        switch source {
        case .primary: primary
        case .secondary: secondary
        case .accent: accent
        }
    }
}
