import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Chicago's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/bears. Sleeve and pant paths use the outer 588-wide mannequin space; right
// paths mirror the left across the jersey centerline x=294 (mirroredX = 588 - x).
//
// Caveat on the orange alternate: it is NOT in the 2025 composite (Chicago did not wear it that
// season), so its construction is inferred by recoloring the same stripe set the other two kits
// share rather than measured. Treat it as provisional until an orange reference is available.

// White is a literal here, not `accent`. Chicago's ESPN feed pairs navy with orange, so
// `toTeamColors` gives the home kit accent === secondary === orange and no white token exists —
// resolving the stripe edging from `accent` would paint it orange-on-orange.
export const BEARS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// This is the cleanest trace of the set so far: the mark is only 31x21px in the reference, but a
// bold single-stroke letterform survives that where the Seahawks' thin keyline did not. Keyline
// paints first, the letter over it; both need fill-rule evenodd for their counters.
export const BEARS_DECAL_KEYLINE_PATH =
  'M405.4,191.3 L410.4,191.3 L413.0,193.9 L401.9,198.2 L380.7,198.2 L389.2,192.2 L405.4,192.2 Z M458.0,191.3 L481.0,192.2 L490.4,195.6 L491.2,198.2 L464.0,197.3 L457.2,194.8 L456.4,192.2 L458.0,192.2 Z M374.8,199.0 L377.3,199.0 L374.8,204.9 L359.4,207.5 L355.2,214.3 L345.0,216.8 L341.6,222.8 L333.9,226.2 L320.4,240.6 L318.6,245.8 L311.9,250.8 L310.1,261.1 L303.4,267.0 L300.8,278.9 L286.4,293.4 L284.6,300.1 L275.3,298.4 L275.3,294.2 L292.3,279.8 L296.6,269.6 L302.5,265.3 L304.2,253.4 L310.1,249.1 L313.6,238.9 L324.6,226.2 L328.0,225.3 L333.9,218.6 L342.4,216.0 L346.7,210.1 L356.9,207.5 L362.9,201.6 L374.8,199.8 Z M496.3,199.8 L509.9,200.7 L519.2,208.3 L529.5,210.1 L532.8,216.0 L551.5,226.2 L555.8,233.8 L544.8,230.4 L539.6,224.5 L535.4,223.7 L530.3,216.8 L518.4,213.4 L515.0,207.5 L499.7,205.8 L496.3,200.7 Z M396.9,225.3 L412.1,225.3 L413.9,227.1 L403.6,231.3 L389.2,232.1 L392.6,226.2 L396.9,226.2 Z M461.4,225.3 L480.1,226.2 L486.1,233.0 L496.3,233.8 L507.4,242.3 L548.1,243.2 L555.0,238.9 L555.8,234.7 L559.2,234.7 L566.0,241.5 L566.8,246.6 L564.3,248.3 L507.4,248.3 L499.7,241.5 L488.6,238.1 L484.4,233.0 L465.7,230.4 L459.8,227.1 L461.4,226.2 Z M380.7,233.0 L385.8,234.7 L380.7,238.9 L371.4,241.5 L367.1,248.3 L362.9,249.1 L359.4,255.1 L353.5,258.5 L350.9,265.3 L344.1,271.2 L343.3,306.1 L354.4,324.8 L366.2,335.0 L374.8,337.5 L379.9,344.4 L390.0,346.0 L397.7,352.0 L430.9,355.4 L473.4,352.0 L470.8,357.9 L464.0,359.6 L403.6,358.8 L396.0,352.0 L382.4,351.1 L377.3,346.0 L365.4,341.8 L345.9,322.2 L337.4,306.1 L338.2,271.2 L344.1,267.0 L345.9,260.2 L355.2,249.1 L362.0,243.2 L369.6,240.6 L373.1,234.7 L380.7,233.8 Z M285.5,301.0 L291.4,301.9 L299.9,310.4 L303.4,318.9 L309.3,323.1 L311.9,332.4 L330.6,352.9 L335.6,355.4 L337.4,359.6 L345.9,362.2 L352.6,369.0 L362.0,371.5 L366.2,376.6 L383.2,379.2 L392.6,386.0 L472.5,386.0 L481.9,386.9 L481.9,388.5 L468.2,392.8 L404.5,392.8 L383.2,385.1 L368.8,383.4 L362.9,377.5 L350.1,374.1 L345.0,368.1 L339.9,367.3 L334.8,360.5 L329.7,358.8 L313.6,342.6 L310.1,335.0 L304.2,331.6 L294.0,310.4 L289.8,308.6 L285.5,301.9 Z M530.3,305.2 L576.2,305.2 L578.8,310.4 L573.6,319.7 L572.0,330.8 L536.2,367.3 L528.6,369.0 L521.0,375.8 L511.6,377.5 L505.6,383.4 L486.9,386.0 L489.5,380.0 L507.4,377.5 L512.5,371.5 L524.3,368.1 L528.6,362.2 L537.1,359.6 L541.3,353.7 L546.5,352.0 L550.7,345.2 L557.5,340.9 L559.2,335.9 L564.3,332.4 L566.8,322.2 L572.0,315.4 L572.0,312.0 L566.0,308.6 L535.4,308.6 L525.2,318.9 L521.8,326.5 L514.1,334.1 L508.2,336.7 L504.8,341.8 L497.1,344.4 L492.9,350.3 L477.6,351.1 L481.9,346.0 L492.9,344.4 L499.7,337.5 L505.6,335.9 L508.2,330.8 L524.3,316.3 L526.9,307.8 L530.3,306.1 Z';
export const BEARS_DECAL_LETTER_PATH =
  'M425.8,193.1 L442.8,193.1 L463.1,198.2 L492.0,200.7 L498.0,205.8 L513.3,208.3 L518.4,214.3 L530.3,217.7 L543.9,230.4 L551.5,233.0 L554.1,238.1 L549.8,242.3 L509.9,242.3 L504.8,240.6 L498.0,233.8 L486.9,231.3 L480.1,225.3 L444.4,221.1 L392.6,225.3 L385.8,231.3 L373.9,233.8 L367.9,240.6 L362.0,242.3 L350.9,252.6 L345.9,258.5 L343.3,266.1 L338.2,269.6 L335.6,284.9 L338.2,312.0 L343.3,316.3 L346.7,324.8 L351.8,327.4 L365.4,342.6 L374.8,345.2 L379.0,350.3 L392.6,352.9 L400.2,358.8 L459.8,360.5 L471.6,358.8 L481.0,352.0 L492.9,351.1 L498.9,344.4 L504.8,342.6 L514.1,335.0 L536.2,309.5 L568.5,311.2 L569.4,317.1 L565.1,329.0 L559.2,334.1 L556.6,340.9 L550.7,344.4 L546.5,351.1 L541.3,352.9 L537.1,358.8 L528.6,361.4 L521.0,369.0 L512.5,370.7 L506.5,376.6 L492.0,378.4 L480.1,385.1 L457.2,386.9 L401.1,386.0 L392.6,384.3 L383.2,378.4 L368.8,376.6 L362.0,370.7 L350.9,367.3 L345.9,361.4 L339.1,359.6 L334.8,353.7 L330.6,352.0 L319.5,340.9 L317.8,335.9 L312.7,332.4 L309.3,322.2 L303.4,317.1 L301.6,311.2 L294.0,302.7 L286.4,298.4 L287.2,293.4 L299.9,281.4 L303.4,269.6 L310.1,262.8 L311.9,252.6 L317.8,248.3 L320.4,241.5 L337.4,224.5 L341.6,223.7 L346.7,216.8 L355.2,215.2 L362.9,207.5 L375.6,205.8 L384.9,199.0 L406.2,198.2 L425.8,193.9 Z';

// The sleeve stripe set: three bands at a 9px pitch in reference space, each an edging color with
// a contrasting core inset 3 units top and bottom. Measured at x=23-40 on a figure centered at
// 104.5, extended outward to x=30 so the jersey clip trims them flush at the sleeve edge.
export const BEARS_STRIPE_GROUP_TOPS = [463, 491, 518];
export const BEARS_STRIPE_GROUP_HEIGHT = 15;
export const BEARS_STRIPE_CORE_INSET = 3;
export const BEARS_SLEEVE_X_LEFT = [30, 96];
export const BEARS_SLEEVE_X_RIGHT = [492, 558];

// Pants carry a wide stripe with a contrasting stripe inset over it.
export const BEARS_PANTS_OUTER_LEFT = 'M112,807 H140 V1462 H112 Z';
export const BEARS_PANTS_OUTER_RIGHT = 'M448,807 H476 V1462 H448 Z';
export const BEARS_PANTS_INNER_LEFT = 'M122,807 H130 V1462 H122 Z';
export const BEARS_PANTS_INNER_RIGHT = 'M458,807 H466 V1462 H458 Z';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';
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

// One stripe set, three kits. Only which color edges the band and which fills its core changes:
// white-on-orange at home, navy-on-orange away, white-on-navy for the orange alternate.
function sleeveStripes(edge: ColorRef, core: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  BEARS_STRIPE_GROUP_TOPS.forEach((top, i) => {
    const bottom = top + BEARS_STRIPE_GROUP_HEIGHT;
    const coreTop = top + BEARS_STRIPE_CORE_INSET;
    const coreBottom = bottom - BEARS_STRIPE_CORE_INSET;
    const sides: [UniformSurface, number[]][] = [
      ['sleeve-left', BEARS_SLEEVE_X_LEFT],
      ['sleeve-right', BEARS_SLEEVE_X_RIGHT],
    ];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `bears-sleeve-edge-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: edge,
      });
      out.push({
        id: `bears-sleeve-core-${i}-${side}`,
        surface,
        d: `M${x0},${coreTop} H${x1} V${coreBottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: core,
      });
    }
  });
  return out;
}

function pantsStripes(outer: ColorRef, inner: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    { id: 'bears-pants-outer-left', surface: 'leg-left', d: BEARS_PANTS_OUTER_LEFT, fill: outer },
    {
      id: 'bears-pants-outer-right',
      surface: 'leg-right',
      d: BEARS_PANTS_OUTER_RIGHT,
      fill: outer,
    },
    { id: 'bears-pants-inner-left', surface: 'leg-left', d: BEARS_PANTS_INNER_LEFT, fill: inner },
    {
      id: 'bears-pants-inner-right',
      surface: 'leg-right',
      d: BEARS_PANTS_INNER_RIGHT,
      fill: inner,
    },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill' }));
}

function collar(outer: ColorRef, inner: ColorRef): UniformLayer[] {
  return [
    { id: 'bears-collar-outer', stroke: outer, strokeWidth: 20 },
    { id: 'bears-collar-inner', stroke: inner, strokeWidth: 9 },
  ].map((s): UniformLayer => ({
    ...s,
    surface: 'collar',
    d: COLLAR_PATH,
    clip: true,
    kind: 'stroke',
  }));
}

function decal(keyline: ColorRef, letter: ColorRef): UniformLayer[] {
  return [
    { id: 'bears-decal-keyline', d: BEARS_DECAL_KEYLINE_PATH, fill: keyline },
    { id: 'bears-decal-letter', d: BEARS_DECAL_LETTER_PATH, fill: letter },
  ].map((s): UniformLayer => ({
    ...s,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
    fillRule: 'evenodd',
  }));
}

export const BEARS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'bears',
  kits: {
    // Navy body, navy pants, navy shell — the reference's primary combo. White edges the stripe
    // set and the numerals; orange fills their cores.
    home: {
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal(BEARS_WHITE, 'secondary'),
        ...sleeveStripes(BEARS_WHITE, 'secondary'),
        ...collar(BEARS_WHITE, 'secondary'),
        ...pantsStripes('secondary', BEARS_WHITE),
      ],
      number: { fill: BEARS_WHITE, outline: 'secondary' },
    },
    // White body over navy pants and the same navy shell. On white the edging has to become navy,
    // so the stripe set swaps which token edges and which fills.
    away: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal(BEARS_WHITE, 'accent'),
        ...sleeveStripes('secondary', 'accent'),
        ...collar('secondary', 'accent'),
        ...pantsStripes('accent', BEARS_WHITE),
      ],
      number: { fill: 'secondary', outline: 'accent' },
    },
    // Orange alternate — inferred, not measured (see the header note). Orange body over navy pants
    // and shell, with the stripe set edged white over navy cores.
    'orange-alternate': {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal('accent', 'primary'),
        ...sleeveStripes('accent', 'secondary'),
        ...collar('accent', 'secondary'),
        ...pantsStripes('primary', 'accent'),
      ],
      number: { fill: 'accent', outline: 'secondary' },
    },
  },
};
