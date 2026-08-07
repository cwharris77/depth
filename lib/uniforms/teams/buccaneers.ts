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

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The flag, traced from the home figure's shell (bbox x60-166, y358-464 in the reference) mapped
// onto the raw helmet space at ~6.25x. Four plain-union fills in paint order: keyline, red field,
// white skull, orange football. The crossed swords are not a layer — they read as the dark gaps
// between the white components, exactly as the sword blades do on the reference.
//
// EVERY COLOR HERE IS A LITERAL, and deliberately so. The mark is fixed art: it is the same four
// colors on the pewter home shell and the pewter away shell, so nothing about it moves with the
// palette, and threading it through tokens would only invite a kit-dependent recolor that the club
// does not wear. Hexes are sampled off the reference figure.
//
// The CREAMSICLE KIT DOES NOT GET THIS MARK. Its white shell carries the old Bucco Bruce pirate
// head, a different logo entirely — fine linework at this scale with no solid region, so it fails
// the same test the Raiders shield failed. That shell stays bare.
export const BUCCANEERS_FLAG_KEYLINE = '#8C8C8C'; // sampled (137,140,139)
export const BUCCANEERS_FLAG_RED = '#C51821'; // sampled (197,24,33)
export const BUCCANEERS_FLAG_ORANGE = '#FF8800'; // sampled (255,136,0)
export const BUCCANEERS_DECAL_KEYLINE_PATH =
  'M352.4,154.8 L399.4,159.8 L408.0,169.9 L401.7,174.9 L391.5,176.3 L379.8,190.0 L379.8,201.5 L374.3,207.9 L378.2,215.8 L375.1,228.0 L379.0,231.6 L379.8,240.2 L374.3,245.3 L367.3,240.9 L342.3,210.1 L341.5,202.2 L334.5,195.7 L335.2,182.8 L332.9,183.5 L329.8,211.5 L342.3,233.8 L354.8,246.7 L347.8,253.2 L332.9,252.4 L326.6,258.2 L343.1,269.0 L360.3,269.7 L379.8,285.5 L407.2,284.8 L422.0,294.1 L441.6,291.2 L423.6,273.3 L429.8,267.5 L453.3,262.5 L463.5,256.7 L478.3,244.5 L485.4,229.5 L449.4,251.0 L413.4,258.2 L407.2,250.3 L434.5,227.3 L436.1,215.8 L441.6,210.8 L442.4,191.4 L430.6,182.8 L440.8,193.6 L439.2,206.5 L428.3,215.8 L415.8,215.8 L411.1,212.2 L406.4,216.5 L383.7,199.3 L386.8,183.5 L393.1,177.8 L422.8,177.8 L429.8,170.6 L458.8,177.0 L464.2,181.3 L486.1,182.8 L508.0,182.1 L534.6,169.1 L542.4,173.4 L536.2,194.3 L536.2,209.4 L529.9,217.2 L529.1,228.0 L523.7,233.0 L522.9,240.9 L517.4,246.0 L504.1,274.0 L486.1,295.5 L465.0,302.7 L420.5,308.5 L382.9,302.0 L323.5,274.7 L263.3,274.7 L241.4,286.2 L234.4,280.4 L242.2,267.5 L259.4,251.7 L281.3,243.8 L278.9,223.7 L271.9,215.1 L278.9,208.6 L291.5,204.3 L309.4,186.4 L307.9,182.1 L299.3,182.1 L293.8,176.3 L322.7,159.8 L351.7,155.5 Z M382.2,206.5 L391.5,212.2 L397.8,212.2 L403.3,217.2 L401.7,223.7 L411.9,216.5 L420.5,224.4 L407.2,236.6 L393.9,232.3 L377.5,211.5 L381.4,207.2 Z M374.3,251.7 L396.2,253.9 L415.8,274.7 L397.0,284.0 L375.1,279.7 L360.3,266.1 L361.8,259.6 L373.6,252.4 Z';
export const BUCCANEERS_DECAL_FIELD_PATH =
  'M352.4,159.1 L399.4,164.1 L403.3,169.9 L390.8,172.0 L375.1,190.0 L375.1,201.5 L369.6,207.9 L373.6,215.8 L370.4,228.0 L374.3,231.6 L374.3,240.9 L347.0,210.1 L346.2,200.7 L339.2,195.7 L338.4,178.5 L334.5,177.0 L329.8,181.3 L325.9,188.5 L325.1,211.5 L337.6,234.5 L350.1,246.7 L330.6,248.8 L323.5,253.9 L322.0,258.9 L343.1,273.3 L360.3,274.0 L379.8,289.8 L407.2,289.1 L422.0,298.4 L442.4,296.2 L446.3,292.7 L445.5,286.2 L428.3,276.1 L428.3,273.3 L442.4,267.5 L453.3,266.8 L465.0,260.3 L483.0,244.5 L490.0,231.6 L490.0,225.9 L484.6,223.7 L471.3,235.2 L465.0,235.9 L461.1,240.9 L453.3,241.7 L449.4,246.7 L431.4,248.1 L422.8,253.2 L413.4,253.9 L411.9,250.3 L418.9,248.8 L439.2,227.3 L440.8,215.8 L447.0,207.2 L446.3,189.2 L428.3,175.6 L437.7,174.9 L442.4,179.2 L458.8,181.3 L468.2,186.4 L494.7,187.1 L510.4,185.7 L515.1,181.3 L524.4,180.6 L537.7,173.4 L531.5,194.3 L531.5,209.4 L526.0,215.1 L524.4,228.0 L519.8,231.6 L518.2,240.9 L513.5,244.5 L505.7,263.2 L500.2,267.5 L499.4,274.0 L486.1,291.2 L465.0,298.4 L420.5,304.1 L382.9,297.7 L323.5,270.4 L263.3,270.4 L248.5,276.1 L243.8,281.2 L239.1,280.4 L240.6,274.7 L259.4,256.0 L270.3,250.3 L289.1,248.8 L293.0,246.0 L283.6,240.9 L284.4,226.6 L276.6,215.1 L291.5,208.6 L313.4,187.8 L311.8,179.2 L298.5,176.3 L322.7,164.1 L351.7,159.8 Z';
export const BUCCANEERS_DECAL_SKULL_PATH =
  'M400.9,181.3 L422.8,182.1 L436.1,193.6 L434.5,206.5 L428.3,211.5 L415.8,211.5 L414.2,207.9 L422.8,206.5 L425.2,204.3 L422.8,202.2 L404.0,201.5 L403.3,207.2 L408.0,210.1 L404.8,211.5 L397.8,205.8 L396.2,200.0 L388.4,199.3 L391.5,183.5 L400.1,182.1 Z M382.2,210.8 L398.6,217.2 L396.2,223.7 L399.4,227.3 L408.0,227.3 L411.1,220.8 L415.8,224.4 L407.2,232.3 L393.9,228.0 L393.1,221.6 L382.2,211.5 Z';
export const BUCCANEERS_DECAL_BALL_PATH =
  'M374.3,256.0 L396.2,258.2 L403.3,263.2 L401.7,269.7 L411.1,274.7 L397.0,279.7 L375.1,275.4 L365.0,266.1 L366.5,259.6 L373.6,256.7 Z';

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

// Fixed art on both pewter shells — see the note above on why nothing here takes a token.
function decal(): UniformLayer[] {
  return (
    [
      ['buccaneers-decal-keyline', BUCCANEERS_DECAL_KEYLINE_PATH, BUCCANEERS_FLAG_KEYLINE],
      ['buccaneers-decal-field', BUCCANEERS_DECAL_FIELD_PATH, BUCCANEERS_FLAG_RED],
      ['buccaneers-decal-skull', BUCCANEERS_DECAL_SKULL_PATH, BUCCANEERS_WHITE],
      ['buccaneers-decal-ball', BUCCANEERS_DECAL_BALL_PATH, BUCCANEERS_FLAG_ORANGE],
    ] as [string, string, ColorRef][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
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
      layers: [...cuff('secondary'), ...collar('secondary'), ...decal()],
      number: { fill: BUCCANEERS_WHITE, outline: 'accent', outlineWidth: 14 },
    },
    // White body and pants under the same pewter shell. The away palette moves white into primary,
    // red into secondary and pewter into accent, so the cuff and collar shift onto `accent` and the
    // numerals take the red.
    away: {
      helmetColor: 'accent',
      layers: [...cuff('accent'), ...collar('accent'), ...decal()],
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
