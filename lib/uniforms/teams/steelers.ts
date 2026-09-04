// Pittsburgh's construction geometry — the hypocycloid decal, sleeve/pant stripe and bumblebee
// paths, and the construction color constants only. The composable parts definition that consumes
// them lives in ./steelers.parts.ts; the former flat STEELERS_UNIFORMS was deleted in the
// migration that proved parts render byte-identically (see parts-parity.test.ts for the one-time
// gate).

// The three hypocycloids, traced from the home figure's shell (bbox x58-164, y93-189 in the
// reference) mapped onto the raw helmet space at ~6.25x. The wordmark inside the disc renders
// about six px tall and would be illegible geometry, so it is out; the three diamonds trace
// cleanly at ~9px each.
//
// The DISC IS NOT A TRACE. Traced, its contour comes back polygonal and notched where the wordmark
// punches into it, which reads as damage rather than as a circle. It is authored instead as a
// circle fitted to the traced bounds — center (430.8, 226.4), r 79 — which is both cleaner and
// closer to the thing it represents. Left where it is, on the shell's upper-left: the reference
// composite draws the mark on the visible side, and the reference is the source of truth.
export const STEELERS_DECAL_DISC_PATH =
  'M351.8,226.4 A79.0,79.0 0 1 0 509.8,226.4 A79.0,79.0 0 1 0 351.8,226.4 Z';
export const STEELERS_DECAL_GOLD_PATH =
  'M428.6,157.0 L447.4,179.8 L456.1,183.0 L453.0,188.7 L438.6,198.9 L430.5,214.1 L419.2,194.4 L406.1,184.9 L426.7,165.9 L428.0,157.6 Z';
export const STEELERS_DECAL_RED_PATH =
  'M471.8,199.5 L484.3,217.9 L499.3,226.1 L483.0,235.0 L475.5,243.3 L473.0,252.1 L459.9,235.6 L443.6,227.4 L457.4,217.9 L471.1,200.1 Z';
export const STEELERS_DECAL_BLUE_PATH =
  'M428.6,233.1 L439.9,252.8 L448.0,261.0 L458.6,264.2 L456.1,269.9 L438.6,283.9 L430.5,299.7 L426.7,297.8 L426.7,289.6 L419.2,276.2 L398.6,265.5 L401.7,261.7 L411.1,261.7 L419.8,252.8 L427.3,243.3 L428.6,233.7 Z';

// Construction colors are fixed across kits — the sleeve stripe set does not recolor when the body
// changes black/white, and its black separators only become visible on the white away body.
// Official hexes from teamcolorcodes; GUD renders the gold as #FDD638, a step brighter.
export const STEELERS_GOLD = '#FFB612';
export const STEELERS_BLACK = '#101820';
// The 1934 throwback's khaki pants have no token on that kit's palette. Sampled from the composite.
export const STEELERS_BUMBLEBEE_KHAKI = '#D2C295';

export const STEELERS_DECAL_RED = '#C60C30';
export const STEELERS_DECAL_BLUE = '#00539B';

// Sleeve stripe set, pant stripes, bumblebee panel. See the original for the full measurement
// notes; the flat definition's builder helpers are what was deleted.
export const STEELERS_SLEEVE_BACKING_LEFT = 'M30,470 H96 V551 H30 Z';
export const STEELERS_SLEEVE_BACKING_RIGHT = 'M492,470 H558 V551 H492 Z';
export const STEELERS_SLEEVE_GOLD_UPPER_LEFT = 'M30,473 H96 V486 H30 Z';
export const STEELERS_SLEEVE_GOLD_UPPER_RIGHT = 'M492,473 H558 V486 H492 Z';
export const STEELERS_SLEEVE_WHITE_LEFT = 'M30,491 H96 V500 H30 Z';
export const STEELERS_SLEEVE_WHITE_RIGHT = 'M492,491 H558 V500 H492 Z';
export const STEELERS_SLEEVE_GOLD_LOWER_LEFT = 'M30,506 H96 V548 H30 Z';
export const STEELERS_SLEEVE_GOLD_LOWER_RIGHT = 'M492,506 H558 V548 H492 Z';
export const STEELERS_PANTS_BLACK_LEFT = 'M112,807 H140 V1462 H112 Z';
export const STEELERS_PANTS_BLACK_RIGHT = 'M448,807 H476 V1462 H448 Z';
export const STEELERS_PANTS_WHITE_LEFT = 'M122,807 H130 V1462 H122 Z';
export const STEELERS_PANTS_WHITE_RIGHT = 'M458,807 H466 V1462 H458 Z';
export const STEELERS_BUMBLEBEE_CHEVRON_PATH = 'M111,408 L294,548 L477,408';
export const STEELERS_BUMBLEBEE_CHEVRON_WIDTH = 56;
export const STEELERS_BUMBLEBEE_TORSO_PATH = 'M158,505 H433 V806 H158 Z';
export const STEELERS_BUMBLEBEE_PINSTRIPE_XS = [180, 236, 293, 346, 402];
