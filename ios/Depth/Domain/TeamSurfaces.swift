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

    // A mark on the ground has no fill to borrow contrast from, so it is judged against the
    // ground alone -- at the graphical-object bar, not body-text AA: these are underlines,
    // tints and borders, and 4.5 would reject six kits' real colors for their white body.
    private static let markMin = 3.0

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

    /// A mark that floats on the app ground with no fill behind it: the unit-tab underline,
    /// the tab-bar tint, the overflow menu, a chip's text and border. This is the surface
    /// ring(_:) must NOT be used for -- a ring may borrow contrast from the fill it encloses,
    /// and one that reads against a white dot (Seahawks away navy on white) is invisible once
    /// the same hex is painted straight onto the ground.
    ///
    /// The candidate order is the whole rule. `primary` is the jersey BODY, and no team puts
    /// navy numerals on a navy jersey -- Seattle's are green, Oakland's silver. A kit already
    /// carries the color it uses to be seen, so ask for that half first and fall back to the
    /// body last. Ordering primary earlier is what washed the chrome out: primary is #FFFFFF
    /// on all 32 current away kits, so a body-first rule turns every away kit's chrome white.
    ///
    /// 95 of 98 current kits clear the bar with one of their own colors. The three that
    /// cannot (Texans, Giants, Falcons home) take the BEST of the three rather than the body:
    /// falling back to `primary` would hand the Texans their #03202F navy at 1.08 while the
    /// kit owns a red at 2.43. Dim is a background problem and the 2026-07-03 precedent says
    /// live with it -- but never pick a worse real color than the kit offers.
    static func mark(_ colors: JerseyColors) -> String {
        let candidates = [colors.secondary, colors.accent, colors.primary]
        if let clears = candidates.first(where: { contrastRatio($0, darkBackgroundHex) >= markMin })
        {
            return clears
        }
        return candidates.max { contrastRatio($0, darkBackgroundHex) < contrastRatio($1, darkBackgroundHex) }
            ?? colors.primary
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
