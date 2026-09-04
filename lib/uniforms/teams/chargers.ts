import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Los Angeles' three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/chargers (home is that sheet's row-1 figure 1, away its row-2 figure 1). Sleeve
// paths use the outer 588-wide mannequin space; helmet paths stay in raw helmet coordinates
// (x:139-802, y:65-674). Right paths mirror the left across x=294 (mirroredX = 588 - x).
//
// All three kits are ONE construction, and the whole uniform is two marks: a lightning bolt on each
// shoulder cap and a much larger one on the shell, each a solid gold body inside a contrasting
// keyline. No sleeve stripe, no collar trim, no pant stripe — the pants sample as unbroken gold on
// both the home and away figures, and the bolt-patterned bars beside each figure are the sock
// legend, not the pant.
//
// WHY `home` AND `powder-blue` RENDER IDENTICALLY, and why that is correct. Both rows store primary
// #0080C6 over secondary #FFC20E; they differ only in accent (gold on home, white on powder-blue).
// That is not a bug in this module — the 2025 reference draws exactly one powder-blue jersey, so
// the two rows genuinely describe the same uniform. The definition leans into it: the construction
// is shared, and the only difference is that `home` reaches white through a literal where
// `powder-blue` reaches it through `accent`. If these should ever be two distinct looks, the
// reference offers two candidates with no kit of their own — a gold jersey (row-3 figures 1-2) and
// a navy one (row-3 figures 5-6). That is a data decision, not a definition fix.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "BOLT UP" collar tab, and
// the numerals GUD draws on the shell.

// White is a literal on the home kit only. Its palette is powder blue over gold with accent ===
// secondary (ESPN supplies only two colors), so nothing resolves to the shell, the sleeve bolt's
// keyline, or the numeral face. The powder-blue kit carries white in `accent` and the away in
// `primary`, so neither needs it.
export const CHARGERS_WHITE = '#FFFFFF';

// Both marks are traced the same way and for the same reason: the keyline is traced as the union of
// keyline AND body, with the body painted over it, so the outline stays continuous instead of
// breaking into slivers. One wrinkle worth recording — on the shell the two colors do NOT touch.
// An antialiased seam runs between them that matches neither predicate, so the union is two
// disjoint components rather than one, and taking "the largest component" silently returns the gold
// body alone and drops the keyline entirely. Both components are kept instead, filtered by size:
// that also drops the blue numerals GUD paints on the shell, which are the same blue as the keyline
// and would otherwise be traced as part of it. Traced from the sleeve at the mannequin's own scale
// and from the helmet bbox (x 54-160, y 40-139 in the reference) at ~6.2x.
export const CHARGERS_BOLT_KEYLINE_LEFT =
  'M103.2,415.8 L106.8,419.2 L110.7,441.6 L112.8,444.7 L117.7,496.1 L112.3,470.3 L108.9,438.5 L102.9,416.0 Z M99.8,417.2 L107.1,440.9 L113.8,486.0 L113.3,494.9 L92.7,438.2 L89.1,438.5 L82.1,452.2 L79.7,452.9 L70.9,428.3 L84.2,421.3 L99.5,417.5 Z M69.1,429.8 L77.9,455.8 L83.6,454.4 L84.4,450.3 L90.4,440.4 L91.7,440.9 L110.4,496.3 L114.6,501.9 L118.0,501.2 L119.0,503.1 L119.6,532.5 L112.0,501.2 L93.3,449.8 L88.6,449.6 L78.7,465.7 L68.8,438.2 L68.8,430.0 Z';
export const CHARGERS_BOLT_KEYLINE_RIGHT =
  'M484.8,415.8 L481.2,419.2 L477.3,441.6 L475.2,444.7 L470.3,496.1 L475.7,470.3 L479.1,438.5 L485.1,416.0 Z M488.2,417.2 L480.9,440.9 L474.2,486.0 L474.7,494.9 L495.3,438.2 L498.9,438.5 L505.9,452.2 L508.3,452.9 L517.1,428.3 L503.8,421.3 L488.5,417.5 Z M518.9,429.8 L510.1,455.8 L504.4,454.4 L503.6,450.3 L497.6,440.4 L496.3,440.9 L477.6,496.3 L473.4,501.9 L470.0,501.2 L469.0,503.1 L468.4,532.5 L476.0,501.2 L494.7,449.8 L499.4,449.6 L509.3,465.7 L519.2,438.2 L519.2,430.0 Z';
export const CHARGERS_BOLT_BODY_LEFT =
  'M99.8,417.2 L107.1,440.9 L113.8,486.0 L113.3,494.9 L92.7,438.2 L89.1,438.5 L82.1,452.2 L79.7,452.9 L70.9,428.3 L84.2,421.3 L99.5,417.5 Z';
export const CHARGERS_BOLT_BODY_RIGHT =
  'M488.2,417.2 L480.9,440.9 L474.2,486.0 L474.7,494.9 L495.3,438.2 L498.9,438.5 L505.9,452.2 L508.3,452.9 L517.1,428.3 L503.8,421.3 L488.5,417.5 Z';
export const CHARGERS_DECAL_KEYLINE_PATH =
  'M438.7,141.1 L512.3,146.5 L568.8,165.0 L630.8,208.0 L657.1,240.3 L665.7,259.6 L625.4,236.5 L591.3,223.4 L509.2,206.5 L500.7,210.3 L513.9,229.6 L461.2,224.2 L376.8,235.7 L347.3,248.0 L347.3,253.4 L358.2,256.5 L358.2,260.3 L306.3,285.7 L269.1,315.7 L231.2,355.7 L196.3,411.8 L196.3,373.4 L208.7,327.2 L227.3,289.5 L262.1,246.5 L251.3,238.0 L250.5,230.3 L286.2,201.9 L319.5,183.4 L368.3,165.7 L396.1,161.9 L389.9,145.7 L438.0,141.9 Z M452.7,154.2 L505.3,158.8 L548.7,171.9 L594.4,195.7 L626.2,222.6 L556.5,199.6 L475.1,191.9 L471.3,200.3 L479.0,211.1 L429.4,211.9 L348.9,229.6 L320.2,241.1 L317.1,248.8 L328.8,259.6 L310.9,266.5 L276.1,291.1 L214.1,354.1 L240.5,294.2 L281.5,248.0 L283.8,238.0 L271.4,231.9 L283.8,220.3 L338.0,189.6 L379.9,177.3 L426.3,171.1 L430.2,165.7 L421.7,157.3 L451.9,155.0 Z';
export const CHARGERS_DECAL_BOLT_PATH =
  'M452.7,154.2 L505.3,158.8 L548.7,171.9 L594.4,195.7 L626.2,222.6 L556.5,199.6 L475.1,191.9 L471.3,200.3 L479.0,211.1 L429.4,211.9 L348.9,229.6 L320.2,241.1 L317.1,248.8 L328.8,259.6 L310.9,266.5 L276.1,291.1 L214.1,354.1 L240.5,294.2 L281.5,248.0 L283.8,238.0 L271.4,231.9 L283.8,220.3 L338.0,189.6 L379.9,177.3 L426.3,171.1 L430.2,165.7 L421.7,157.3 L451.9,155.0 Z';

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

// Keyline first, body over it — the paint order every trimmed mark here uses.
function bolts(keyline: ColorRef, body: ColorRef): UniformLayer[] {
  const shapes: [string, 'sleeve-left' | 'sleeve-right' | 'helmet', string, ColorRef][] = [
    ['chargers-bolt-keyline-left', 'sleeve-left', CHARGERS_BOLT_KEYLINE_LEFT, keyline],
    ['chargers-bolt-keyline-right', 'sleeve-right', CHARGERS_BOLT_KEYLINE_RIGHT, keyline],
    ['chargers-bolt-body-left', 'sleeve-left', CHARGERS_BOLT_BODY_LEFT, body],
    ['chargers-bolt-body-right', 'sleeve-right', CHARGERS_BOLT_BODY_RIGHT, body],
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

function decal(keyline: ColorRef, body: ColorRef): UniformLayer[] {
  return [
    {
      id: 'chargers-decal-keyline',
      surface: 'helmet',
      d: CHARGERS_DECAL_KEYLINE_PATH,
      clip: true,
      kind: 'fill',
      fill: keyline,
    },
    {
      id: 'chargers-decal-bolt',
      surface: 'helmet',
      d: CHARGERS_DECAL_BOLT_PATH,
      clip: true,
      kind: 'fill',
      fill: body,
    },
  ];
}

export const CHARGERS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'chargers',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Powder-blue body over gold pants under the white shell. Accent === secondary here, so gold is
    // the only trim token available and white has none — the shell, the sleeve bolt's keyline and
    // the numeral face all take the literal. On the shell the keyline is powder blue rather than
    // white, which this palette does supply, as `primary`.
    home: {
      helmetColor: CHARGERS_WHITE,
      pantsColor: 'secondary',
      layers: [...bolts(CHARGERS_WHITE, 'secondary'), ...decal('primary', 'secondary')],
      number: { fill: CHARGERS_WHITE, outline: 'secondary', outlineWidth: 12 },
    },
    // The same uniform as home, authored against a palette that carries white in `accent` — so
    // every color resolves from a token and nothing here is a literal. See the note above on why
    // these two kits render the same.
    'powder-blue': {
      helmetColor: 'accent',
      pantsColor: 'secondary',
      layers: [...bolts('accent', 'secondary'), ...decal('primary', 'secondary')],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 12 },
    },
    // White body over gold pants under the white shell. The away palette moves white into primary,
    // powder blue into secondary and gold into accent, so the shell needs no override and both
    // bolts keyline in blue against a gold body — which is what the reference draws.
    away: {
      pantsColor: 'accent',
      layers: [...bolts('secondary', 'accent'), ...decal('secondary', 'accent')],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 12 },
    },
  },
};
