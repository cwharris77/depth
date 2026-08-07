import { HELMET_CROWN_STRIPE_PATH } from './shared';
import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Miami's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/dolphins (home is that sheet's row-1 figure 1, the 1972 throwback its row-1
// figure 3, Rivalries its row-1 figure 5, away its row-2 figure 1). Sleeve paths use the outer
// 588-wide mannequin space; helmet paths stay in raw helmet coordinates (x:139-802, y:65-674).
// Right paths mirror the left across the centerline x=294 (mirroredX = 588 - x).
//
// The four kits are NOT one construction, which is what makes this club different from most here:
//   - home and away carry no sleeve trim at all. A column down either sleeve below the shoulder
//     runs unbroken body color to the hem; the only marks the reference draws there are the sleeve
//     patch and the shoulder numerals, both out of scope. Their orange/white shoulder marks are
//     GUD's shoulder numerals, not a stripe — that misread cost a pass.
//   - the 1972 throwback carries a five-band sleeve set, white over orange.
//   - Rivalries carries a teal wedge at the sleeve cap with a thin orange slash through it, plus an
//     orange collar V. Nothing else here has either.
// All four wear a helmet crown stripe, which is the one thing they do share.
//
// Out of scope on every kit: the chest wordmark, the league shield, the collar tabs the reference
// letters ("MIAMI", "GO FINS!"), the sleeve patch, and the shoulder numerals.

// White is a literal on the home kit only. Its palette is teal over orange with accent === secondary
// (ESPN supplies only two colors), so no token resolves to its white shell, white pants or white
// numeral face. Every other kit has white in a token — the throwback in `accent`, the away in
// `primary` — so the literal is confined to the one kit that needs it.
export const DOLPHINS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine traces, not final art. House workflow is trace-then-stylize:
// these paths are contour traces of the club's helmet marks, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. They are literal reproductions of
// third-party marks and are expected to be REPLACED by original stylized geometry before these kits
// are treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// TWO marks, because the throwback wears a different one — a teal dolphin breaking through a solid
// orange ring, where the current kits wear a teal dolphin inside an orange sunburst. Both are two
// layers: the orange element traced on its own and the dolphin painted over it, in that order.
// Neither carries a fill rule and neither needs one. The sunburst is a ring of separate spikes, and
// the throwback's ring is broken where the dolphin's tail crosses it, so each traces as an open
// outline rather than an annulus with a hole — which is the case that would have needed evenodd and
// would have punched through to the shell. Traced from the home helmet bbox (x 58-163, y 76-172 in
// the reference) and the throwback's (x 470-575, same rows), both mapped onto the raw helmet space
// at ~6.26x.
//
// Dropped from the throwback trace: the "M" on the dolphin's own little helmet, about 2px in the
// reference. It is noted here so nobody re-derives its absence as a bug.
export const DOLPHINS_DECAL_SUNBURST_PATH =
  'M418.0,120.9 L428.6,141.0 L384.8,146.6 L344.2,178.6 L332.3,206.9 L331.7,238.3 L326.0,239.5 L314.8,223.8 L324.8,218.8 L326.6,210.0 L310.4,198.1 L328.5,196.2 L336.7,181.1 L344.8,177.4 L328.5,154.1 L352.9,161.1 L359.2,154.1 L371.1,151.0 L371.1,123.4 L388.6,139.7 L394.8,140.3 L397.3,130.9 L403.6,135.3 L412.3,133.4 L417.3,121.5 Z M466.8,127.8 L466.1,148.5 L473.6,152.9 L481.1,147.9 L479.9,163.6 L493.0,169.2 L482.4,169.8 L451.1,147.9 L466.1,128.4 Z M441.7,133.4 L444.2,144.7 L431.1,141.6 L441.1,134.1 Z M506.8,238.9 L523.7,249.6 L506.8,258.4 L512.4,271.5 L495.5,273.4 L494.3,281.0 L506.8,296.7 L484.9,289.8 L479.9,296.7 L480.5,308.6 L464.9,304.2 L458.0,313.6 L461.8,335.0 L444.2,316.7 L438.6,318.6 L437.4,327.4 L426.1,321.8 L416.7,335.6 L411.1,319.3 L395.5,324.3 L386.1,314.9 L363.6,333.1 L367.9,307.3 L361.1,302.3 L352.3,304.8 L352.3,292.9 L347.9,289.1 L329.2,289.1 L334.8,284.1 L351.0,285.4 L382.3,308.6 L407.3,316.1 L433.6,314.9 L463.6,303.6 L481.1,287.2 L494.9,270.3 L506.2,239.5 Z';
export const DOLPHINS_DECAL_DOLPHIN_PATH =
  'M489.9,172.4 L526.8,178.6 L537.4,184.9 L567.5,187.4 L490.5,202.5 L456.8,223.8 L471.1,211.9 L466.8,207.5 L437.4,235.8 L441.7,239.5 L448.6,232.6 L437.4,242.7 L442.4,247.7 L449.9,242.0 L444.2,248.3 L433.6,242.7 L397.3,268.4 L407.3,271.5 L381.1,279.1 L371.1,277.2 L393.6,273.4 L377.3,266.5 L387.3,265.3 L396.1,250.2 L391.1,246.4 L380.4,252.1 L388.6,246.4 L399.8,247.1 L398.6,239.5 L373.6,246.4 L372.3,250.2 L377.9,252.1 L363.6,257.7 L306.6,258.4 L292.2,263.4 L267.2,246.4 L257.2,245.2 L236.0,232.6 L220.9,207.5 L224.7,205.0 L259.1,229.5 L271.0,228.2 L287.2,233.9 L287.9,238.3 L277.9,242.7 L281.6,247.7 L309.1,250.8 L331.0,247.1 L377.3,221.3 L381.7,210.0 L371.1,201.9 L358.6,200.6 L367.3,193.1 L414.2,197.5 L454.9,179.3 L489.3,173.0 Z M487.4,245.2 L473.6,264.6 L474.9,257.7 L463.0,266.5 L463.0,271.5 L468.0,270.3 L461.1,277.2 L448.0,282.2 L458.0,263.4 L455.5,257.7 L450.5,257.7 L486.8,245.8 Z M305.4,265.9 L324.1,270.9 L376.1,267.2 L325.4,273.4 L332.9,277.8 L304.8,270.9 L304.8,266.5 Z';
export const DOLPHINS_TB_DECAL_RING_PATH =
  'M392.3,111.5 L413.0,121.5 L438.0,115.2 L455.5,134.1 L480.5,135.3 L484.3,154.1 L507.4,170.5 L507.4,194.3 L521.8,211.9 L513.0,230.1 L513.7,246.4 L519.3,257.1 L500.5,274.1 L498.0,286.6 L501.2,294.8 L479.9,302.3 L470.5,311.1 L464.3,327.4 L452.4,324.3 L438.6,326.8 L423.6,340.6 L399.8,331.2 L377.3,339.3 L363.6,321.8 L351.0,314.2 L354.8,308.0 L387.9,322.4 L427.4,322.4 L457.4,309.8 L488.0,280.3 L502.4,248.3 L502.4,205.6 L489.3,173.6 L462.4,146.0 L437.4,133.4 L401.1,129.7 L362.3,140.3 L332.9,165.4 L312.9,204.4 L312.9,247.7 L325.4,274.1 L324.1,289.8 L306.0,281.6 L307.9,259.0 L294.7,241.4 L302.3,225.1 L301.6,206.3 L295.4,198.1 L313.5,181.1 L316.0,156.7 L339.2,147.2 L352.9,124.6 L373.6,127.8 L391.7,112.1 Z M429.2,184.9 L432.4,186.8 L429.2,200.0 L413.0,191.2 L416.1,185.5 L423.0,193.7 L428.6,185.5 Z';
export const DOLPHINS_TB_DECAL_DOLPHIN_PATH =
  'M448.0,189.9 L472.4,210.0 L470.5,220.1 L474.9,228.2 L435.5,238.3 L429.2,243.9 L425.5,274.7 L418.6,281.6 L404.2,260.9 L399.8,275.9 L384.2,294.8 L377.3,292.3 L377.9,285.4 L384.2,281.6 L382.3,276.6 L368.6,286.0 L344.8,315.5 L337.3,343.1 L341.7,354.4 L366.1,360.7 L368.6,367.0 L336.0,371.4 L323.5,390.2 L317.3,390.8 L315.4,377.6 L331.0,353.2 L326.6,289.8 L341.0,243.3 L339.8,235.1 L329.2,232.6 L326.6,224.5 L339.8,216.3 L366.1,215.0 L396.7,195.6 L407.3,213.2 L421.7,218.2 L404.8,221.3 L384.8,233.9 L355.4,262.8 L345.4,288.5 L347.9,297.9 L363.6,282.2 L361.7,274.1 L366.7,267.2 L393.6,243.9 L396.7,235.8 L402.3,237.0 L400.5,245.2 L404.8,246.4 L418.0,229.5 L436.7,228.2 L441.1,223.2 L454.9,230.1 L464.9,225.7 L452.4,218.8 L458.6,212.5 L456.1,208.8 L434.2,218.2 L447.4,199.3 L447.4,190.6 Z';

// The throwback sleeve set, measured on row-1 figure 3 (jersey top y=179, sleeve hem y=245, figure
// center x=514.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=440 crosses
// white y205-208, orange y209-213, white y215-221, orange y223-227 and white y229-231, with teal
// above and below — the set floats mid-sleeve rather than running to the hem. It spans reference
// x433-449; extended outward to x=30 for a flush clip.
export const DOLPHINS_TB_STRIPE_BOUNDS = [458, 471, 486, 509, 526, 536];
export const DOLPHINS_SLEEVE_X_LEFT = [30, 92];
export const DOLPHINS_SLEEVE_X_RIGHT = [496, 558];

// The Rivalries sleeve wedge, measured on row-1 figure 5 (jersey top y=177, sleeve hem y=243, figure
// center x=925.5). Teal runs from a point at reference (843,216) and widens to x843-860 by y232,
// where the sleeve seam cuts it; the orange slash inside it runs from (843,220) to (849,224), about
// 2px thick. Both extended outward to x=30.
export const DOLPHINS_WEDGE_LEFT = 'M30,496 L92,545 L30,545 Z';
export const DOLPHINS_WEDGE_RIGHT = 'M558,496 L496,545 L558,545 Z';
export const DOLPHINS_SLASH_LEFT = 'M30,507 L55,519';
export const DOLPHINS_SLASH_RIGHT = 'M558,507 L533,519';
export const DOLPHINS_SLASH_WIDTH = 7;

// The Rivalries collar, measured on the same figure: the orange band runs from (898,188) to a point
// at (925,202), which lands within a unit of the generic chevron's own vertex — so only the arms'
// start height differs from it. Roughly 4px thick measured vertically, ~10 units perpendicular.
const DOLPHINS_COLLAR_PATH = 'M208,415 L294,455 L380,415';
const DOLPHINS_COLLAR_WIDTH = 10;

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

// Every kit wears one, and it is the crown-hugging band from shared.ts rather than the generic
// model's straight rectangle, which is the wrong shape for a side view.
function crownStripe(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'dolphins-crown-stripe',
      surface: 'helmet',
      d: HELMET_CROWN_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill,
    },
  ];
}

// Orange element first, dolphin over it — the paint order every trimmed mark here uses.
function decal(ring: ColorRef, dolphin: ColorRef, throwback = false): UniformLayer[] {
  return [
    {
      id: 'dolphins-decal-ring',
      surface: 'helmet',
      d: throwback ? DOLPHINS_TB_DECAL_RING_PATH : DOLPHINS_DECAL_SUNBURST_PATH,
      clip: true,
      kind: 'fill',
      fill: ring,
    },
    {
      id: 'dolphins-decal-dolphin',
      surface: 'helmet',
      d: throwback ? DOLPHINS_TB_DECAL_DOLPHIN_PATH : DOLPHINS_DECAL_DOLPHIN_PATH,
      clip: true,
      kind: 'fill',
      fill: dolphin,
    },
  ];
}

// Five contiguous bands, band color and line color alternating from the top down.
function throwbackStripes(band: ColorRef, line: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: ['sleeve-left' | 'sleeve-right', number[]][] = [
    ['sleeve-left', DOLPHINS_SLEEVE_X_LEFT],
    ['sleeve-right', DOLPHINS_SLEEVE_X_RIGHT],
  ];

  for (let i = 0; i < DOLPHINS_TB_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = DOLPHINS_TB_STRIPE_BOUNDS[i];
    const bottom = DOLPHINS_TB_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `dolphins-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? band : line,
      });
    }
  }

  return out;
}

function rivalriesSleeve(wedge: ColorRef, slash: ColorRef): UniformLayer[] {
  return [
    {
      id: 'dolphins-wedge-left',
      surface: 'sleeve-left',
      d: DOLPHINS_WEDGE_LEFT,
      clip: true,
      kind: 'fill',
      fill: wedge,
    },
    {
      id: 'dolphins-wedge-right',
      surface: 'sleeve-right',
      d: DOLPHINS_WEDGE_RIGHT,
      clip: true,
      kind: 'fill',
      fill: wedge,
    },
    {
      id: 'dolphins-slash-left',
      surface: 'sleeve-left',
      d: DOLPHINS_SLASH_LEFT,
      clip: true,
      kind: 'stroke',
      stroke: slash,
      strokeWidth: DOLPHINS_SLASH_WIDTH,
    },
    {
      id: 'dolphins-slash-right',
      surface: 'sleeve-right',
      d: DOLPHINS_SLASH_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke: slash,
      strokeWidth: DOLPHINS_SLASH_WIDTH,
    },
    {
      id: 'dolphins-collar',
      surface: 'collar',
      d: DOLPHINS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: slash,
      strokeWidth: DOLPHINS_COLLAR_WIDTH,
    },
  ];
}

export const DOLPHINS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'dolphins',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Teal body, white shell and white pants. Orange is both secondary and accent here, so every
    // orange surface resolves from `secondary`; white has no token at all and takes the literal
    // three times over.
    home: {
      helmetColor: DOLPHINS_WHITE,
      pantsColor: DOLPHINS_WHITE,
      layers: [...crownStripe('secondary'), ...decal('secondary', 'primary')],
      number: { fill: DOLPHINS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body over teal pants under the same white shell. The away palette moves white into
    // primary, teal into secondary and orange into accent, so the shell needs no override and every
    // orange mark shifts onto `accent`.
    away: {
      pantsColor: 'secondary',
      layers: [...crownStripe('accent'), ...decal('accent', 'secondary')],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Teal body over white pants under a white shell with a TEAL crown stripe — the only kit whose
    // stripe is not orange. This palette is the only one carrying white in a token (`accent`), so
    // the shell, pants, numeral face and the set's three white bands all resolve from it.
    '1972-throwback': {
      helmetColor: 'accent',
      pantsColor: 'accent',
      layers: [
        ...crownStripe('primary'),
        ...decal('secondary', 'primary', true),
        ...throwbackStripes('accent', 'secondary'),
      ],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 16 },
    },
    // Navy body, pants and shell, all `primary`. The wedge takes teal from `secondary`; the slash
    // and the collar V both take orange from `accent`. The numerals are teal with no keyline, so the
    // outline is set to the face color rather than left to inherit a contrasting stroke.
    'rivalries-2025': {
      layers: [
        ...crownStripe('accent'),
        ...decal('accent', 'secondary'),
        ...rivalriesSleeve('secondary', 'accent'),
      ],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
  },
};
