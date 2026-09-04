import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Carolina's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/panthers (black alternate is that sheet's row-2 figure 1, home its row-2
// figure 5, away its row-3 figure 1 — each row's later figures are pant combinations, and the
// blue-boxed group in row 1 is labelled "worn in preseason games only", so none of those were
// used). Sleeve paths use the outer 588-wide mannequin space; the helmet decal stays in raw helmet
// coordinates (x:139-802, y:65-674). Right paths mirror the left across x=294 (mirroredX = 588 - x).
//
// All three kits are ONE construction with the tokens swapped: the panther on the shell, a deep
// V-collar, and on each shoulder a fan of three tapering wedges that converge to a point above the
// sleeve hem. The fan is always [outer, inner, outer, body] reading inward — white/black on the
// blue kit, silver/blue on the black kit, black/blue on the white kit — which is why it is authored
// as one wedge painted over a wider one rather than as three separate stripes. No helmet stripe and
// no pant stripe: every pant combination in the reference is unbroken.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "KEEP POUNDING" collar
// script, the panther patch on each sleeve, and the shoulder numerals GUD draws above the fan.

// Two literals. The home palette is blue over black with accent === secondary (ESPN supplies only
// two colors), so nothing resolves to the white wedge or the white numeral face; and the AWAY
// palette (white/blue/black) carries no silver, so its shell has no token either. The silver is the
// hex the archive already stores as this club's black-alternate accent (lib/uniforms/data.ts).
export const PANTHERS_WHITE = '#FFFFFF';
export const PANTHERS_SILVER = '#A5ACAF';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Carolina Panthers logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// Two layers, because the mark's interior is NOT the shell color: a blue silhouette under a black
// body, so the blue reads as the keyline it is. The silhouette is traced as the union of blue AND
// black rather than as blue alone — tracing blue by itself returned nine disconnected slivers that
// read as debris beside the head, which is the Packers-G inversion applied in reverse. Neither path
// carries a fill rule: the mark has no true counters, and its jaw detail is antialiased, so an
// evenodd hole would punch straight through to the shell (the failure that rendered the 49ers "F"
// solid black). Plain unions in paint order instead. Traced from the helmet bbox (x 254-360,
// y 83-180 in the reference) mapped onto the raw helmet space at ~6.2x.
export const PANTHERS_DECAL_SILHOUETTE_PATH =
  'M447.6,78.7 L519.4,91.1 L556.0,107.9 L507.7,89.9 L451.9,82.4 L388.1,83.0 L321.8,102.3 L277.2,126.5 L241.9,160.7 L231.3,176.9 L230.7,189.9 L226.4,188.7 L208.4,251.4 L201.6,216.0 L215.8,170.0 L237.5,134.0 L218.9,166.9 L207.2,201.7 L204.7,220.4 L208.4,237.1 L213.4,234.6 L226.4,183.1 L238.8,160.7 L287.7,116.0 L324.3,97.9 L369.5,84.9 L402.9,79.3 L446.9,79.3 Z M468.0,97.3 L477.3,105.4 L414.1,108.5 L395.5,104.8 L407.3,98.6 L467.4,97.9 Z M430.2,132.7 L466.1,134.6 L529.3,151.4 L514.5,152.0 L514.5,161.3 L499.0,152.6 L495.9,155.7 L499.6,157.6 L494.0,158.2 L479.2,145.2 L440.7,133.4 L435.2,138.3 L385.0,138.9 L363.9,150.8 L319.9,151.4 L324.9,147.0 L349.7,145.8 L391.2,135.2 L429.6,133.4 Z M297.6,133.4 L301.3,138.3 L262.9,185.6 L254.2,206.1 L244.3,210.4 L232.6,198.0 L233.2,186.2 L297.0,134.0 Z M399.9,139.6 L430.8,140.8 L450.7,154.5 L453.8,149.5 L445.1,144.5 L447.6,139.6 L477.9,147.0 L490.9,159.5 L486.6,168.2 L502.7,189.3 L498.4,204.8 L515.1,192.4 L502.7,227.8 L482.9,257.0 L473.0,226.6 L467.4,224.7 L466.1,237.7 L474.2,262.0 L458.1,269.4 L450.0,260.7 L443.8,274.4 L453.8,281.2 L445.7,281.9 L437.6,274.4 L435.8,263.2 L430.2,261.4 L429.0,275.7 L445.1,295.5 L462.4,298.6 L478.5,291.2 L466.1,305.5 L451.3,309.2 L468.6,342.1 L420.9,336.6 L301.3,293.7 L308.2,270.1 L331.1,244.0 L331.1,237.7 L302.0,257.0 L272.2,292.4 L215.8,292.4 L227.6,271.3 L253.6,241.5 L290.2,209.8 L342.8,174.4 L333.6,170.0 L321.2,153.2 L366.4,152.6 L386.8,140.8 L399.2,140.2 Z M319.3,157.0 L335.4,178.7 L290.2,207.3 L252.4,239.6 L225.1,271.3 L213.4,294.3 L184.9,299.9 L196.0,280.6 L236.3,239.6 L283.4,203.0 L329.2,176.2 L319.3,157.6 Z M528.1,164.4 L522.5,171.9 L523.2,189.9 L526.9,194.3 L535.5,193.0 L517.0,204.2 L508.9,225.9 L492.2,248.9 L517.6,196.7 L517.0,190.5 L508.3,181.8 L500.2,183.7 L493.4,172.5 L518.8,171.3 L527.5,165.0 Z M326.7,240.2 L305.7,269.4 L298.2,294.3 L275.9,293.1 L295.8,266.3 L326.1,240.9 Z M484.7,258.3 L484.1,281.9 L468.0,294.3 L445.1,293.1 L430.8,273.8 L433.3,267.6 L435.8,276.3 L445.1,283.7 L469.2,284.4 L479.8,275.0 L479.2,263.8 L484.1,258.9 Z';
export const PANTHERS_DECAL_BODY_PATH =
  'M468.0,97.3 L477.3,105.4 L414.1,108.5 L395.5,104.8 L407.3,98.6 L467.4,97.9 Z M297.6,133.4 L301.3,138.3 L262.9,185.6 L254.2,206.1 L244.3,210.4 L232.6,198.0 L233.2,186.2 L297.0,134.0 Z M399.9,139.6 L430.8,140.8 L450.7,154.5 L453.8,149.5 L445.1,144.5 L447.6,139.6 L477.9,147.0 L490.9,159.5 L486.6,168.2 L502.7,189.3 L498.4,204.8 L515.1,192.4 L502.7,227.8 L482.9,257.0 L473.0,226.6 L467.4,224.7 L466.1,237.7 L474.2,262.0 L458.1,269.4 L450.0,260.7 L443.8,274.4 L453.8,281.2 L445.7,281.9 L437.6,274.4 L435.8,263.2 L430.2,261.4 L429.0,275.7 L445.1,295.5 L462.4,298.6 L478.5,291.2 L466.1,305.5 L451.3,309.2 L468.6,342.1 L420.9,336.6 L301.3,293.7 L308.2,270.1 L331.1,244.0 L331.1,237.7 L302.0,257.0 L272.2,292.4 L215.8,292.4 L227.6,271.3 L253.6,241.5 L290.2,209.8 L342.8,174.4 L333.6,170.0 L321.2,153.2 L366.4,152.6 L386.8,140.8 L399.2,140.2 Z';

// The shoulder fan, measured on the home figure (jersey top y=700, sleeve hem y=766, figure center
// x=1118.5, so scaleY = 191/66 and scaleX = 264/84.5). Reading inward at reference y=725 the bands
// are x1051-1054, x1056-1059 and x1060-1062; all three taper to a shared point at (1068,753), and
// the middle band dies early at (1063,738). So the outer color is authored as one triangle and the
// middle band as a shorter triangle over it, which reproduces the outer/inner/outer read exactly.
export const PANTHERS_FAN_LEFT = 'M61,435 L111,421 L136,539 Z';
export const PANTHERS_FAN_RIGHT = 'M527,435 L477,421 L452,539 Z';
export const PANTHERS_WEDGE_LEFT = 'M74,421 L102,426 L121,493 Z';
export const PANTHERS_WEDGE_RIGHT = 'M514,421 L486,426 L467,493 Z';

// The collar V, measured on the same figure: the band's outer corner sits at reference (1085,703)
// and both arms meet at (1119,745) — far deeper than the generic chevron, whose point is at y=455.
// Roughly 9 reference px thick measured horizontally, which is ~24 units perpendicular to the arm.
const PANTHERS_COLLAR_PATH = 'M189,392 L295,513 L399,392';
const PANTHERS_COLLAR_WIDTH = 24;

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

// Wider triangle first, shorter one over it — the gap left below the middle band's point is where
// the two outer bands merge in the reference.
function shoulderFan(outer: ColorRef, middle: ColorRef): UniformLayer[] {
  const shapes: [string, 'sleeve-left' | 'sleeve-right', string, ColorRef][] = [
    ['panthers-fan-left', 'sleeve-left', PANTHERS_FAN_LEFT, outer],
    ['panthers-fan-right', 'sleeve-right', PANTHERS_FAN_RIGHT, outer],
    ['panthers-wedge-left', 'sleeve-left', PANTHERS_WEDGE_LEFT, middle],
    ['panthers-wedge-right', 'sleeve-right', PANTHERS_WEDGE_RIGHT, middle],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

function collar(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'panthers-collar',
      surface: 'collar',
      d: PANTHERS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: fill,
      strokeWidth: PANTHERS_COLLAR_WIDTH,
    },
  ];
}

function decal(keyline: ColorRef, body: ColorRef): UniformLayer[] {
  return [
    {
      id: 'panthers-decal-silhouette',
      surface: 'helmet',
      d: PANTHERS_DECAL_SILHOUETTE_PATH,
      clip: true,
      kind: 'fill',
      fill: keyline,
    },
    {
      id: 'panthers-decal-body',
      surface: 'helmet',
      d: PANTHERS_DECAL_BODY_PATH,
      clip: true,
      kind: 'fill',
      fill: body,
    },
  ];
}

export const PANTHERS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'panthers',
  // Every kit strips the same generic model; what differs is only which token carries each color.
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Blue body over black pants under a black shell — the only kit in the reference whose shell is
    // not silver. Black is `secondary` here, so it carries the shell, the collar, the middle wedge
    // and the numeral keyline; the outer wedge and numeral face are white, which this palette
    // cannot supply, so both take the literal. On a black shell the decal's black body disappears
    // into the shell and the blue silhouette reads alone, exactly as the reference draws it.
    home: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      layers: [
        ...shoulderFan(PANTHERS_WHITE, 'secondary'),
        ...collar('secondary'),
        ...decal('primary', 'secondary'),
      ],
      number: { fill: PANTHERS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body over black pants under the silver shell. The away palette moves white into
    // primary, blue into secondary and black into accent, so the fan inverts to black-outside-blue
    // and the numerals invert to a black face. Silver has no token here, so the shell takes the
    // literal.
    away: {
      helmetColor: PANTHERS_SILVER,
      pantsColor: 'accent',
      layers: [
        ...shoulderFan('accent', 'secondary'),
        ...collar('accent'),
        ...decal('secondary', 'accent'),
      ],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
    // Black body and pants under the silver shell. This is the only kit whose palette carries
    // silver — as `accent` — so the shell and the outer wedge both resolve from a token, and the
    // numeral face is white again.
    'black-alt': {
      helmetColor: 'accent',
      layers: [
        ...shoulderFan('accent', 'secondary'),
        ...collar('secondary'),
        ...decal('secondary', 'primary'),
      ],
      number: { fill: PANTHERS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
  },
};
