import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Tampa Bay's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/buccaneers (home is that sheet's row-1 figure 3, creamsicle its row-1 figure 7,
// away its row-2 figure 1 — row-1 figures 1-2 are boxed "worn in preseason only" and were not
// used). Right paths mirror the left across the centerline x=294.
//
// NOT one construction. The current kits wear a single solid band at the sleeve hem and a thin
// collar keyline; the creamsicle wears a three-band cuff, red over white over red, and no collar
// trim. No helmet stripe, no pant stripe on any kit.
//
// ONE APPROXIMATION, deliberate: the current kits' numerals carry a two-ring trim — an orange ring
// against the face inside a heavier black one. `NumberStyle` allows a single outline, so the orange
// is kept as the ring that sits against the face and reads as this club's, and the outer black is
// dropped.
//
// Out of scope on every kit: the chest wordmark, the league shield, the 50th-season patch, the flag
// mark on each sleeve, and the shoulder numerals.

// White is a literal on the home kit only. Its palette is red over pewter with orange in accent, so
// nothing resolves to its numeral face. The away carries white in `primary` and the creamsicle in
// `accent`.
export const BUCCANEERS_WHITE = '#FFFFFF';

// The sleeve cuff, measured on the home figure (jersey top y=461, sleeve hem y=527, figure center
// x=511.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=445 crosses black
// y519-525 and the hem at y527, so the band ends flush; it spans reference x430-464. Extended
// outward to x=30 and past the hem to y=578 so the jersey clip trims it.
export const BUCCANEERS_CUFF_LEFT = 'M30,545 H146 V578 H30 Z';
export const BUCCANEERS_CUFF_RIGHT = 'M558,545 H442 V578 H558 Z';

// The creamsicle's cuff is three bands, measured on row-1 figure 7 against the same anchors: red
// y511-514, white y515-521, red y522 to the hem. Authored contiguous — the boundaries between them
// are GUD's own hairlines, not body color.
export const BUCCANEERS_CREAM_BOUNDS = [528, 539, 559, 578];
export const BUCCANEERS_SLEEVE_X_LEFT = [30, 146];
export const BUCCANEERS_SLEEVE_X_RIGHT = [442, 558];

// The collar is a keyline rather than a band — about 2 reference px — running from (486,473) to a
// point at (511,494) and mirrored, which closes higher than the generic chevron's vertex.
const BUCCANEERS_COLLAR_PATH = 'M214,418 L294,478 L374,418';
const BUCCANEERS_COLLAR_WIDTH = 7;

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

function cuff(fill: ColorRef): UniformLayer[] {
  return [
    ['buccaneers-cuff-left', 'sleeve-left', BUCCANEERS_CUFF_LEFT],
    ['buccaneers-cuff-right', 'sleeve-right', BUCCANEERS_CUFF_RIGHT],
  ].map(([id, surface, d]) => ({
    id,
    surface: surface as UniformSurface,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

function creamCuff(band: ColorRef, line: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', BUCCANEERS_SLEEVE_X_LEFT],
    ['sleeve-right', BUCCANEERS_SLEEVE_X_RIGHT],
  ];

  for (let i = 0; i < BUCCANEERS_CREAM_BOUNDS.length - 1; i += 1) {
    const top = BUCCANEERS_CREAM_BOUNDS[i];
    const bottom = BUCCANEERS_CREAM_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `buccaneers-cream-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? line : band,
      });
    }
  }

  return out;
}

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'buccaneers-collar',
      surface: 'collar',
      d: BUCCANEERS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: BUCCANEERS_COLLAR_WIDTH,
    },
  ];
}

export const BUCCANEERS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'buccaneers',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Red body over white pants under the pewter shell. Pewter is `secondary` and carries both the
    // cuff and the collar keyline; orange sits in `accent` and rings the numerals, whose white face
    // this palette cannot supply.
    home: {
      helmetColor: 'secondary',
      pantsColor: BUCCANEERS_WHITE,
      layers: [...cuff('secondary'), ...collar('secondary')],
      number: { fill: BUCCANEERS_WHITE, outline: 'accent', outlineWidth: 14 },
    },
    // White body and pants under the same pewter shell. The away palette moves white into primary,
    // red into secondary and pewter into accent, so the cuff and collar shift onto `accent` and the
    // numerals take the red.
    away: {
      helmetColor: 'accent',
      layers: [...cuff('accent'), ...collar('accent')],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Orange body over white pants under a white shell, and a different cuff — three bands rather
    // than one, and no collar trim. Red is `secondary` and white `accent`, so nothing here is a
    // literal.
    creamsicle: {
      helmetColor: 'accent',
      pantsColor: 'accent',
      layers: creamCuff('secondary', 'accent'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
