import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Houston's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/texans (home is that sheet's row-1 figure 1, away its row-1 figure 5, Battle Red
// its row-2 figure 3). Right paths mirror the left across the centerline x=294.
//
// This is a minimal uniform and the module is correspondingly small — that is the measurement, not
// an omission. No sleeve stripe, no pant stripe, no helmet stripe. The home kit carries a collar
// trim; the other two carry none at all, so their only construction is the numeral treatment.
//
// The club's bull-horn mark sits on each sleeve and is NOT authored — at about 13x18 reference px
// with a sub-2px white sliver through it, it is stroke-bearing detail well under the ~25px floor.
//
// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// this path is a contour trace of the club's helmet mark, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. It is a literal reproduction of a
// third-party mark and is expected to be REPLACED by original stylized geometry before this kit is
// treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// HOUSTON WEARS TWO DIFFERENT HELMET MARKS, and only one of them is authored here.
//
// The BATTLE RED kit (row-2 figure 3) wears a large stylized horn sweeping across the whole crown,
// drawn as one solid navy shape on a red shell. That is the path below: trivially separable,
// traced from its own figure, and correct.
//
// The NAVY kits wear the club's standard bull HEAD — compact, horned, with a face, a red right
// half and a white star, sitting in the upper middle of the shell. IT IS NOT THE SAME MARK and
// nothing here draws it. An earlier pass authored the Battle Red horn onto the navy shells on the
// theory that the two figures were the same mark seen with and without its detail; they are not,
// and the result was a huge horn outline on the home and away helmets. The registration check that
// let it through was too weak — the star and red half landed *inside* the horn's silhouette, which
// they will for almost any large shape. WHEN REUSING A MARK ACROSS FIGURES, COMPARE THE OUTLINES,
// not whether the small features fall somewhere inside.
//
// The navy kits' bull stays unauthored, and the reason is the one this module recorded before:
//   - Its body is EXACTLY the shell navy — both sample (3,24,37) — so no predicate separates the
//     mark from the surface it sits on.
//   - Its white keyline is drawn DASHED at this scale, not merely broken: dozens of fragments with
//     1-3px gaps. It cannot be selected as a ring, and a morphological closing does not recover it
//     either — bridging the gaps needs a dilation wide enough (~2.8 reference px) that eroding back
//     guts the horns, which are thinner than that.
//   - Traced as-is, the dashes render as scattered debris; at swatch size the mark reads as a
//     smudge rather than an outline. Verified, not assumed.
// This is why a CLOSED keyline and a dashed one are different problems: Atlanta's falcon has the
// same body-equals-shell collision and traces fine, because its ring is unbroken and can simply be
// filled. Re-derive Houston's from a source where the bull's navy and the shell navy are distinct
// values, or where its keyline is drawn solid.
export const TEXANS_DECAL_NAVY = '#031825'; // sampled (3,24,37)
export const TEXANS_BATTLE_RED_DECAL_PATH =
  'M426.7,115.2 L483.8,118.4 L494.0,123.1 L505.7,123.9 L510.4,129.4 L480.7,138.0 L465.8,138.8 L438.4,149.8 L429.1,150.5 L407.2,166.2 L399.4,181.9 L399.4,200.8 L420.5,222.7 L451.0,241.6 L543.2,285.5 L587.8,299.7 L596.4,305.1 L606.5,305.9 L615.1,311.4 L625.3,312.2 L633.9,317.7 L660.5,323.2 L683.9,324.0 L681.6,327.1 L642.5,332.6 L623.0,326.3 L602.6,326.3 L592.5,321.6 L560.4,318.5 L554.2,314.6 L521.3,313.8 L508.8,320.8 L504.1,327.9 L499.4,327.1 L493.2,320.8 L483.8,319.3 L479.9,314.6 L471.3,313.0 L467.4,308.3 L434.5,294.2 L372.8,250.2 L354.0,225.9 L348.5,203.1 L361.0,167.0 L352.4,164.7 L338.4,181.1 L325.9,196.8 L323.5,211.8 L318.8,218.8 L325.1,262.0 L337.6,289.5 L384.5,336.5 L434.5,367.1 L441.6,367.1 L449.4,373.4 L472.8,380.5 L475.2,389.9 L488.5,405.6 L540.1,438.6 L546.3,456.6 L549.5,455.8 L549.5,465.2 L554.9,470.7 L556.5,482.5 L439.2,444.1 L349.3,400.9 L328.2,387.6 L297.7,360.9 L273.5,327.1 L266.4,312.2 L264.9,298.9 L260.2,291.0 L254.7,243.1 L258.6,238.4 L260.2,218.0 L266.4,201.6 L284.4,174.9 L304.0,154.5 L329.8,135.6 L360.3,123.9 L379.8,122.3 L387.6,117.6 L425.9,116.0 Z';

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

// Battle Red only — see the header on why the navy shells carry nothing.
function decal(): UniformLayer[] {
  return [
    {
      id: 'texans-decal-battle-red-horn',
      surface: 'helmet',
      d: TEXANS_BATTLE_RED_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: TEXANS_DECAL_NAVY,
    },
  ];
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
      layers: decal(),
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
  },
};
