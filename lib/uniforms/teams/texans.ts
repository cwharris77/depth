import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Houston's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/texans (home is that sheet's row-1 figure 1, away its row-1 figure 5, Battle Red
// its row-2 figure 3). Right paths mirror the left across the centerline x=294.
//
// This is a minimal uniform and the module is correspondingly small — that is the measurement, not
// an omission. No sleeve stripe, no pant stripe, no helmet stripe. The home kit carries a collar
// trim; the other two carry none at all, so their only construction is the numeral treatment.
//
// The club's bull-horn mark sits on each sleeve and is NOT authored — see above on size.
//
// THE HELMET MARK IS ALSO NOT AUTHORED, and the reason is worth recording because it is not the
// usual one. Size is fine: the away figure (row-1 figure 5) draws the bull about 50x44 reference
// px, well clear of the ~25px floor, and it was traced from there rather than from the home
// figure. What defeats it is that the bull's LEFT HALF IS THE SAME NAVY AS THE SHELL — sampled,
// both are exactly (3,24,37) — so no predicate separates the mark from the surface it sits on. The
// only thing dividing them is the white keyline, and that keyline breaks into four disconnected
// components at this resolution, so it cannot be closed into a region to fill either. Every other
// mark in this archive is separable by color from its shell; this one is not, which is a different
// failure from the Falcons' and Raiders' fine linework. Re-derive from a source where the bull's
// navy and the shell navy are distinct values.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "H-TOWN" collar tab, the
// sleeve mark above, and the shoulder numerals.

// White is a literal on the home kit only. Its palette is navy over red with accent === secondary
// (ESPN supplies only two colors), so nothing resolves to its white pants or white numeral face.
export const TEXANS_WHITE = '#FFFFFF';

// The collar, measured on the home figure (jersey top y=135, sleeve hem y=201, figure center
// x=100.5, so scaleY = 191/66 and scaleX = 264/84.5). The red band runs from reference (74,138) to
// (87,161) and mirrored. Extrapolated, the arms would not meet until y=186 — well past where the
// color stops — so this is two arcs, not a chevron, the same shape Jacksonville and Denver wear.
const TEXANS_COLLAR_LEFT = 'M211,392 L252,458';
const TEXANS_COLLAR_RIGHT = 'M377,392 L336,458';
const TEXANS_COLLAR_WIDTH = 10;

const GENERIC_STRIPPED = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
  'generic-collar',
  'generic-pants-stripe-left',
  'generic-pants-stripe-right',
];

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    ['texans-collar-left', TEXANS_COLLAR_LEFT],
    ['texans-collar-right', TEXANS_COLLAR_RIGHT],
  ].map(([id, d]) => ({
    id,
    surface: 'collar' as const,
    d,
    clip: true,
    kind: 'stroke' as const,
    stroke,
    strokeWidth: TEXANS_COLLAR_WIDTH,
  }));
}

export const TEXANS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'texans',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Navy body over white pants under the navy shell. Red is `secondary` and accent === secondary,
    // so red carries the collar and the numeral keyline while white — which this palette cannot
    // supply — takes the literal for both the pants and the numeral face.
    home: {
      pantsColor: TEXANS_WHITE,
      layers: collar('secondary'),
      number: { fill: TEXANS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body over navy pants under the navy shell, and no collar trim — the reference draws its
    // neckline in outline only. The away palette moves white into primary, navy into secondary and
    // red into accent, so the numerals invert to a navy face on a red keyline.
    away: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Red body, pants and shell, all `primary`, and no collar trim. Navy moves to `secondary` and
    // white is available as `accent`, so the numerals need no literal here.
    'battle-red': {
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
  },
};
