import type { TeamColors } from '../types';

// Per-kit trim overrides for UniformFigure (Uniform archive per-kit design accuracy ticket).
// The renderer's default trim (one solid stripe, primary painting helmet+jersey+pants alike)
// is accurate for most of the archive's ~104 kits and stays the fallback here — a kit with no
// entry in TRIM_CONFIGS renders exactly as before. An entry only overrides what that kit
// actually needs: which color slot paints the jersey/pants body (they aren't always both
// `primary` — e.g. an orange jersey with white pants), and whether the sleeve/helmet/pants
// trim is the default solid stripe or the jagged `tiger` pattern.
//
// The stripe shapes below (see ticket "Uniform archive per-kit design accuracy") are placeholder
// geometry pending a hand-authored replacement — do not treat the current *_PATH constants as
// final.

export type ColorSlot = 'primary' | 'secondary' | 'accent';

export interface TrimConfig {
  // Which TeamColors slot (or literal hex) paints the helmet shell. Default 'primary' (today's
  // behavior) — overridden when a kit's curated `primary` is that KIT's dominant body color
  // rather than the team's constant helmet color (Cincinnati's helmet is always orange, but the
  // away/color-rush kits' `primary` is white — see bengals-away below).
  helmetColor?: ColorSlot | string;
  // Which TeamColors slot paints the jersey/pants body. Default 'primary' (today's behavior).
  jerseyColor?: ColorSlot;
  pantsColor?: ColorSlot;
  // Color used for stripe/trim accents on the JERSEY and PANTS (sleeve caps, pants leg, number
  // outline, collar). Default 'secondary'. Accepts a literal hex for the rare kit whose curated
  // primary/secondary/accent trio doesn't include the needed trim color (e.g. an away kit
  // with no black in its brand triad) — see bengals-away below.
  stripeColor?: ColorSlot | string;
  // Color used for the helmet's own stripe. Separate from `stripeColor` because the helmet's
  // base color doesn't always match the jersey's — e.g. bengals-home has a black jersey with
  // orange stripes (stripeColor='primary'), but its helmet is orange with BLACK stripes, so
  // reusing `stripeColor` there would paint orange stripes on the orange helmet (invisible).
  // Defaults to `stripeColor` when omitted.
  helmetStripeColor?: ColorSlot | string;
  helmetStripe?: 'solid' | 'tiger';
  // 'none' skips the shoulder mark entirely — for a kit like bills-rivalries-2025 whose shoulder
  // is a plain accent-free tone-on-tone finish, the default solid accent triangle is wrong, not
  // just imprecise.
  sleeveStripe?: 'solid' | 'tiger' | 'bills' | 'none';
  pantsStripe?: 'none' | 'solid' | 'tiger';
  // A team-specific logo decal (not a stripe pattern) painted over the helmet shell in place of
  // the default stripe band — includes the back-edge piping stripe, since for a team with a
  // decal the plain default band never applies either way. Unlike the stripe fields above, a
  // decal's own fill colors are fixed team-brand hex, not resolved from the kit's TeamColors —
  // a team's helmet logo doesn't recolor between home/away the way the jersey does. `'bills-ice'`
  // is the Rivalries alternate's tone-on-tone treatment: same buffalo/stripe geometry, recolored
  // silver with a thin navy outline, no red fill and no back-edge piping (the reference has none).
  helmetDecal?: 'bills' | 'bills-ice';
  // A team-specific multi-color neckline band, layered as concentric strokes (BILLS_COLLAR_WIDTHS)
  // over the default single-color V-neck seam line.
  collarTrim?: 'bills';
  // Override for the jersey number's fill color. Default (undefined) computes it from
  // `readableTextOn(jerseyFill)` — a plain light/dark contrast pick, not a team color. That's
  // right when a team's number is genuinely just "whichever of black/white reads" (most of the
  // archive), but wrong for a team whose number is a specific brand color regardless of contrast
  // — e.g. the Bills' number is always navy, even on the white away jersey where the contrast
  // pick would land on near-black instead.
  numberColor?: ColorSlot | string;
}

export function resolveTrimColor(slotOrHex: ColorSlot | string, colors: TeamColors): string {
  if (slotOrHex === 'primary' || slotOrHex === 'secondary' || slotOrHex === 'accent') {
    return colors[slotOrHex];
  }
  return slotOrHex;
}

export const TRIM_CONFIGS: Record<string, TrimConfig> = {
  // Black home: black jersey + pants, orange tiger stripes. The ESPN-owned `home` kit's
  // primary is Cincinnati's brand orange (their logo color, not what's worn most), so jersey
  // and pants both pull from `secondary` (black) here instead of the default `primary`.
  'bengals-home': {
    jerseyColor: 'secondary',
    pantsColor: 'secondary',
    stripeColor: 'primary',
    helmetStripeColor: 'secondary',
    helmetStripe: 'tiger',
    sleeveStripe: 'tiger',
    pantsStripe: 'none',
  },
  // White away: white jersey + pants, black tiger stripes. The curated row's secondary/accent
  // are both brand orange (picked for the old generic-trim renderer's sake), so black is a
  // literal hex here rather than a color-slot reference. The helmet stays Bengals orange even
  // though this kit's `primary` is white.
  'bengals-away': {
    helmetColor: '#FB4F14',
    stripeColor: '#000000',
    helmetStripe: 'tiger',
    sleeveStripe: 'tiger',
    pantsStripe: 'none',
  },
  // Orange alternate: orange jersey, white pants (the curated row's `accent`), black stripes.
  'bengals-orange-alt': {
    pantsColor: 'accent',
    stripeColor: 'secondary',
    helmetStripe: 'tiger',
    sleeveStripe: 'tiger',
    pantsStripe: 'none',
  },
  // Color Rush: all white ("a nod to the white tiger" — Bengals' own framing), black stripes,
  // and the only Bengals combo with a tiger-stripe pants leg accent. Helmet stays orange even
  // though this kit's `primary` is white, same reasoning as bengals-away.
  'bengals-color-rush': {
    helmetColor: '#FB4F14',
    stripeColor: 'secondary',
    helmetStripe: 'tiger',
    sleeveStripe: 'tiger',
    pantsStripe: 'tiger',
  },
  // Home: royal-blue jersey/pants over the white shell every Bills kit shares — the helmet
  // never follows the jersey's color scheme, so it's a literal hex here (not a ColorSlot) same
  // as the Bengals overrides above.
  'bills-home': {
    helmetColor: '#FFFFFF',
    helmetDecal: 'bills',
    sleeveStripe: 'bills',
    collarTrim: 'bills',
  },
  // Away: white jersey/pants (this kit's curated `primary`) over the same white-shell helmet as
  // home. The number is navy with a red outline regardless of jersey color (see `numberColor`
  // above) — on the home kit the default contrast-based fill already lands on white, so only
  // away needs the override; its default `secondary` (navy) also needs to become red here so the
  // outline doesn't blend into the navy number fill.
  'bills-away': {
    helmetColor: '#FFFFFF',
    helmetDecal: 'bills',
    sleeveStripe: 'bills',
    collarTrim: 'bills',
    stripeColor: '#C60C30',
    numberColor: '#00338D',
  },
  // Rivalries (2025–): the "ice" alternate — white-on-white with a tone-on-tone silver/navy
  // helmet decal, no red anywhere, and none of the other kits' sleeve/collar banding (the
  // reference's shoulder is a plain frost texture, not a colored mark — the texture itself isn't
  // reproduced here, just the absence of a colored accent). Number is silver with a navy outline
  // instead of the default black/white contrast pick.
  'bills-rivalries-2025': {
    helmetDecal: 'bills-ice',
    sleeveStripe: 'none',
    pantsStripe: 'none',
    stripeColor: '#00338D',
    numberColor: '#A9ADB1',
  },
  // Away: white jersey (this kit's curated `primary`), but the helmet is always navy regardless
  // of jersey color, and this curated row's `secondary` is navy (not the green the reference's
  // number outline actually uses) — override both. No helmet decal yet (see the note near the
  // bottom of this file) — the home kit's own primary/secondary already happen to be navy/
  // action-green (lib/teams/league.ts) so it needs no entry at all until a decal exists to add.
  'seahawks-away': {
    helmetColor: '#002244',
    stripeColor: 'accent',
  },
};

// The helmet stripe field (5 stripes), authored in the HELMET's own raw coordinate space
// (x:139-802, y:65-674 — same space as GEO.helmet in UniformFigure.tsx, i.e. render this path as
// a sibling of the helmet's <path>, inside its `translate(80.25 11) scale(0.5)` group, no extra
// transform needed). One multi-subpath `d` string (5 disjoint stripe polygons, fill-rule
// nonzero) shared by every kit that sets `helmetStripe: 'tiger'`.
export const HELMET_STRIPE_PATH =
  'M409.3,516.9 L345.0,504.1 L277.4,436.8 L251.6,359.9 L258.1,276.5 L316.0,167.6 L415.8,81.0 L451.2,77.8 L435.1,100.3 L467.3,100.3 L486.6,81.0 L512.3,81.0 L560.6,103.5 L509.1,148.3 L470.5,218.9 L457.6,263.7 L457.6,366.3 L425.4,283.0 L425.4,186.8 L454.4,106.7 L422.2,106.7 L386.8,141.9 L348.2,199.6 L309.6,295.8 L309.6,359.9 L328.9,417.6 L457.6,468.9 L396.5,491.3 L409.3,516.9 Z M261.3,484.9 L242.0,484.9 L213.0,462.5 L193.7,411.2 L193.7,276.5 L213.0,218.9 L271.0,122.7 L338.5,87.4 L232.3,225.3 L206.6,302.2 L213.0,398.3 L261.3,484.9 Z M551.0,324.6 L509.1,321.4 L515.6,257.3 L554.2,180.4 L589.6,138.7 L615.3,132.3 L637.9,154.7 L573.5,218.9 L534.9,315.0 L551.0,324.6 Z M602.5,324.6 L573.5,321.4 L586.4,295.8 L679.7,215.6 L689.4,257.3 L647.5,279.8 L602.5,324.6 Z';

// The shoulder/sleeve-cap stripe (2 claw-shaped stripes, one with a small forked flick),
// authored in the OUTER viewBox's own coordinate space (same space as GEO.jersey/YOKE_L/YOKE_R —
// render directly, no transform). The right shape is the left one mirrored across the jersey's
// x=294 centerline (mirroredX = 588 - x), same convention as YOKE_R.
export const SLEEVE_STRIPE_PATH_L =
  'M106.8,526.4 L86.0,457.6 L86.0,419.2 L103.6,411.2 L102.0,444.8 L111.6,483.2 L106.8,526.4 Z M71.6,497.6 L47.6,451.2 L47.6,441.6 L55.6,433.6 L66.8,451.2 L73.2,476.8 L71.6,497.6 Z M55.6,491.2 L36.4,491.2 L34.8,483.2 L49.2,484.8 L55.6,491.2 Z';
export const SLEEVE_STRIPE_PATH_R =
  'M481.2,526.4 L502.0,457.6 L502.0,419.2 L484.4,411.2 L486.0,444.8 L476.4,483.2 L481.2,526.4 Z M516.4,497.6 L540.4,451.2 L540.4,441.6 L532.4,433.6 L521.2,451.2 L514.8,476.8 L516.4,497.6 Z M532.4,491.2 L551.6,491.2 L553.2,483.2 L538.8,484.8 L532.4,491.2 Z';

// The Color Rush pants' trim is a single small diagonal claw mark on the outer knee, per leg —
// not a full-leg stripe field. Authored in the same outer-viewBox space as GEO.pants; right is
// the left mirrored (mirroredX = 588 - x).
export const PANTS_KNEE_ACCENT_L =
  'M161.2,1163.2 L145.2,1156.8 L130.8,1142.4 L127.6,1132.8 L132.4,1118.4 L140.4,1139.2 L161.2,1163.2 Z';
export const PANTS_KNEE_ACCENT_R =
  'M426.8,1163.2 L442.8,1156.8 L457.2,1142.4 L460.4,1132.8 L455.6,1118.4 L447.6,1139.2 L426.8,1163.2 Z';

// Buffalo Bills brand hex — the helmet decal and jersey marks below use these directly rather
// than a ColorSlot: a team's logo/trim colors are fixed regardless of which kit's `primary` is
// currently white vs blue (see bills-home/bills-away above), same reasoning as the Bengals
// literal-hex overrides.
const BILLS_NAVY = '#00338D';
const BILLS_RED = '#C60C30';

// The Bills' charging-buffalo helmet decal, hand-traced from the team's 2025 helmet reference
// (gridiron-uniforms.com composite chart) at the source image's native resolution — the source
// is a small (~105x97px) flat-color illustration, so fine detail below that resolution (the
// buffalo's individual trailing leg lines) is faithfully reproduced only to the extent the
// source actually resolves it, not invented. Authored in the same coordinate space as
// HELMET_STRIPE_PATH (x:139-802, y:65-674). Two layers, painted in order: the buffalo silhouette
// first, then the diagonal stripe on top, matching the source artwork's own z-order. The
// stripe's white pinstripe isn't a separate layer — it's a notch traced directly into the
// stripe polygon's own boundary (the source's white gap was never a filled shape, just an
// absence of red pixels), so it shows through from the white helmet shell underneath.
export const BILLS_HELMET_DECAL_BUFFALO = {
  d: 'M542.2,156.0 L547.8,167.0 L545.6,208.8 L536.2,225.1 L528.9,250.5 L513.4,259.6 L509.3,270.0 L497.0,282.2 L492.9,281.6 L493.9,270.9 L488.8,264.7 L458.8,264.3 L447.5,272.5 L446.2,283.8 L438.0,294.2 L385.9,308.3 L379.3,313.6 L376.1,310.8 L380.5,300.1 L404.5,283.8 L402.9,276.6 L356.2,283.2 L350.2,288.5 L311.1,289.8 L294.3,295.7 L272.9,308.3 L245.7,335.9 L238.5,351.0 L220.8,367.6 L214.5,393.7 L210.0,394.6 L204.0,384.9 L205.6,369.8 L215.4,359.8 L219.8,344.4 L247.3,315.2 L255.5,294.5 L266.9,287.6 L474.3,229.2 L481.2,224.2 L495.8,222.9 L503.3,217.2 L509.3,217.6 L514.7,228.9 L525.8,227.6 L521.0,219.1 L523.9,209.1 L520.4,201.9 L532.7,183.3 L530.2,176.1 L279.2,232.0 L301.9,211.6 L326.8,197.2 L363.5,162.0 L421.6,130.0 L444.9,123.1 L470.8,123.7 L506.2,150.7 L530.2,149.1 Z',
  fill: BILLS_NAVY,
};
export const BILLS_HELMET_DECAL_STRIPE = {
  d: 'M503.6,192.8 L501.8,197.8 L503.3,206.6 L493.5,213.2 L479.3,214.4 L471.4,219.8 L457.9,220.7 L450.9,225.7 L436.4,227.0 L428.5,232.3 L416.2,232.9 L407.7,238.3 L393.5,239.5 L385.3,244.9 L372.0,245.8 L365.1,251.2 L350.8,252.1 L344.2,257.1 L329.7,258.4 L322.4,263.4 L308.2,264.7 L301.0,269.7 L286.8,270.9 L279.2,276.0 L265.3,277.2 L258.0,282.2 L247.3,283.5 L237.2,288.5 L223.9,290.4 L215.1,295.1 L203.1,296.4 L193.3,301.7 L185.4,301.7 L185.4,298.2 L190.1,294.2 L191.7,285.1 L196.8,277.8 L198.7,267.8 L208.1,257.4 L216.4,254.9 L232.8,253.4 L242.9,248.6 L257.7,247.7 L271.9,242.4 L286.8,242.0 L298.1,236.7 L316.1,235.5 L325.9,230.4 L343.6,229.2 L354.6,223.8 L371.7,222.9 L381.2,217.9 L399.1,216.6 L410.2,211.3 L427.2,210.3 L436.7,205.0 L455.0,204.1 L463.6,198.7 L480.6,198.1 L491.3,192.8 Z',
  fill: BILLS_RED,
};

// The two-tone (navy outer / red inset) trim stripe down the back of the Bills' shell, traced
// as centerline samples off the same reference image and rendered as strokes rather than filled
// polygons — it's a thin piping line, not a solid shape. Same coordinate space as
// HELMET_STRIPE_PATH.
export const BILLS_HELMET_EDGE_STRIPE_OUTER = {
  d: 'M221.1,146.0 L206.2,164.8 L191.4,183.7 L176.9,202.5 L165.2,221.3 L154.5,240.2 L147.2,259.0 L147.8,277.8 L153.8,296.7 L154.2,315.5 L157.0,334.3 L158.6,353.2 L163.3,372.0 L164.9,390.8 L170.3,409.7 L172.8,428.5 L177.8,447.4 L183.2,466.2',
  stroke: BILLS_NAVY,
  strokeWidth: 16,
};
export const BILLS_HELMET_EDGE_STRIPE_INNER = {
  d: 'M212.9,259.6 L209.4,272.2 L206.6,284.7 L199.0,297.3 L192.7,309.9 L187.9,322.4 L186.4,335.0 L187.9,347.5 L191.1,360.1 L195.8,372.6 L200.6,385.2',
  stroke: BILLS_RED,
  strokeWidth: 9,
};

// The jersey sleeve mark: two red/white/navy triple bands per shoulder, traced off the reference
// (the middle white stripe visually disappears against a white jersey and the navy stripe
// visually disappears against a navy jersey — the source art paints all three explicitly rather
// than relying on the jersey body to show through, so this does too). Authored in the outer
// viewBox space (same as GEO.jersey/YOKE_L); right is the left mirrored (mirroredX = 588 - x).
export const BILLS_SLEEVE_RED_L =
  'M44,432 L140,432 L140,439 L44,439 Z M44,472 L140,472 L140,479 L44,479 Z';
export const BILLS_SLEEVE_WHITE_L =
  'M44,439 L140,439 L140,446 L44,446 Z M44,479 L140,479 L140,486 L44,486 Z';
export const BILLS_SLEEVE_NAVY_L =
  'M44,446 L140,446 L140,453 L44,453 Z M44,486 L140,486 L140,493 L44,493 Z';
export const BILLS_SLEEVE_RED_R =
  'M448,432 L544,432 L544,439 L448,439 Z M448,472 L544,472 L544,479 L448,479 Z';
export const BILLS_SLEEVE_WHITE_R =
  'M448,439 L544,439 L544,446 L448,446 Z M448,479 L544,479 L544,486 L448,486 Z';
export const BILLS_SLEEVE_NAVY_R =
  'M448,446 L544,446 L544,453 L448,453 Z M448,486 L544,486 L544,493 L448,493 Z';

// The Bills' collar/neckline trim: a navy/red/white banded piping around the V-neck seam, layered
// as concentric strokes over the same chevron path UniformFigure already draws for every kit's
// neckline (white widest at the back, red mid, navy thinnest on top — same layering trick the
// renderer uses for the jersey number's outline). Same reasoning as the sleeve mark re: painting
// all three colors explicitly rather than counting on jersey-body transparency.
export const BILLS_COLLAR_WIDTHS = { white: 26, red: 18, navy: 9 };
export { BILLS_NAVY, BILLS_RED };

// The Rivalries "ice" alternate's tone-on-tone helmet decal — same BILLS_HELMET_DECAL_BUFFALO /
// BILLS_HELMET_DECAL_STRIPE geometry, recolored: the reference has no red fill at all, just two
// adjacent silver tones (a slightly lighter one where the color version's red stripe sat) with a
// thin navy outline traced around each piece.
export const BILLS_ICE_SILVER = '#9CA0A4';
export const BILLS_ICE_SILVER_LIGHT = '#D6D8DA';

// Seattle Seahawks helmet decal — pending a compliant high-resolution source. A hand-trace off
// the ~106x97px gridiron-uniforms.com raster couldn't resolve this logo's thin linework (it's a
// fine-line mark, not a bold silhouette like the Bills buffalo, so low-resolution pixel-tracing
// falls apart in a way it didn't for Bills). The team's official vector logo would solve that,
// but the only copy checked so far (Wikipedia's File:Seattle_Seahawks_logo.svg) is hosted under
// Wikipedia's own non-free/fair-use policy — permission scoped to their encyclopedic use, not
// transferable here — so it isn't used. No Seahawks helmet decal is implemented until a source
// without that restriction is found.
