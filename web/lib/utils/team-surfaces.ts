import type { JerseyColors } from '@/lib/types';
import { contrastRatio, readableTextOn, DARK_BG } from '@/lib/utils/colors';

// The single place a team's colors are matched to a UI surface. Every surface resolves
// from the kit's three real jersey colors (primary/secondary/accent) plus, where nothing
// real can do the job, white or the app ground -- never an invented hue.
//
// This module exists because the answer used to be stored per-kit instead of computed.
// `uniforms.ui_accent` was a free-form hex, so nothing stopped it holding a color the team
// doesn't own, and 63 of 105 kits ended up with one (a single invented orange #FF6A33 stood
// in for the Bengals, Browns, Broncos and Bears at once). Storing the answer also meant it
// couldn't track the app: `on_accent` still holds #0a0e1a, the background from before
// DEP-274 moved it to #15161a. Design: ../obsidian/Projects/depth/specs/
// 2026-09-01-team-color-surface-rules-design.md.
//
// Call sites ask for a surface and never compose contrast logic themselves -- a rule kept
// in a function can't be forgotten by the next view that needs a team color (mistake #19).
// `uiAccent`/`onAccent` are legacy compatibility columns for already-installed iOS builds
// (see lib/uniforms/legacy-accents.ts) and must never be read here.

// A ring sits between its fill and the page, so it only has to separate from one of them.
// Below this on both sides it reads as neither an edge nor a mark -- only the two Ravens
// kits (purple on black) fail it.
const RING_MIN = 2;

// WCAG AA for body-sized text.
const TEXT_MIN = 4.5;

// WCAG AA for large text. The player-card numeral is 48pt+, so it's judged at this bar
// rather than TEXT_MIN.
const LARGE_TEXT_MIN = 3;

// A mark on the app ground carries no fill to borrow contrast from, so it is judged against
// the ground alone. Held at the large-text/graphical-object bar rather than TEXT_MIN: these
// are underlines, tints and borders, not body copy, and 4.5 would reject six kits' real
// colors in favour of their white jersey body.
const MARK_MIN = 3;

const WHITE = '#FFFFFF';

// The dot fill, the headshot fill, and the ground of any team-colored chip. Always the
// jersey body -- this is the one surface no kit can fail, because the color *is* the
// surface rather than something painted on it.
export function teamFill(colors: JerseyColors): string {
  return colors.primary;
}

// The ring around a fill: dot, headshot, chip edge. `secondary` is the jersey's contrast
// color and works for 103/105 kits. The exception is a kit whose secondary separates from
// neither the fill it encloses nor the page behind it (Ravens home purple-on-black, and
// its black-alt inverse), which falls back to `accent` -- the official gold ESPN's
// two-color feed omits, and a real team color, not a derived one.
export function teamRing(colors: JerseyColors): string {
  const { primary, secondary, accent } = colors;
  const readsOnFill = contrastRatio(secondary, primary) >= RING_MIN;
  const readsOnGround = contrastRatio(secondary, DARK_BG) >= RING_MIN;
  return readsOnFill || readsOnGround ? secondary : accent;
}

// Text painted on a team-colored fill. Prefers the kit's own contrast color so the pair
// reads as the team (58 kits), and falls back to plain white/near-black where the two
// jersey colors are too close (Chiefs gold-on-red is 2.72, Dolphins orange-on-aqua 1.16).
// The fallback isn't a compromise: most NFL jerseys use white numerals, which is exactly
// what readableTextOn picks for a dark body.
export function textOnFill(colors: JerseyColors, fill: string = colors.primary): string {
  return contrastRatio(colors.secondary, fill) >= TEXT_MIN
    ? colors.secondary
    : readableTextOn(fill);
}

// A mark that floats on the app ground with no fill behind it: the unit-tab underline, the
// tab-bar tint, the overflow menu, a segmented control's inactive label, a chip's text and
// border. This is the surface teamRing() must NOT be used for -- a ring may borrow contrast
// from the fill it encloses, and one that reads against a white dot (Seahawks away navy on
// white) is invisible once the same hex is painted straight onto #15161a.
//
// The candidate order is the whole rule. `primary` is the jersey BODY, and no team puts navy
// numerals on a navy jersey -- Seattle's are green, Oakland's silver. A kit already carries
// the color it uses to be seen, so ask for that half first and only fall back to the body.
// Ordering primary earlier is what washed the chrome out: primary is #FFFFFF on all 32
// current away kits, so a body-first rule turns every away kit's chrome white.
//
// 95 of 98 current kits clear the bar with one of their own colors. The three that cannot
// (Texans, Giants and Falcons home -- dark bodies with a mid-red, whose away kits are fine)
// take the best of the three rather than the body: falling back to `primary` would hand the
// Texans their #03202F navy at 1.08 while the kit owns a red at 2.43. Dim is a background
// problem and the 2026-07-03 precedent says live with it -- but there is never a reason to
// pick a *worse* real color than the kit offers.
export function kitMark(colors: JerseyColors): string {
  const candidates = [colors.secondary, colors.accent, colors.primary];
  return (
    candidates.find((hex) => contrastRatio(hex, DARK_BG) >= MARK_MIN) ??
    candidates.reduce((best, hex) =>
      contrastRatio(hex, DARK_BG) > contrastRatio(best, DARK_BG) ? hex : best
    )
  );
}

export interface NumeralColors {
  fill: string;
  stroke: string;
}

// The player-card jersey numeral: a filled glyph with a contrasting outline, the way a real
// jersey number is built. The stroke is what carries legibility against the page, so it's
// picked first and the fill takes the other real color.
//
// The swap branch is the whole reason this isn't just "stroke it white": `primary` is white
// on every away kit in the archive, so an unconditional white stroke renders those numerals
// as a solid white slab. Swapping (stroke = the white primary, fill = the dark secondary) is
// both legible and what the actual away jersey looks like.
export function numeralColors(colors: JerseyColors): NumeralColors {
  const { primary, secondary } = colors;
  if (contrastRatio(secondary, DARK_BG) >= LARGE_TEXT_MIN) {
    return { fill: primary, stroke: secondary };
  }
  if (contrastRatio(primary, DARK_BG) >= LARGE_TEXT_MIN) {
    return { fill: secondary, stroke: primary };
  }
  // Neither jersey color reads on the ground (14 kits, e.g. Ravens purple/black). White is
  // the only non-team color this module ever introduces, and only here.
  return { fill: primary, stroke: WHITE };
}
