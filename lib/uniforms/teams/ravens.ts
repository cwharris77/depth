import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Baltimore's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/ravens (home is that sheet's row-1 figure 1, black alternate its row-2 figure 3,
// away its row-3 figure 1 — the other figures in each row are pant combinations, not separate
// kits). Sleeve paths use the outer 588-wide mannequin space; right paths mirror the left across
// the centerline x=294 (mirroredX = 588 - x).
//
// All three kits are ONE construction with the tokens swapped: a bare black shell, a short tilted
// bar on each shoulder cap, a solid band filling the last third of each sleeve, and trimmed
// numerals. No helmet stripe, no collar trim, no pant stripe — the reference's pants are unbroken
// on every combination, and the black/white/black stripe in the swatch beside each figure is the
// sock, not the pant (the same swatch convention the Chiefs sheet uses).
//
// ONE APPROXIMATION, deliberate: the shoulder bar and the numerals both carry a black drop-shadow
// along their lower-right edge, under the gold keyline. At the 188px swatch this renders sub-pixel,
// so the bar is authored as gold-under-white and the numeral shadow is dropped entirely. The gold
// keyline is what actually reads at size, and it is preserved on both.
//
// Out of scope on every kit: the chest wordmark, the league shield, and the shield patch the
// reference draws on each sleeve.

// Two literals. The home palette is purple over black with gold in accent, so nothing resolves to
// the white bar face or the white numerals; and the AWAY palette (white/purple/gold) carries no
// black at all, so its shell and sleeve band have no token either. Both hexes are the values the
// archive already stores for this club's other kits (lib/uniforms/data.ts).
export const RAVENS_WHITE = '#FFFFFF';
export const RAVENS_BLACK = '#000000';

// The shoulder bar, measured on the home figure (jersey top y=132, sleeve hem y=197, figure center
// x=99.5, so scaleY = 191/65 and scaleX = 264/84.5). It runs reference x35-59 and is tilted about
// 4px over that 24px length, which is the shoulder slope. Thickness is taken from the mid-bar
// column at x=47, the only cut that crosses every layer cleanly: gold y144-149 around a white face
// at y145-148. Reading the bar's full outer boundary instead gives y145-151, but that lower 2px is
// the black drop-shadow, not gold — folding it in renders the keyline at twice its weight and the
// bar reads gold-with-a-white-slot rather than white-with-a-gold-keyline.
export const RAVENS_SHOULDER_OUTER_LEFT = 'M93,424 L168,412 L168,427 L93,439 Z';
export const RAVENS_SHOULDER_OUTER_RIGHT = 'M495,424 L420,412 L420,427 L495,439 Z';
export const RAVENS_SHOULDER_INNER_LEFT = 'M99,427 L164,415 L164,424 L99,436 Z';
export const RAVENS_SHOULDER_INNER_RIGHT = 'M489,427 L424,415 L424,424 L489,436 Z';

// The sleeve band, measured on the same figure: reference x19-48 (mirrored x153-181 on the right,
// which is within 2px of the computed mirror) and y188-197, so it ends flush with the hem. Extended
// outward to x=30 and past the hem to y=576 so the jersey clip trims it flush.
export const RAVENS_SLEEVE_BAND_LEFT = 'M30,548 H133 V576 H30 Z';
export const RAVENS_SLEEVE_BAND_RIGHT = 'M558,548 H455 V576 H558 Z';

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

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The raven head, traced from the home figure's shell (bbox x30-173, y27-144 in the reference)
// mapped onto the raw helmet space at ~6.25x. Four plain-union fills in paint order: gold keyline,
// purple head, gold "B", white beak.
//
// This module previously called the mark untraceable, reasoning that a two-px gold keyline is the
// same sub-3px stroke detail that shredded the Falcons falcon. That reasoning had the right premise
// and the wrong conclusion. The keyline is indeed too thin to trace AS A STROKE — but it never had
// to be one. Traced as the FILLED SILHOUETTE of the whole mark and painted under the purple, the
// keyline is whatever gold shows past the purple's edge, which is exactly the two px it should be
// and needs no stroke at all. The general rule: an outline that is too thin to trace directly is
// usually a filled shape one layer down.
export const RAVENS_DECAL_KEYLINE_PATH =
  'M460.1,141.8 L496.0,144.4 L523.8,154.1 L545.3,171.7 L552.2,190.6 L551.1,194.5 L547.6,194.5 L539.5,182.8 L541.2,177.6 L539.5,174.3 L518.6,162.6 L512.2,165.8 L521.5,169.1 L521.5,173.7 L504.7,174.3 L494.8,181.5 L511.1,184.7 L512.8,187.3 L497.2,189.9 L494.3,197.1 L518.6,196.4 L523.8,198.4 L525.6,202.9 L540.0,201.6 L548.2,206.2 L558.6,206.8 L563.8,210.7 L569.0,207.5 L573.1,199.0 L588.7,201.6 L618.3,217.2 L629.3,232.9 L626.4,234.8 L622.3,229.6 L615.4,229.0 L608.4,224.4 L597.4,223.8 L591.0,219.9 L575.4,219.2 L558.0,214.0 L532.5,214.0 L528.5,216.6 L528.5,219.9 L540.0,229.0 L544.7,224.4 L578.3,227.7 L619.4,239.4 L554.5,238.1 L550.5,240.0 L545.3,234.8 L538.9,234.8 L536.6,244.6 L529.0,251.1 L529.0,241.3 L526.1,236.8 L518.6,245.9 L497.7,262.1 L496.0,258.2 L505.3,244.6 L501.2,242.0 L496.0,246.5 L491.9,245.9 L491.4,234.2 L484.4,227.0 L471.1,224.4 L446.2,226.4 L443.8,224.4 L450.8,216.6 L486.1,197.1 L486.7,187.3 L477.5,178.9 L487.3,174.3 L496.0,165.2 L496.6,156.7 L491.4,150.9 L487.3,151.5 L479.8,147.0 L456.0,147.0 L409.1,159.3 L406.8,163.9 L412.0,160.6 L406.2,167.8 L438.0,161.9 L435.7,160.6 L446.2,161.9 L459.5,159.3 L467.0,163.9 L468.2,175.0 L472.2,175.6 L469.9,178.9 L463.5,176.9 L456.6,180.2 L454.9,173.7 L458.3,173.0 L461.2,167.8 L457.2,162.6 L440.4,167.8 L439.8,172.4 L430.5,184.7 L428.8,192.5 L425.9,191.2 L424.7,203.6 L421.2,205.5 L419.5,210.1 L421.2,212.7 L417.2,217.9 L410.8,218.6 L417.8,200.3 L417.2,183.4 L414.9,179.5 L404.4,173.0 L378.9,177.6 L384.7,169.8 L410.2,154.1 L436.9,145.0 L459.5,142.4 Z M460.6,128.1 L480.9,128.8 L518.6,137.9 L536.0,148.3 L544.1,156.7 L549.3,155.4 L554.5,164.5 L548.7,167.2 L529.0,148.3 L505.9,137.2 L496.6,137.2 L486.1,132.7 L453.1,132.7 L428.8,137.9 L394.0,154.1 L372.6,171.1 L354.6,191.9 L358.6,194.5 L380.1,186.7 L401.5,186.7 L406.2,196.4 L402.1,210.1 L392.8,226.4 L394.0,230.3 L396.9,230.9 L402.1,226.4 L425.3,223.8 L430.5,227.0 L430.5,238.1 L454.9,233.5 L475.7,236.8 L481.5,242.6 L481.5,256.3 L490.2,258.9 L490.2,275.2 L492.5,280.4 L495.4,279.7 L501.2,267.3 L510.5,258.2 L516.9,258.2 L509.9,262.8 L500.6,274.5 L494.3,290.1 L486.7,279.7 L485.6,265.4 L482.7,262.1 L475.1,260.8 L479.2,250.4 L474.6,242.0 L449.1,241.3 L416.6,251.7 L416.6,247.8 L422.4,238.7 L420.1,230.9 L399.2,232.2 L380.1,240.0 L379.5,236.8 L394.6,211.4 L395.7,201.0 L392.8,194.5 L376.0,194.5 L332.6,209.4 L333.7,204.9 L359.2,175.0 L391.7,149.6 L428.8,133.3 L460.1,128.8 Z M454.3,163.9 L457.2,164.5 L458.3,168.5 L453.7,171.7 L453.7,181.5 L449.1,184.7 L444.4,194.5 L442.7,207.5 L429.4,212.7 L434.6,214.6 L423.6,214.6 L425.9,211.4 L427.0,198.4 L436.9,177.6 L442.7,170.4 L453.7,164.5 Z M610.8,200.3 L621.8,205.5 L638.6,225.1 L640.9,236.1 L638.6,251.7 L543.5,251.7 L529.6,262.1 L519.2,263.4 L518.6,256.9 L530.8,257.6 L541.8,247.2 L594.5,249.8 L633.9,247.2 L638.6,240.0 L634.5,226.4 L610.2,201.0 Z M461.8,150.2 L489.0,153.5 L494.3,161.9 L483.2,173.7 L478.0,174.3 L477.5,169.1 L480.9,165.2 L475.7,158.0 L437.5,158.7 L429.9,156.1 L461.2,150.9 Z M451.4,184.7 L460.6,191.9 L458.9,196.4 L460.6,200.3 L458.3,203.6 L448.5,205.5 L445.6,198.4 L447.3,194.5 L449.1,196.4 L450.2,194.5 L450.8,185.4 Z M472.2,180.2 L480.9,184.7 L482.1,197.7 L467.0,204.2 L468.8,195.1 L472.8,192.5 L472.2,189.3 L467.0,184.7 L454.9,182.8 L471.7,180.8 Z';
export const RAVENS_DECAL_HEAD_PATH =
  'M460.1,141.8 L496.0,144.4 L523.8,154.1 L545.3,171.7 L552.2,190.6 L551.1,194.5 L547.6,194.5 L539.5,182.8 L541.2,177.6 L539.5,174.3 L518.6,162.6 L512.2,165.8 L521.5,169.1 L521.5,173.7 L504.7,174.3 L494.8,181.5 L511.1,184.7 L512.8,187.3 L497.2,189.9 L494.3,197.1 L518.6,196.4 L523.8,198.4 L525.6,202.9 L540.0,201.6 L548.2,206.2 L558.6,206.8 L563.8,210.7 L569.0,207.5 L573.1,199.0 L588.7,201.6 L618.3,217.2 L629.3,232.9 L626.4,234.8 L622.3,229.6 L615.4,229.0 L608.4,224.4 L597.4,223.8 L591.0,219.9 L575.4,219.2 L558.0,214.0 L532.5,214.0 L528.5,216.6 L528.5,219.9 L540.0,229.0 L544.7,224.4 L578.3,227.7 L619.4,239.4 L554.5,238.1 L550.5,240.0 L545.3,234.8 L538.9,234.8 L536.6,244.6 L529.0,251.1 L529.0,241.3 L526.1,236.8 L518.6,245.9 L497.7,262.1 L496.0,258.2 L505.3,244.6 L501.2,242.0 L496.0,246.5 L491.9,245.9 L491.4,234.2 L484.4,227.0 L471.1,224.4 L446.2,226.4 L443.8,224.4 L450.8,216.6 L486.1,197.1 L486.7,187.3 L477.5,178.9 L487.3,174.3 L496.0,165.2 L496.6,156.7 L491.4,150.9 L487.3,151.5 L479.8,147.0 L456.0,147.0 L409.1,159.3 L406.8,163.9 L412.0,160.6 L406.2,167.8 L438.0,161.9 L435.7,160.6 L446.2,161.9 L459.5,159.3 L467.0,163.9 L468.2,175.0 L472.2,175.6 L469.9,178.9 L463.5,176.9 L456.6,180.2 L454.9,173.7 L458.3,173.0 L461.2,167.8 L457.2,162.6 L440.4,167.8 L439.8,172.4 L430.5,184.7 L428.8,192.5 L425.9,191.2 L424.7,203.6 L421.2,205.5 L419.5,210.1 L421.2,212.7 L417.2,217.9 L410.8,218.6 L417.8,200.3 L417.2,183.4 L414.9,179.5 L404.4,173.0 L378.9,177.6 L384.7,169.8 L410.2,154.1 L436.9,145.0 L459.5,142.4 Z M451.4,184.7 L460.6,191.9 L458.9,196.4 L460.6,200.3 L458.3,203.6 L448.5,205.5 L445.6,198.4 L447.3,194.5 L449.1,196.4 L450.2,194.5 L450.8,185.4 Z';
export const RAVENS_DECAL_LETTER_PATH =
  'M460.6,128.1 L480.9,128.8 L518.6,137.9 L536.0,148.3 L544.1,156.7 L549.3,155.4 L554.5,164.5 L548.7,167.2 L529.0,148.3 L505.9,137.2 L496.6,137.2 L486.1,132.7 L453.1,132.7 L428.8,137.9 L394.0,154.1 L372.6,171.1 L354.6,191.9 L358.6,194.5 L380.1,186.7 L401.5,186.7 L406.2,196.4 L402.1,210.1 L392.8,226.4 L394.0,230.3 L396.9,230.9 L402.1,226.4 L425.3,223.8 L430.5,227.0 L430.5,238.1 L454.9,233.5 L475.7,236.8 L481.5,242.6 L481.5,256.3 L490.2,258.9 L490.2,275.2 L492.5,280.4 L495.4,279.7 L501.2,267.3 L510.5,258.2 L516.9,258.2 L509.9,262.8 L500.6,274.5 L494.3,290.1 L486.7,279.7 L485.6,265.4 L482.7,262.1 L475.1,260.8 L479.2,250.4 L474.6,242.0 L449.1,241.3 L416.6,251.7 L416.6,247.8 L422.4,238.7 L420.1,230.9 L399.2,232.2 L380.1,240.0 L379.5,236.8 L394.6,211.4 L395.7,201.0 L392.8,194.5 L376.0,194.5 L332.6,209.4 L333.7,204.9 L359.2,175.0 L391.7,149.6 L428.8,133.3 L460.1,128.8 Z M454.3,163.9 L457.2,164.5 L458.3,168.5 L453.7,171.7 L453.7,181.5 L449.1,184.7 L444.4,194.5 L442.7,207.5 L429.4,212.7 L434.6,214.6 L423.6,214.6 L425.9,211.4 L427.0,198.4 L436.9,177.6 L442.7,170.4 L453.7,164.5 Z M610.8,200.3 L621.8,205.5 L638.6,225.1 L640.9,236.1 L638.6,251.7 L543.5,251.7 L529.6,262.1 L519.2,263.4 L518.6,256.9 L530.8,257.6 L541.8,247.2 L594.5,249.8 L633.9,247.2 L638.6,240.0 L634.5,226.4 L610.2,201.0 Z M461.8,150.2 L489.0,153.5 L494.3,161.9 L483.2,173.7 L478.0,174.3 L477.5,169.1 L480.9,165.2 L475.7,158.0 L437.5,158.7 L429.9,156.1 L461.2,150.9 Z M472.2,180.2 L480.9,184.7 L482.1,197.7 L467.0,204.2 L468.8,195.1 L472.8,192.5 L472.2,189.3 L467.0,184.7 L454.9,182.8 L471.7,180.8 Z M583.5,184.1 L590.5,184.7 L595.1,189.9 L605.5,192.5 L607.3,197.7 L601.5,198.4 L592.8,189.9 L583.5,188.6 L582.9,184.7 Z';
export const RAVENS_DECAL_BEAK_PATH =
  'M573.1,199.0 L588.7,201.6 L603.2,207.5 L623.5,222.5 L628.1,229.0 L628.7,234.2 L626.4,234.8 L622.3,229.6 L615.4,229.0 L608.4,224.4 L597.4,223.8 L591.0,219.9 L575.4,219.2 L558.0,214.0 L530.2,214.6 L528.5,219.9 L540.0,229.0 L544.7,224.4 L578.3,227.7 L619.4,238.7 L617.7,240.7 L566.1,238.1 L550.5,240.0 L545.3,234.8 L539.5,236.1 L519.8,212.0 L541.2,208.8 L538.9,204.9 L526.1,203.6 L531.9,201.0 L558.6,206.8 L565.5,210.7 L572.5,199.7 Z M451.4,159.3 L463.5,161.3 L460.1,167.2 L457.2,162.6 L452.5,162.6 L442.7,167.8 L445.0,162.6 L450.8,160.0 Z';

// Fixed art: purple over gold on a black shell on every kit, so nothing here takes a token — the
// away kit's palette moves purple out of reach entirely, which is exactly the case literals exist
// for.
export const RAVENS_DECAL_PURPLE = '#241773';
export const RAVENS_DECAL_GOLD = '#9A7611';

function decal(): UniformLayer[] {
  return (
    [
      ['ravens-decal-keyline', RAVENS_DECAL_KEYLINE_PATH, RAVENS_DECAL_GOLD],
      ['ravens-decal-head', RAVENS_DECAL_HEAD_PATH, RAVENS_DECAL_PURPLE],
      ['ravens-decal-letter', RAVENS_DECAL_LETTER_PATH, RAVENS_DECAL_GOLD],
      ['ravens-decal-beak', RAVENS_DECAL_BEAK_PATH, RAVENS_WHITE],
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

// Gold keyline first, face over it — the same paint order every trimmed mark here uses.
function shoulderBars(face: ColorRef): UniformLayer[] {
  const bars: [string, UniformSurface, string, ColorRef][] = [
    ['ravens-shoulder-outer-left', 'sleeve-left', RAVENS_SHOULDER_OUTER_LEFT, 'accent'],
    ['ravens-shoulder-outer-right', 'sleeve-right', RAVENS_SHOULDER_OUTER_RIGHT, 'accent'],
    ['ravens-shoulder-inner-left', 'sleeve-left', RAVENS_SHOULDER_INNER_LEFT, face],
    ['ravens-shoulder-inner-right', 'sleeve-right', RAVENS_SHOULDER_INNER_RIGHT, face],
  ];
  return bars.map(([id, surface, d, fill]) => ({ id, surface, d, clip: true, kind: 'fill', fill }));
}

function sleeveBands(fill: ColorRef): UniformLayer[] {
  return [
    ['ravens-sleeve-band-left', 'sleeve-left', RAVENS_SLEEVE_BAND_LEFT],
    ['ravens-sleeve-band-right', 'sleeve-right', RAVENS_SLEEVE_BAND_RIGHT],
  ].map(([id, surface, d]) => ({
    id,
    surface: surface as UniformSurface,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

export const RAVENS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'ravens',
  // Every kit strips the same generic model; what differs is only which token carries each color.
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Purple body over purple pants under the black shell. Black is `secondary` here, so the sleeve
    // band takes the token; the bar face and numeral face are white, which this palette cannot
    // supply, so both take the literal.
    home: {
      helmetColor: 'secondary',
      layers: [...shoulderBars(RAVENS_WHITE), ...sleeveBands('secondary'), ...decal()],
      number: { fill: RAVENS_WHITE, outline: 'accent', outlineWidth: 16 },
    },
    // White body over purple pants. The away palette moves white into primary and purple into
    // secondary, so the bar face and numeral face swap onto `secondary` and the black shell and
    // sleeve band — which this palette has no token for at all — take the literal.
    away: {
      helmetColor: RAVENS_BLACK,
      pantsColor: 'secondary',
      layers: [...shoulderBars('secondary'), ...sleeveBands(RAVENS_BLACK), ...decal()],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 16 },
    },
    // Black body over purple pants. Black is this kit's primary, so the shell needs no override,
    // and purple has moved into secondary — which is what the reference paints the sleeve band.
    'black-alt': {
      pantsColor: 'secondary',
      layers: [...shoulderBars(RAVENS_WHITE), ...sleeveBands('secondary'), ...decal()],
      number: { fill: RAVENS_WHITE, outline: 'accent', outlineWidth: 16 },
    },
  },
};
