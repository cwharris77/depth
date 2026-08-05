import type { TeamColors } from '../types';

// Per-kit trim overrides for UniformFigure (Uniform archive per-kit design accuracy ticket).
// The renderer's default trim (one solid stripe, primary painting helmet+jersey+pants alike)
// is accurate for most of the archive's ~104 kits and stays the fallback here — a kit with no
// entry in TRIM_CONFIGS renders exactly as before. An entry only overrides what that kit
// actually needs: which color slot paints the jersey/pants body (they aren't always both
// `primary` — e.g. an orange jersey with white pants), and whether the sleeve/helmet/pants
// trim is the default solid stripe or the jagged `tiger` pattern.
//
// Stripe shapes are an exact vector trace of the owner-supplied reference renders (2025 season
// combos + the 2016 Color Rush combo — see docs/superpowers/specs, ticket "Uniform archive
// per-kit design accuracy"): each reference PNG's stripe pixels were isolated by color,
// contour-traced, and simplified to straight-edge polygons (Douglas-Peucker), then mapped from
// image-pixel space into this file's coordinate spaces via an affine fit against the mannequin's
// own known geometry (helmet silhouette bbox for HELMET_STRIPE_PATH; jersey silhouette bbox for
// the sleeve/pants paths). Not a parametric approximation — the exported *_PATH constants below
// are literal traced polygons, authored once and never hand-tuned.

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
  sleeveStripe?: 'solid' | 'tiger';
  pantsStripe?: 'none' | 'solid' | 'tiger';
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
};

// The traced helmet stripe field (5 stripes), authored in the HELMET's own raw coordinate space
// (x:139-802, y:65-674 — same space as GEO.helmet in UniformFigure.tsx, i.e. render this path as
// a sibling of the helmet's <path>, inside its `translate(80.25 11) scale(0.5)` group, no extra
// transform needed). One multi-subpath `d` string (5 disjoint stripe polygons, fill-rule
// nonzero) traced from 2025_CIN_G_black-home.png's helmet — verified pixel-identical across all
// 4 Bengals references, so one path covers every kit that sets `helmetStripe: 'tiger'`.
export const HELMET_STRIPE_PATH =
  'M409.3,516.9 L345.0,504.1 L277.4,436.8 L251.6,359.9 L258.1,276.5 L316.0,167.6 L415.8,81.0 L451.2,77.8 L435.1,100.3 L467.3,100.3 L486.6,81.0 L512.3,81.0 L560.6,103.5 L509.1,148.3 L470.5,218.9 L457.6,263.7 L457.6,366.3 L425.4,283.0 L425.4,186.8 L454.4,106.7 L422.2,106.7 L386.8,141.9 L348.2,199.6 L309.6,295.8 L309.6,359.9 L328.9,417.6 L457.6,468.9 L396.5,491.3 L409.3,516.9 Z M261.3,484.9 L242.0,484.9 L213.0,462.5 L193.7,411.2 L193.7,276.5 L213.0,218.9 L271.0,122.7 L338.5,87.4 L232.3,225.3 L206.6,302.2 L213.0,398.3 L261.3,484.9 Z M551.0,324.6 L509.1,321.4 L515.6,257.3 L554.2,180.4 L589.6,138.7 L615.3,132.3 L637.9,154.7 L573.5,218.9 L534.9,315.0 L551.0,324.6 Z M602.5,324.6 L573.5,321.4 L586.4,295.8 L679.7,215.6 L689.4,257.3 L647.5,279.8 L602.5,324.6 Z';

// The traced shoulder/sleeve-cap stripe (2 claw-shaped stripes, one with a small forked flick),
// authored in the OUTER viewBox's own coordinate space (same space as GEO.jersey/YOKE_L/YOKE_R —
// render directly, no transform). Traced from the same reference's left shoulder; the right is
// this shape mirrored across the jersey's x=294 centerline (mirroredX = 588 - x), same
// convention as YOKE_R.
export const SLEEVE_STRIPE_PATH_L =
  'M106.8,526.4 L86.0,457.6 L86.0,419.2 L103.6,411.2 L102.0,444.8 L111.6,483.2 L106.8,526.4 Z M71.6,497.6 L47.6,451.2 L47.6,441.6 L55.6,433.6 L66.8,451.2 L73.2,476.8 L71.6,497.6 Z M55.6,491.2 L36.4,491.2 L34.8,483.2 L49.2,484.8 L55.6,491.2 Z';
export const SLEEVE_STRIPE_PATH_R =
  'M481.2,526.4 L502.0,457.6 L502.0,419.2 L484.4,411.2 L486.0,444.8 L476.4,483.2 L481.2,526.4 Z M516.4,497.6 L540.4,451.2 L540.4,441.6 L532.4,433.6 L521.2,451.2 L514.8,476.8 L516.4,497.6 Z M532.4,491.2 L551.6,491.2 L553.2,483.2 L538.8,484.8 L532.4,491.2 Z';

// The Color Rush pants' actual reference (2016_CIN_7_color-rush-white.png) has no full-leg
// stripe field — just a single small diagonal claw mark on the outer knee, per leg. Traced in
// the same outer-viewBox space as GEO.pants; right is the left mirrored (mirroredX = 588 - x).
export const PANTS_KNEE_ACCENT_L =
  'M161.2,1163.2 L145.2,1156.8 L130.8,1142.4 L127.6,1132.8 L132.4,1118.4 L140.4,1139.2 L161.2,1163.2 Z';
export const PANTS_KNEE_ACCENT_R =
  'M426.8,1163.2 L442.8,1156.8 L457.2,1142.4 L460.4,1132.8 L455.6,1118.4 L447.6,1139.2 L426.8,1163.2 Z';
