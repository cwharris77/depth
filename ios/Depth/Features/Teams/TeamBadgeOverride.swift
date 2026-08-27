import Foundation

// DEP-237: per-team badge background override. Default is the team's `primary` fill with a
// `secondary` ring (web NavSwitcher parity — components/NavSwitcher.tsx). Some teams' logos
// blend into their own primary (the Buccaneers' all-red flag on a red bg), so those get a
// pinned background drawn from their OWN palette — hand-curated by Cooper, never guessed,
// mirroring the uniform-archive curation rule ("do 1-3 teams properly per session"). Colors
// are resolved from the team's runtime palette so a later ingest update to a color never
// leaves a stale hex behind. Add a row only when primary is not legible.
enum TeamBadgeOverride {
    /// Which of the team's own colors to use — resolved against the live palette, so no
    /// hardcoded hexes to go stale.
    enum ColorSource: Sendable {
        case primary
        case secondary
        case accent
        case uiAccent
    }

    struct Entry: Sendable {
        let backgroundColorSource: ColorSource
        /// Optional ring override; nil keeps the default `secondary` ring.
        let ringColorSource: ColorSource?
    }

    /// Keyed by team id.
    static let entries: [String: Entry] = [
        // Cooper (2026-08-17): Panthers keep their current blue background (uiAccent).
        "panthers": Entry(backgroundColorSource: .uiAccent, ringColorSource: nil),
        // Cooper (2026-08-17): the all-red flag blends into a red primary — use the dark
        // pewter with the orange ring so the badge still pops on the dark list.
        "buccaneers": Entry(backgroundColorSource: .secondary, ringColorSource: .accent),
        // Cooper (2026-08-26): the orange bucking horse vanished into an orange primary once
        // #516's curated `broncos-home` row replaced the ESPN-reconciled navy one. Navy
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
        case .uiAccent: uiAccent
        }
    }
}
