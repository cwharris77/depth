import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// New England's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/patriots (home is that sheet's row-2 figure 3, away its row-1 figure 1, Pat
// Patriot its row-1 figure 7 — boxed "worn in same games"). Right paths mirror the left across the
// centerline x=294.
//
// One construction throughout: three parallel bands running diagonally down each shoulder cap,
// outer/inner/outer, and nothing else. No collar trim, no helmet stripe, no pant stripe.
//
// The band COLORS are measured on three of the four kits and they are not a simple token swap:
// navy body wears red/white/red, white body wears red/navy/red, red body wears white/navy/white.
// So both the outer and inner colors are parameters — assuming either one is fixed renders one of
// the kits wrong, the same trap Denver's shoulder wedge sets.
//
// THE RIVALRIES KIT IS INFERRED — no figure of its own on the sheet. It takes the home pattern
// against its own palette.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "WE ARE ALL PATRIOTS"
// collar tab, the Super Bowl and USA-250 patches, the logo on each sleeve, and shoulder numerals.

// White is a literal on the home kit only. Its palette is navy over red with silver in accent, so
// nothing resolves to the middle band or the numeral face. The away carries white in `primary`, and
// Pat Patriot and Rivalries both carry it in `accent`.
export const PATRIOTS_WHITE = '#FFFFFF';

// The shoulder bands, measured on the home figure (jersey top y=901, sleeve hem y=967, figure center
// x=714.5, so scaleY = 191/66 and scaleX = 264/84.5). At reference y=913 the three run x650-656,
// x657-662 and x662-667; by y=937 each has shifted about 7px right, which is the slant. The set
// spans y908-938. Each band is ~19 units wide and leans ~22 units right over its 90-unit drop.
export const PATRIOTS_BANDS_LEFT = [
  'M92,404 L111,404 L133,493 L114,493 Z',
  'M111,404 L130,404 L152,493 L133,493 Z',
  'M130,404 L149,404 L171,493 L152,493 Z',
];
export const PATRIOTS_BANDS_RIGHT = [
  'M496,404 L477,404 L455,493 L474,493 Z',
  'M477,404 L458,404 L436,493 L455,493 Z',
  'M458,404 L439,404 L417,493 L436,493 Z',
];

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

function shoulderBands(outer: ColorRef, inner: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, string[]][] = [
    ['sleeve-left', PATRIOTS_BANDS_LEFT],
    ['sleeve-right', PATRIOTS_BANDS_RIGHT],
  ];

  for (const [surface, paths] of sides) {
    const side = surface === 'sleeve-left' ? 'left' : 'right';
    paths.forEach((d, i) => {
      out.push({
        id: `patriots-band-${i}-${side}`,
        surface,
        d,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? inner : outer,
      });
    });
  }

  return out;
}

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The mark, traced from the home figure's shell (bbox x37-159, y285-399 in the reference) mapped
// onto the raw helmet space at ~6.25x. Four plain-union fills in paint order: keyline, face, the
// two red streamers, star.
//
// The WHITE LAYER IS ONE COMPONENT, not the white trace. Traced white returns four components, and
// three of them are pieces of the keyline rather than the star — drawn on top they repaint the
// keyline over the face and swallow the chin. Only the component at reference (115-120, 303-308) is
// the star, and it is the only one this layer carries. The chin reading white is correct, not a
// gap: the reference draws the jaw white too.
//
// This mark is one of the few here whose source is a GIF; it was normalized to RGB before
// measuring. That matters for the predicates — the navy samples (3,18,51), so a blue-channel
// threshold tuned on the PNG sheets (b > 60) misses it entirely and the face comes back empty.
export const PATRIOTS_DECAL_KEYLINE_PATH =
  'M511.9,135.8 L537.8,137.1 L544.5,140.5 L543.9,144.5 L549.3,147.1 L560.2,145.8 L557.5,141.8 L561.5,140.5 L566.3,143.1 L566.3,149.1 L571.0,152.5 L584.6,151.8 L585.3,149.8 L579.9,147.1 L581.2,145.8 L588.0,148.5 L609.1,145.8 L608.4,151.1 L613.8,149.1 L613.8,145.1 L615.9,146.5 L615.2,151.1 L611.8,154.5 L605.7,154.5 L603.6,159.2 L604.3,167.8 L606.4,169.8 L609.8,167.2 L610.4,170.5 L606.4,175.8 L600.9,175.8 L598.9,179.9 L599.6,190.5 L605.0,189.2 L603.0,198.6 L596.9,196.5 L588.7,203.9 L588.0,213.9 L583.9,213.2 L589.4,222.6 L588.0,229.3 L583.9,229.9 L583.9,218.6 L579.2,207.9 L573.8,206.6 L569.7,214.6 L564.2,215.9 L563.6,209.2 L558.1,202.6 L560.2,198.6 L554.7,195.9 L545.2,197.2 L545.2,201.2 L534.4,209.9 L534.4,217.2 L528.2,218.6 L533.7,237.3 L524.8,233.3 L525.5,230.6 L528.9,231.3 L524.2,223.3 L519.4,223.3 L517.4,227.9 L514.7,226.6 L514.7,217.9 L508.5,217.9 L505.1,222.6 L503.1,212.6 L496.3,212.6 L495.0,218.6 L488.2,213.9 L487.5,207.2 L480.7,207.2 L478.7,213.2 L471.2,206.6 L473.2,204.6 L471.2,200.6 L476.6,194.5 L480.7,195.9 L479.3,198.6 L482.0,200.6 L489.5,200.6 L494.3,197.9 L493.6,193.9 L506.5,193.2 L508.5,188.5 L498.4,181.2 L500.4,177.2 L495.0,174.5 L477.3,175.2 L474.6,181.9 L466.4,185.9 L466.4,182.5 L472.5,178.5 L471.2,170.5 L486.8,164.5 L482.0,158.5 L484.8,155.8 L479.3,153.1 L461.7,153.8 L459.6,160.5 L455.6,151.1 L461.7,151.8 L473.2,140.5 L479.3,140.5 L475.9,144.5 L478.0,146.5 L489.5,147.1 L494.3,145.1 L494.3,139.8 L501.7,140.5 L511.3,136.5 Z M511.9,128.4 L543.2,129.1 L548.6,133.1 L571.0,134.4 L584.6,139.8 L612.5,139.1 L617.2,135.8 L622.0,137.8 L622.7,151.1 L613.2,183.9 L611.1,203.9 L595.5,217.2 L596.9,238.6 L591.4,242.6 L589.4,249.3 L590.7,263.3 L584.6,274.7 L576.5,280.0 L569.7,279.4 L567.6,274.7 L562.2,272.7 L535.7,248.0 L499.7,225.9 L472.5,219.3 L465.1,214.6 L446.0,213.9 L431.8,202.6 L393.7,203.9 L449.4,194.5 L459.6,189.2 L492.9,185.9 L488.8,189.9 L456.9,196.5 L444.0,202.6 L442.6,207.9 L484.8,216.6 L491.6,221.3 L499.7,222.6 L503.1,226.6 L511.3,227.3 L543.2,248.6 L568.3,274.7 L578.5,274.7 L586.7,264.7 L586.7,242.6 L595.5,232.6 L592.1,228.6 L591.4,215.2 L593.5,211.9 L600.2,209.9 L607.0,199.9 L608.4,183.9 L613.2,174.5 L618.6,143.8 L615.2,141.1 L574.4,142.5 L565.6,137.8 L541.1,133.1 L506.5,132.4 L486.1,137.1 L463.7,138.5 L450.8,145.1 L442.6,143.1 L437.2,147.8 L425.7,148.5 L462.3,134.4 L511.3,129.1 Z M472.5,162.5 L479.3,163.8 L436.5,175.2 L430.4,179.9 L422.9,180.5 L418.2,185.2 L408.7,185.9 L403.2,190.5 L390.3,190.5 L380.2,194.5 L376.1,198.6 L377.4,203.9 L369.3,202.6 L362.5,197.9 L347.5,199.2 L342.8,202.6 L318.3,203.9 L301.4,203.2 L294.6,199.2 L295.9,194.5 L304.1,188.5 L319.7,187.2 L340.1,179.2 L350.9,177.9 L317.7,190.5 L304.8,191.2 L301.4,195.9 L306.1,199.9 L326.5,200.6 L364.5,194.5 L390.3,184.5 L401.2,183.9 L406.6,179.2 L417.5,178.5 L422.9,173.8 L433.1,173.2 L439.3,168.5 L471.9,163.2 Z M444.0,147.8 L447.4,149.1 L452.2,158.5 L448.1,164.5 L435.9,165.8 L359.8,191.2 L344.8,191.9 L324.4,197.2 L310.9,195.9 L351.6,183.2 L374.0,172.5 L381.5,171.8 L385.6,167.8 L443.3,148.5 Z M416.8,149.1 L422.9,149.8 L391.0,163.8 L382.9,164.5 L362.5,175.2 L353.7,175.8 L364.5,172.5 L380.8,159.2 L386.9,161.8 L416.2,149.8 Z M452.8,174.5 L459.0,176.5 L456.9,186.5 L418.9,196.5 L393.1,196.5 L395.1,193.9 L405.3,193.2 L452.2,175.2 Z';
export const PATRIOTS_DECAL_FACE_PATH =
  'M511.9,135.8 L537.8,137.1 L544.5,140.5 L543.9,144.5 L549.3,147.1 L560.2,145.8 L557.5,141.8 L561.5,140.5 L566.3,143.1 L566.3,149.1 L571.0,152.5 L584.6,151.8 L585.3,149.8 L579.9,147.1 L581.2,145.8 L588.0,148.5 L609.1,145.8 L608.4,151.1 L613.8,149.1 L613.8,145.1 L615.9,146.5 L615.2,151.1 L611.8,154.5 L605.7,154.5 L603.6,159.2 L604.3,167.8 L606.4,169.8 L609.8,167.2 L610.4,170.5 L606.4,175.8 L600.9,175.8 L598.9,179.9 L599.6,190.5 L605.0,189.2 L603.0,198.6 L596.9,196.5 L588.7,203.9 L588.0,213.9 L583.9,213.2 L589.4,222.6 L588.0,229.3 L583.9,229.9 L583.9,218.6 L579.2,207.9 L573.8,206.6 L569.7,214.6 L564.2,215.9 L563.6,209.2 L558.1,202.6 L560.2,198.6 L554.7,195.9 L545.2,197.2 L545.2,201.2 L534.4,209.9 L534.4,217.2 L528.2,218.6 L533.7,237.3 L524.8,233.3 L525.5,230.6 L528.9,231.3 L524.2,223.3 L519.4,223.3 L517.4,227.9 L514.7,226.6 L514.7,217.9 L508.5,217.9 L505.1,222.6 L503.1,212.6 L496.3,212.6 L495.0,218.6 L488.2,213.9 L487.5,207.2 L480.7,207.2 L478.7,213.2 L471.2,206.6 L473.2,204.6 L471.2,200.6 L476.6,194.5 L480.7,195.9 L479.3,198.6 L482.0,200.6 L489.5,200.6 L494.3,197.9 L493.6,193.9 L506.5,193.2 L508.5,188.5 L498.4,181.2 L500.4,177.2 L495.0,174.5 L477.3,175.2 L474.6,181.9 L466.4,185.9 L466.4,182.5 L472.5,178.5 L471.2,170.5 L486.8,164.5 L482.0,158.5 L484.8,155.8 L479.3,153.1 L461.7,153.8 L459.6,160.5 L455.6,151.1 L461.7,151.8 L473.2,140.5 L479.3,140.5 L475.9,144.5 L478.0,146.5 L489.5,147.1 L494.3,145.1 L494.3,139.8 L501.7,140.5 L511.3,136.5 Z';
export const PATRIOTS_DECAL_STREAMERS_PATH =
  'M444.0,147.8 L447.4,149.1 L452.2,158.5 L448.1,164.5 L435.9,165.8 L359.8,191.2 L344.8,191.9 L324.4,197.2 L310.9,195.9 L351.6,183.2 L374.0,172.5 L381.5,171.8 L385.6,167.8 L443.3,148.5 Z M452.8,174.5 L459.0,176.5 L456.9,186.5 L418.9,196.5 L393.1,196.5 L395.1,193.9 L405.3,193.2 L452.2,175.2 Z';
export const PATRIOTS_DECAL_STAR_PATH =
  'M580.5,161.8 L583.3,169.8 L590.7,173.2 L583.3,177.9 L587.3,188.5 L577.8,179.9 L564.9,182.5 L570.4,175.8 L565.6,167.8 L573.8,168.5 L579.9,162.5 Z';

// Fixed art on every shell the club wears — navy, white, red and the Pat Patriot silver — so the
// mark takes literals rather than tokens. Sampled off the reference figure.
export const PATRIOTS_DECAL_NAVY = '#002244';
export const PATRIOTS_DECAL_RED = '#C60C30';

function decal(): UniformLayer[] {
  return (
    [
      ['patriots-decal-keyline', PATRIOTS_DECAL_KEYLINE_PATH, PATRIOTS_WHITE],
      ['patriots-decal-face', PATRIOTS_DECAL_FACE_PATH, PATRIOTS_DECAL_NAVY],
      ['patriots-decal-streamers', PATRIOTS_DECAL_STREAMERS_PATH, PATRIOTS_DECAL_RED],
      ['patriots-decal-star', PATRIOTS_DECAL_STAR_PATH, PATRIOTS_WHITE],
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

export const PATRIOTS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'patriots',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Navy body and shell, banded red/white/red. Red is `secondary`; white has no token in this
    // palette, so the middle band and the numeral face both take the literal.
    home: {
      layers: [...shoulderBands('secondary', PATRIOTS_WHITE), ...decal()],
      number: { fill: PATRIOTS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body under a silver shell, banded red/navy/red — the inner band picks up the body's
    // contrast rather than staying white. The away palette moves white into primary, navy into
    // secondary and red into accent, so every color here resolves from a token.
    away: {
      helmetColor: '#B0B7BC',
      layers: [...shoulderBands('accent', 'secondary'), ...decal()],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Red body, banded white/navy/white against it. Navy is `secondary` and white `accent`, so the
    // pattern inverts from the home kit without either color needing a literal. NO HELMET MARK —
    // this era wore the Pat Patriot logo, a different mark that no figure on the sheet draws.
    'pat-patriot': {
      layers: shoulderBands('accent', 'secondary'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
    // INFERRED — no figure on the sheet. Takes the home pattern against its own palette, which
    // carries white in `accent` and so needs no literal.
    'rivalries-2025': {
      layers: [...shoulderBands('secondary', 'accent'), ...decal()],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
