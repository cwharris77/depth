// Los Angeles' four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/rams (home is that sheet's row-1 figure 3, Rivalries its row-1 figure 7, away
// its row-2 figure 1, bone its row-2 figure 5). Sleeve paths use the outer 588-wide mannequin
// space; the helmet decal stays in raw helmet coordinates (x:139-802, y:65-674). Right paths mirror
// the left across the centerline x=294 (mirroredX = 588 - x).
//
// Every kit is the same construction: the horn on the shell, on each sleeve a broad band that widens
// toward the hem with a thin tail splitting off toward the shoulder edge, and on each pant leg a
// keylined stripe. No helmet stripe — the composite's helmet swatch column carries the sleeve mark,
// not a centre stripe — and no collar trim. What changes between kits is only which token colors them
// — except on Rivalries, where the tail is royal against a yellow band rather than matching it.
//
// TWO APPROXIMATIONS, both deliberate and both about texture the flat-fill layer model cannot
// express:
//   1. The numerals on every kit carry a vertical gold-to-white ramp; they are painted here as the
//      flat color the ramp starts from.
//   2. The Rivalries numerals additionally carry a dot texture over that ramp; also flattened.
// These are two-stop ramps over otherwise solid shapes, so a flat fill reads as the right kit. A
// halftone panel — Washington's road sleeve, say — would not, and is a different judgement call.
//
// Out of scope on every kit: the chest wordmark, the league shield, and the Rivalries collar script.
//
// Construction geometry only — the horn and sleeve-mark paths. The composable parts definition
// that consumes them lives in ./rams.parts.ts; the former flat RAMS_UNIFORMS was deleted in the
// migration that proved parts render byte-identically (see parts-parity.test.ts for the one-time
// gate).

// The horn, contour-traced and emitted by scripts/uniform-draw/rams_horn.py — a reproduction of a
// third-party mark, not original geometry. Re-run that script rather than hand-editing this string;
// it carries the measured placement box, the topology and why the linework does NOT come from the
// mark reference the fetch resolves. Short version: that file is the LA lockup and the helmet decal
// is the horn alone, which is not in it; the linework comes from the Commons uniform illustration
// (~400px helmet) and the placement from the GUD helmet composite (90px), mirrored because the
// illustration draws the helmet facing left.
//
// Measured topology: TWO 8-connected components and NO enclosed hole, because the spiral's tip laps
// back over its own body and the shell shows through the gap. Two subpaths, one fill, no fill rule.
// The previous pass traced the same two components off the 46px composite, which is why it read as a
// torn blob with a stair-stepped outline rather than a horn.
export const RAMS_DECAL_HORN_PATH =
  'M404.0,167.6 L383.6,167.6 L347.0,173.8 L319.3,184.4 L294.8,198.7 L254.9,236.0 L225.6,284.8 L215.8,311.5 L209.3,342.6 L209.3,399.5 L215.8,430.6 L224.8,455.4 L253.3,504.3 L277.7,530.1 L301.4,547.8 L328.2,561.2 L339.6,552.3 L351.0,553.2 L360.0,562.1 L362.4,570.9 L366.5,572.7 L416.2,573.6 L452.8,563.8 L452.8,552.3 L427.6,552.3 L397.5,546.1 L368.9,532.7 L346.1,515.9 L325.0,492.8 L309.5,468.8 L299.7,446.6 L290.8,411.0 L290.8,361.3 L295.7,338.2 L310.3,302.6 L326.6,277.7 L343.7,259.1 L362.4,244.0 L385.2,231.5 L408.0,223.5 L430.8,220.0 L452.0,220.0 L481.3,225.3 L503.3,234.2 L531.0,252.0 L562.0,285.7 L538.3,243.1 L517.2,219.1 L495.2,200.4 L468.3,184.4 L441.4,173.8 L404.8,168.4 Z M471.6,102.7 L414.6,105.4 L371.4,117.8 L325.8,142.7 L284.3,180.0 L330.7,156.0 L373.8,146.2 L421.1,147.1 L472.4,162.2 L499.2,177.3 L525.3,197.8 L550.6,225.3 L570.9,256.4 L592.1,308.8 L597.8,337.3 L599.4,371.9 L687.4,372.8 L687.4,327.5 L676.0,276.0 L654.0,226.2 L628.7,188.9 L598.6,157.8 L565.2,133.8 L516.4,111.6 L472.4,103.6 Z';

// The sleeve mark, measured on the home figure (jersey top y=184, sleeve hem y=250, figure center
// x=509.5, so scaleY = 191/66 and scaleX = 264/84.5). The band runs reference x439-447 at y197 and
// widens to x439-455 by y241; the tail is a thin wedge from x433 @ y204 down to where it meets the
// band at x439 @ y218. Both run past the hem so the jersey clip trims them flush.
export const RAMS_SLEEVE_BAND_LEFT = 'M74,420 L99,420 L124,560 L74,560 Z';
export const RAMS_SLEEVE_BAND_RIGHT = 'M514,420 L489,420 L464,560 L514,560 Z';
export const RAMS_SLEEVE_TAIL_LEFT = 'M55,436 L74,424 L74,490 Z';
export const RAMS_SLEEVE_TAIL_RIGHT = 'M533,436 L514,424 L514,490 Z';

// The pant leg stripe. GUD draws a team's stripe pattern in a leg-shaped swatch beside each figure
// rather than on the small front-view figure itself, which is why an earlier pass read these pants as
// unbroken; all four of Los Angeles' pant colors carry the same two-band stripe. Measured across those
// swatches at the sheet's scale: a keyline on the OUTER side and a wide band inboard of it, together
// spanning 16px of a 28px leg. The mannequin's own generic-pants-stripe-* layer IS that 16-unit band,
// so a part paints the generic layer as the keyline color and only the inboard 11 units are authored
// here. Gold legs read white/royal, bone legs gold/white, Rivalries black legs yellow/royal, and the
// royal legs carry a white-to-gold vertical ramp that this model flattens the same way rams.ts already
// flattens the numerals — to the color the ramp starts from, so they take a plain white band.
export const RAMS_STRIPE_BAND_LEFT = 'M123,807 H134 V1462 H123 Z';
export const RAMS_STRIPE_BAND_RIGHT = 'M454,807 H465 V1462 H454 Z';
