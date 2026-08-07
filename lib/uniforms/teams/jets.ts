import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// New York's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/jets (home is that sheet's row-1 figure 1, black alternate its row-1 figure 5,
// away its row-2 figure 1). Right paths mirror the left across the centerline x=294.
//
// One construction throughout: two bands at the sleeve separated by a body-colored gap, and a deep
// V-collar that closes well below the generic chevron's vertex. No helmet stripe, no pant stripe.
//
// THE RIVALRIES KIT IS INFERRED. The 2025 composite has no green jersey with black trim — its
// row-1 figures 7-8 are an olive Salute-to-Service kit that has no row in the archive at all — so
// that kit reuses the measured geometry with its bands and collar recolored onto its own black
// `secondary`. Provisional until a sheet that carries it turns up.
//
// Out of scope on every kit: the chest wordmark, the league shield, the collar tab, and the
// shoulder numerals.

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// this path is a contour trace of the club's helmet mark, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. It is a literal reproduction of a
// third-party mark and is expected to be REPLACED by original stylized geometry before this kit is
// treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The wordmark, traced from the home figure's shell (bbox x253-359, y24-121 in the reference)
// mapped onto the raw helmet space at ~6.25x. One layer and four subpaths — the four letterforms
// with the jet sweeping out of the J, all white on the shell.
//
// The letters are PLAIN UNIONS, never evenodd holes. The counters in the J, E and S are shell
// color, so stacking unions reproduces them for free; punching them as holes instead puts the
// antialiased letter edges outside the fill-rule predicate, and they render solid (the way the
// 49ers' F did).
export const JETS_DECAL_PATH =
  'M348.5,210.7 L415.5,211.9 L411.1,219.4 L383.6,220.1 L376.1,228.9 L376.1,233.9 L381.1,236.4 L398.6,235.1 L399.2,238.3 L392.3,244.6 L371.1,245.2 L362.3,253.4 L362.3,258.4 L366.0,261.5 L404.8,260.9 L405.5,264.7 L397.3,272.8 L315.4,271.6 L316.6,264.0 L347.9,211.3 Z M409.8,154.2 L429.2,166.7 L464.9,179.3 L502.4,185.5 L537.4,186.2 L603.7,193.7 L342.9,195.0 L332.3,203.8 L330.4,211.9 L294.1,270.3 L210.9,272.2 L217.8,260.9 L261.6,259.6 L289.7,213.8 L291.0,206.9 L302.2,192.5 L425.5,191.2 L428.6,183.7 L409.2,154.8 Z M531.8,210.7 L605.0,212.5 L598.7,219.4 L557.4,219.4 L551.8,222.6 L553.1,228.2 L581.2,236.4 L586.2,242.0 L566.8,272.2 L479.3,272.8 L479.3,265.9 L485.5,260.9 L535.5,261.5 L541.8,258.4 L540.6,252.7 L528.7,250.8 L514.9,242.7 L531.2,211.3 Z M442.4,210.7 L514.3,211.3 L514.9,213.8 L511.2,219.4 L488.0,221.3 L459.2,270.3 L453.6,272.8 L422.3,272.2 L421.7,264.0 L438.6,238.9 L440.5,231.4 L446.1,227.0 L444.9,220.7 L429.2,220.1 L427.3,215.7 L431.1,211.3 L441.7,211.3 Z';

// The sleeve bands, measured on the home figure (jersey top y=128, sleeve hem y=194, figure center
// x=297.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=230 crosses white
// y156-164 and y174-181, with body color above, between and below — the pair floats mid-sleeve
// rather than running to the hem. Both span reference x215-231; extended outward to x=30 for a
// flush clip.
export const JETS_BAND_TOP = [464, 490];
export const JETS_BAND_LOW = [516, 539];
export const JETS_SLEEVE_X_LEFT = [30, 89];
export const JETS_SLEEVE_X_RIGHT = [499, 558];

// The collar, measured on the same figure: arms from reference (266,130) and (332,130) meeting at
// (299,175). That vertex maps to y=519, far below the generic chevron's y=455, so this kit needs
// its own path rather than the shared one. The band is about 8 reference px thick.
const JETS_COLLAR_PATH = 'M196,389 L294,519 L402,389';
const JETS_COLLAR_WIDTH = 24;

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

function sleeveBands(fill: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', JETS_SLEEVE_X_LEFT],
    ['sleeve-right', JETS_SLEEVE_X_RIGHT],
  ];

  for (const [label, [top, bottom]] of [
    ['top', JETS_BAND_TOP],
    ['low', JETS_BAND_LOW],
  ] as [string, number[]][]) {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `jets-band-${label}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill,
      });
    }
  }

  return out;
}

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'jets-collar',
      surface: 'collar',
      d: JETS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: JETS_COLLAR_WIDTH,
    },
  ];
}

// The wordmark is white on every shell the club wears, green or black, so it takes a token only
// where a palette happens to carry white — which is not all of them. It is simpler and truer to
// the reference to pin it.
function decal(): UniformLayer[] {
  return [
    {
      id: 'jets-decal',
      surface: 'helmet',
      d: JETS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: '#FFFFFF',
    },
  ];
}

export const JETS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'jets',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Green body under a green shell. White is both secondary and accent here (ESPN supplies only
    // two colors), so every white surface — bands, collar and the unoutlined numerals — resolves
    // from `secondary`, and this kit needs no literal.
    home: {
      layers: [...sleeveBands('secondary'), ...collar('secondary'), ...decal()],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // White body under a green shell. The away palette moves white into primary and green into both
    // secondary and accent, so the bands and collar invert to green against the body.
    away: {
      helmetColor: 'secondary',
      layers: [...sleeveBands('secondary'), ...collar('secondary'), ...decal()],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // Black body and shell, with the bands measured green on the reference rather than white —
    // green is this kit's `secondary`. The numerals stay white, which this palette carries in
    // `accent`.
    'black-alt': {
      layers: [...sleeveBands('secondary'), ...collar('secondary'), ...decal()],
      number: { fill: 'accent', outline: 'accent', outlineWidth: 10 },
    },
    // INFERRED — no green-with-black kit appears in the 2025 reference. Green is this kit's primary
    // so the body and shell need no override; the bands and collar take its black `secondary`, and
    // the numerals its white `accent`.
    'rivalries-2025': {
      layers: [...sleeveBands('secondary'), ...collar('secondary'), ...decal()],
      number: { fill: 'accent', outline: 'accent', outlineWidth: 10 },
    },
  },
};
