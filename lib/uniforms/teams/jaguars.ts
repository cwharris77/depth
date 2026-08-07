import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Jacksonville's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/jaguars (home is that sheet's row-1 figure 1, teal throwback its row-1 figure 5,
// away its row-2 figure 1 — the other figures in each row are pant combinations, not separate
// kits). Sleeve paths use the outer 588-wide mannequin space; right paths mirror the left across
// the centerline x=294 (mirroredX = 588 - x).
//
// Every kit is a black shell over a body carrying a band at the sleeve hem and trim at the neck.
// What changes is how each is built: the current kits wear one solid band and a short arc down each
// side of the neck opening, while the throwback wears a two-color band and a full V that closes at
// the chest. No helmet stripe and no pant stripe on any kit.
//
// THE BLACK ALTERNATE IS INFERRED, NOT MEASURED. The 2025 composite contains no black jersey, so
// that kit reuses the measured home construction with its bands recolored onto the kit's own gold
// trim. Treat its colors as provisional until a reference sheet that includes it turns up; the
// geometry is as measured, only the color assignment is a judgement.
//
// ONE DATA CONFLICT, surfaced rather than papered over: the archive stores the throwback's trim as
// #D7A22A, but the 2025 reference renders that band as a flat pale gold (231,210,141) — a
// materially different color, sampled identically at three points, so it is a fill and not a ramp.
// The definition takes the token, because the palette is the data layer's call and a hand-picked
// hex here would be exactly the kind of local patch the archive's provenance rules forbid.
//
// Out of scope on every kit: the chest wordmark, the league shield, the leaping-jaguar patch the
// reference draws on the chest and sleeves, and the shoulder numerals GUD draws above the bands.

// Two literals. Only the throwback's palette carries black — the home and away palettes are
// teal/gold/gold and white/teal/gold respectively, so neither can resolve the shell, the sleeve
// bands or the collar. And no kit's palette carries white, which every current kit needs for its
// pants and the throwback needs for its numeral face. Both hexes are the values the archive already
// stores for this club's other kits (lib/uniforms/data.ts).
export const JAGUARS_BLACK = '#101820';
export const JAGUARS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The jaguar head, traced from the home figure's shell (bbox x30-180, y25-144 in the reference)
// mapped onto the raw helmet space at ~6.25x. Three plain-union fills in paint order: white jaw,
// gold crown, teal tongue.
//
// This module previously called the mark untraceable because of the black spots freckling the
// crown — tracing them as evenodd holes is the trap that rendered the 49ers "F" solid black. That
// was the right trap to fear and the wrong way out of it. The spots ARE the shell color, so they
// never needed to be holes OR layers: trace the gold as plain unions and every spot falls out as a
// gap between components, with the shell showing through it — the same reasoning that let the
// Chiefs arrowhead ship as a single path.
//
// That trick is load-bearing, so it decides which kits get the mark: only the three wearing a BLACK
// shell. THE TEAL THROWBACK DOES NOT, because its shell is `accent` — on teal every spot would come
// out teal, and the crown would read as a different animal. Give that kit a spot layer of its own
// before adding the mark to it.
export const JAGUARS_DECAL_JAW_PATH =
  'M437.1,214.0 L447.4,214.5 L450.4,218.0 L466.1,219.7 L469.0,223.6 L482.3,225.4 L481.3,227.6 L472.5,227.6 L463.1,223.1 L450.4,223.1 L443.0,231.6 L438.6,252.1 L447.4,282.8 L458.7,300.4 L464.6,306.1 L470.5,307.2 L483.8,306.7 L491.1,301.5 L505.4,302.1 L505.9,304.4 L497.0,313.5 L490.1,318.6 L482.3,320.3 L467.6,318.6 L454.3,307.2 L440.1,282.2 L433.2,274.8 L409.1,261.7 L409.1,259.5 L422.4,261.7 L429.2,266.3 L434.6,261.7 L435.6,254.9 L427.3,249.8 L409.6,249.8 L412.1,240.1 L398.3,231.6 L406.2,229.9 L414.0,233.9 L421.4,221.4 L420.9,216.8 L432.2,217.4 L436.6,214.5 Z M510.3,224.2 L517.6,225.4 L526.5,232.7 L526.5,236.7 L500.0,247.5 L494.6,247.5 L485.2,241.3 L486.7,239.0 L496.0,242.4 L497.0,235.0 L513.2,234.5 L514.7,231.0 L510.3,224.8 Z M356.6,174.2 L375.7,183.8 L376.7,186.1 L371.3,189.5 L372.8,192.4 L388.5,193.5 L390.9,196.4 L369.8,196.4 L356.6,179.9 L356.1,174.7 Z M548.6,225.9 L551.5,234.5 L548.6,241.8 L537.3,241.8 L535.3,235.6 L540.2,234.5 L548.1,226.5 Z';
export const JAGUARS_DECAL_CROWN_PATH =
  'M442.5,153.7 L451.3,154.8 L455.3,161.1 L467.1,154.8 L472.0,157.7 L478.8,169.1 L475.9,176.5 L465.6,177.6 L464.6,181.0 L461.2,181.0 L458.7,186.7 L454.3,187.8 L452.8,191.2 L460.7,204.3 L474.9,208.9 L478.4,206.0 L483.3,208.9 L483.8,211.7 L473.0,218.5 L460.7,216.8 L472.5,212.3 L471.5,208.9 L459.7,209.4 L455.3,214.0 L437.6,211.7 L423.8,214.0 L428.3,212.8 L429.7,209.4 L419.4,197.5 L415.5,203.7 L418.9,212.8 L417.0,214.5 L418.0,222.5 L408.6,212.8 L403.7,212.8 L401.7,215.7 L403.7,227.6 L398.3,227.1 L394.4,232.7 L390.0,232.2 L392.4,238.4 L390.9,243.0 L387.0,244.1 L386.5,228.8 L382.6,227.1 L383.1,220.2 L377.7,215.7 L379.2,205.5 L387.0,203.2 L394.9,194.1 L403.7,191.2 L406.7,197.5 L413.0,198.1 L417.5,192.9 L418.4,187.3 L415.0,183.8 L395.9,186.1 L385.0,182.1 L382.1,179.9 L382.6,168.5 L395.4,163.9 L403.2,167.4 L406.2,162.8 L419.9,157.1 L431.7,160.5 L442.0,154.3 Z M489.7,158.3 L494.1,158.3 L504.9,166.2 L510.8,177.0 L516.2,171.9 L520.1,172.5 L523.0,177.6 L531.9,183.3 L536.3,189.0 L535.3,191.8 L529.4,187.8 L525.5,187.8 L524.5,190.7 L535.3,200.3 L537.8,212.8 L542.2,210.6 L545.1,212.3 L543.7,219.1 L535.3,222.5 L530.9,218.5 L503.9,213.4 L502.4,215.1 L505.9,218.5 L502.4,220.8 L510.3,229.9 L505.4,232.7 L505.4,225.4 L499.5,223.6 L496.5,218.0 L491.1,217.4 L486.2,223.1 L478.8,221.9 L489.2,215.7 L486.7,204.9 L491.1,202.6 L496.5,203.7 L499.0,207.7 L509.8,208.3 L514.2,212.8 L518.1,211.1 L510.8,200.9 L511.8,194.1 L509.3,188.4 L505.4,190.1 L502.4,199.2 L498.0,199.8 L482.3,191.8 L483.8,185.0 L479.3,187.8 L483.8,181.0 L483.3,174.2 L488.2,166.2 L489.2,158.8 Z';
export const JAGUARS_DECAL_TONGUE_PATH =
  'M454.8,238.4 L461.2,240.1 L469.0,250.9 L469.5,272.0 L471.5,275.4 L474.4,274.3 L474.9,269.7 L474.9,252.6 L471.5,243.5 L473.4,243.0 L478.8,250.4 L479.3,271.4 L485.2,284.5 L482.8,287.9 L478.8,287.9 L475.9,295.3 L471.0,294.2 L462.2,281.6 L461.2,256.1 L454.3,239.0 Z';

// Fixed art on the black shell; the teal has no token on the home palette and the gold none on the
// throwback's, so pinning both is simpler than threading them per kit.
export const JAGUARS_DECAL_GOLD = '#D7A22A';
export const JAGUARS_DECAL_TEAL = '#006778';

function decal(): UniformLayer[] {
  return (
    [
      ['jaguars-decal-jaw', JAGUARS_DECAL_JAW_PATH, JAGUARS_WHITE],
      ['jaguars-decal-crown', JAGUARS_DECAL_CROWN_PATH, JAGUARS_DECAL_GOLD],
      ['jaguars-decal-tongue', JAGUARS_DECAL_TONGUE_PATH, JAGUARS_DECAL_TEAL],
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

// The sleeve bands, measured on the home figure (jersey top y=129, sleeve hem y=195, figure center
// x=103.5, so scaleY = 191/66 and scaleX = 264/84.5). The reference draws two stacked runs of black
// — y179-184 with an angled inner edge (x21-29 at its top, widening to x21-51 by y184 as it crosses
// the sleeve seam) and a plain x21-51 rectangle from y187 to the hem — but the 6-unit gap between
// them is the mannequin's own hem outline, not body color. Authored as ONE band, because the
// mannequin does not draw that outline: split into two, the gap fills with the jersey color and the
// sleeve reads as two thin stripes instead of the solid block the reference shows. This is the same
// hairline-outline call the Chiefs bands make. Extended outward to x=30 and past the hem to y=576
// so the jersey clip trims it flush.
export const JAGUARS_BAND_LEFT = 'M30,525 L61,525 L130,542 L130,576 L30,576 Z';
export const JAGUARS_BAND_RIGHT = 'M558,525 L527,525 L458,542 L458,576 L558,576 Z';

// The throwback's two bands ARE different colors, so both are authored — but contiguous, for the
// same reason. Measured on row-1 figure 5 (figure center x=924.5, same anchors): the gold band runs
// reference x842-860 at y182-187, and the black band beneath it runs the full x842-872 from y190 to
// the hem. Note the two are not the same width; the black one reaches further inboard.
export const JAGUARS_TB_BAND_UPPER_LEFT = 'M30,536 H93 V555 H30 Z';
export const JAGUARS_TB_BAND_UPPER_RIGHT = 'M558,536 H495 V555 H558 Z';
export const JAGUARS_TB_BAND_LOWER_LEFT = 'M30,555 H130 V576 H30 Z';
export const JAGUARS_TB_BAND_LOWER_RIGHT = 'M558,555 H458 V576 H558 Z';

// The current kits' collar is two short arcs, not a chevron: measured at reference x71-73 and
// x135-137 from y132, drifting only to x79/x131 by y153 and stopping there — so the arms never
// meet, and a stroke along the generic chevron would wrongly close them at the chest. The
// throwback's collar is the closing V, measured from (888,141) to a point at (924,161).
const JAGUARS_COLLAR_ARC_LEFT = 'M197,391 L196,420 L218,456';
const JAGUARS_COLLAR_ARC_RIGHT = 'M391,391 L392,420 L370,456';
const JAGUARS_COLLAR_ARC_WIDTH = 12;
const JAGUARS_TB_COLLAR_PATH = 'M180,418 L292,476 L408,418';
const JAGUARS_TB_COLLAR_WIDTH = 26;

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

function bandLayers(
  shapes: [string, 'sleeve-left' | 'sleeve-right', string, ColorRef][]
): UniformLayer[] {
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

function sleeveBand(fill: ColorRef): UniformLayer[] {
  return bandLayers([
    ['jaguars-band-left', 'sleeve-left', JAGUARS_BAND_LEFT, fill],
    ['jaguars-band-right', 'sleeve-right', JAGUARS_BAND_RIGHT, fill],
  ]);
}

function throwbackBands(upper: ColorRef, lower: ColorRef): UniformLayer[] {
  return bandLayers([
    ['jaguars-band-upper-left', 'sleeve-left', JAGUARS_TB_BAND_UPPER_LEFT, upper],
    ['jaguars-band-upper-right', 'sleeve-right', JAGUARS_TB_BAND_UPPER_RIGHT, upper],
    ['jaguars-band-lower-left', 'sleeve-left', JAGUARS_TB_BAND_LOWER_LEFT, lower],
    ['jaguars-band-lower-right', 'sleeve-right', JAGUARS_TB_BAND_LOWER_RIGHT, lower],
  ]);
}

function collarArcs(stroke: ColorRef): UniformLayer[] {
  return [
    ['jaguars-collar-left', JAGUARS_COLLAR_ARC_LEFT],
    ['jaguars-collar-right', JAGUARS_COLLAR_ARC_RIGHT],
  ].map(([id, d]) => ({
    id,
    surface: 'collar',
    d,
    clip: true,
    kind: 'stroke',
    stroke,
    strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
  }));
}

function throwbackCollar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'jaguars-collar-v',
      surface: 'collar',
      d: JAGUARS_TB_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: JAGUARS_TB_COLLAR_WIDTH,
    },
  ];
}

export const JAGUARS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'jaguars',
  // Every kit strips the same generic model; what differs is only which token carries each color.
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Teal body over white pants. This palette has accent === secondary (ESPN supplies only two
    // colors), so gold is the only trim token it can offer — and the reference's shell, bands and
    // collar are all black. Every one of them takes the literal, and so do the pants. The numerals
    // are unoutlined white, so the keyline is set to the face color rather than left to inherit.
    home: {
      helmetColor: JAGUARS_BLACK,
      pantsColor: JAGUARS_WHITE,
      layers: [...sleeveBand(JAGUARS_BLACK), ...collarArcs(JAGUARS_BLACK), ...decal()],
      number: { fill: JAGUARS_WHITE, outline: JAGUARS_WHITE, outlineWidth: 10 },
    },
    // White body and pants under the same black shell. The away palette moves white into primary,
    // so the pants need no override, but black is still tokenless here — shell, bands, collar and
    // the unoutlined numeral face all take the literal.
    away: {
      helmetColor: JAGUARS_BLACK,
      layers: [...sleeveBand(JAGUARS_BLACK), ...collarArcs(JAGUARS_BLACK), ...decal()],
      number: { fill: JAGUARS_BLACK, outline: JAGUARS_BLACK, outlineWidth: 10 },
    },
    // Teal body over white pants, and the only kit whose palette carries black — as `accent` — so
    // the shell, the lower band and the closing collar V all resolve from a token. Gold moves the
    // upper band and the numeral keyline onto `secondary`. See the color conflict noted above.
    'teal-throwback': {
      helmetColor: 'accent',
      pantsColor: JAGUARS_WHITE,
      layers: [...throwbackBands('secondary', 'accent'), ...throwbackCollar('accent')],
      number: { fill: JAGUARS_WHITE, outline: 'secondary', outlineWidth: 16 },
    },
    // INFERRED — no black jersey appears in the 2025 reference. Black is this kit's primary, so the
    // shell and pants need no override; the bands and numeral keyline are recolored onto the kit's
    // own gold `secondary`, which is the assignment the club's other black-based kits use.
    'black-alt': {
      layers: [...sleeveBand('secondary'), ...collarArcs('secondary'), ...decal()],
      number: { fill: JAGUARS_WHITE, outline: 'secondary', outlineWidth: 16 },
    },
  },
};
