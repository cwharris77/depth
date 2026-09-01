import Foundation

// Mirrors lib/utils/team-surfaces.ts exactly. The single place a team's colors are matched
// to a UI surface: every surface resolves from the kit's three real jersey colors, plus
// white or the app ground where nothing real can do the job -- never an invented hue.
//
// Parity with the TS oracle is enforced by DepthTests/TeamSurfacesTests against
// fixtures/domain/team-surfaces.json, which covers all 105 kits. Change one side and the
// other fails; regenerate with `npx tsx fixtures/generate.mts` when the rule changes.
//
// `uniforms.ui_accent`/`on_accent` are legacy compatibility columns for iOS builds already
// on devices (see lib/uniforms/legacy-accents.ts) and must never be read here -- taking
// JerseyColors rather than TeamColors makes that a compile error rather than a convention.
// Design: ../../../obsidian/Projects/depth/specs/2026-09-01-team-color-surface-rules-design.md

/// The three colors that describe a real jersey. Mirrors lib/types.ts's JerseyColors.
struct JerseyColors: Equatable {
    let primary: String
    let secondary: String
    let accent: String
}

extension TeamColors {
    /// The jersey half of the palette, with the legacy compatibility pair dropped.
    var jersey: JerseyColors {
        JerseyColors(primary: primary, secondary: secondary, accent: accent)
    }
}

/// Fill and stroke for the player-card jersey numeral.
struct NumeralColors: Equatable {
    let fill: String
    let stroke: String
}

enum TeamSurfaces {
    // A ring sits between its fill and the page, so it only has to separate from one of
    // them. Below this on both sides it reads as neither an edge nor a mark -- only the two
    // Ravens kits (purple on black) fail it.
    private static let ringMin = 2.0

    // WCAG AA for body-sized text.
    private static let textMin = 4.5

    // WCAG AA for large text. The player-card numeral is 48pt+, so it's judged at this bar.
    private static let largeTextMin = 3.0

    private static let white = "#FFFFFF"

    /// The dot fill, the headshot fill, and the ground of any team-colored chip. Always the
    /// jersey body -- the one surface no kit can fail, because the color *is* the surface
    /// rather than something painted on it.
    static func fill(_ colors: JerseyColors) -> String {
        colors.primary
    }

    /// The ring around a fill: dot, headshot, chip edge. `secondary` is the jersey's contrast
    /// color and works for 103/105 kits. A kit whose secondary separates from neither the fill
    /// it encloses nor the page behind it (Ravens home purple-on-black, and its black-alt
    /// inverse) falls back to `accent` -- the official gold ESPN's two-color feed omits, and a
    /// real team color rather than a derived one.
    static func ring(_ colors: JerseyColors) -> String {
        let readsOnFill = contrastRatio(colors.secondary, colors.primary) >= ringMin
        let readsOnGround = contrastRatio(colors.secondary, darkBackgroundHex) >= ringMin
        return readsOnFill || readsOnGround ? colors.secondary : colors.accent
    }

    /// Text painted on a team-colored fill. Prefers the kit's own contrast color so the pair
    /// reads as the team, and falls back to white/near-black where the two jersey colors are
    /// too close (Chiefs gold-on-red is 2.72, Dolphins orange-on-aqua 1.16). The fallback isn't
    /// a compromise: most NFL jerseys use white numerals, which is what readableTextOn picks.
    static func textOnFill(_ colors: JerseyColors, fill: String? = nil) -> String {
        let ground = fill ?? colors.primary
        return contrastRatio(colors.secondary, ground) >= textMin
            ? colors.secondary
            : readableTextOn(ground)
    }

    /// The player-card jersey numeral: a filled glyph with a contrasting outline, the way a
    /// real jersey number is built. The stroke carries legibility against the page, so it's
    /// picked first and the fill takes the other real color.
    ///
    /// The swap branch is the whole reason this isn't just "stroke it white": `primary` is
    /// white on every away kit in the archive, so an unconditional white stroke renders those
    /// numerals as a solid white slab. Swapping (stroke = the white primary, fill = the dark
    /// secondary) is both legible and what the actual away jersey looks like.
    static func numeral(_ colors: JerseyColors) -> NumeralColors {
        if contrastRatio(colors.secondary, darkBackgroundHex) >= largeTextMin {
            return NumeralColors(fill: colors.primary, stroke: colors.secondary)
        }
        if contrastRatio(colors.primary, darkBackgroundHex) >= largeTextMin {
            return NumeralColors(fill: colors.secondary, stroke: colors.primary)
        }
        // Neither jersey color reads on the ground (14 kits, e.g. Ravens purple/black). White
        // is the only non-team color this type ever introduces, and only here.
        return NumeralColors(fill: colors.primary, stroke: white)
    }
}
