import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Philadelphia's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/eagles (home is that sheet's row-1 figure 1, kelly green its row-1 figure 3,
// black alternate its row-1 figure 5, away its row-2 figure 1). Right paths mirror the left across
// the centerline x=294.
//
// The current kits are one construction: a deep collar yoke and a solid band at the sleeve hem. The
// kelly-green throwback drops the cuff entirely — a column down its sleeve runs unbroken kelly from
// shoulder to hem — and keeps only the collar. No helmet stripe, no pant stripe on any kit.
//
// APPROXIMATE, and flagged: the kelly-green kit's collar color is taken from the composite at
// thumbnail scale rather than sampled, so it is the one color assignment here not measured. Its
// geometry is the measured one.
//
// Out of scope on every kit: the chest wordmark, the league shield, the collar tab, the eagle-head
// mark on each sleeve, and the shoulder numerals.

// Black is a literal on the two current kits. Their palettes are green over silver with accent ===
// secondary on the home (ESPN supplies only two colors), so neither can resolve the collar yoke or
// the sleeve cuff, both of which the reference draws black. The black alternate reaches it through
// `primary`.
export const EAGLES_BLACK = '#000000';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The wing, traced from the home figure's shell (bbox x52-158, y28-134 in the reference) mapped
// onto the raw helmet space at ~6.25x. Two plain-union fills in paint order, never evenodd holes:
// the outline (black ∪ white, so the union carries the whole wing) under the white body. The
// feather lines the reference draws INSIDE the wing come for free — they are the gaps between the
// white components, and the outline layer shows through them.
//
// Unlike Detroit's, this keyline is a real trace rather than a grown mask: the outline here is
// black against a midnight-green shell, far enough apart in value to hold its own predicate.
export const EAGLES_DECAL_OUTLINE_PATH =
  'M533.0,152.6 L560.4,152.6 L598.7,164.1 L653.5,210.1 L686.3,223.7 L688.6,228.0 L654.2,217.2 L590.9,167.7 L576.0,161.2 L556.5,157.6 L453.3,162.7 L451.7,166.3 L461.9,169.1 L461.9,172.7 L354.8,172.0 L343.8,167.7 L339.9,167.7 L337.6,172.7 L353.2,185.7 L378.2,193.6 L374.3,196.4 L351.7,195.0 L347.0,200.7 L376.7,215.1 L393.1,216.5 L393.1,218.7 L382.9,220.1 L381.4,224.4 L394.7,233.0 L406.4,234.5 L408.7,243.1 L414.2,248.1 L447.0,256.0 L474.4,256.7 L468.2,262.5 L474.4,267.5 L522.9,267.5 L533.0,278.3 L555.7,286.9 L561.2,286.9 L572.9,279.0 L592.5,279.0 L605.8,291.2 L608.1,304.1 L600.3,301.3 L596.4,291.2 L590.9,286.9 L572.9,286.9 L566.7,293.4 L553.4,292.7 L535.4,286.9 L519.0,274.7 L463.5,269.7 L438.4,256.7 L408.7,252.4 L400.1,247.4 L375.1,241.7 L374.3,238.8 L386.1,233.8 L378.2,229.5 L365.7,229.5 L339.9,218.0 L343.8,215.1 L350.1,215.8 L350.9,210.1 L346.2,206.5 L336.0,205.8 L309.4,189.2 L310.2,186.4 L318.0,187.1 L332.9,192.8 L343.8,190.0 L340.7,184.2 L335.2,183.5 L311.0,167.0 L310.2,162.0 L355.6,167.7 L427.5,169.9 L433.8,164.1 L420.5,159.8 L421.2,157.6 L504.1,157.6 L532.3,153.3 Z M537.7,163.4 L571.4,164.8 L578.4,169.9 L587.8,171.3 L590.9,175.6 L597.2,176.3 L605.0,182.1 L642.5,215.8 L665.2,228.0 L676.1,228.7 L687.9,233.8 L691.8,238.8 L666.7,234.5 L648.8,223.7 L642.5,223.0 L610.4,200.0 L594.8,183.5 L572.1,171.3 L552.6,168.4 L497.9,171.3 L487.7,179.9 L465.0,182.8 L387.6,180.6 L385.3,182.8 L393.9,192.1 L426.7,200.0 L403.3,202.2 L403.3,206.5 L415.0,215.1 L382.9,211.5 L374.3,206.5 L364.2,205.0 L355.6,199.3 L387.6,204.3 L397.0,203.6 L399.4,200.0 L385.3,189.2 L371.2,188.5 L347.0,176.3 L468.9,177.0 L476.0,168.4 L537.0,164.1 Z M531.5,174.9 L569.0,175.6 L590.9,187.1 L622.2,215.1 L650.3,232.3 L665.2,238.8 L693.3,244.5 L697.2,255.3 L705.8,252.4 L716.8,264.6 L726.2,282.6 L725.4,290.5 L682.4,304.1 L665.2,304.9 L646.4,309.9 L641.7,305.6 L631.6,274.0 L614.4,260.3 L596.4,262.5 L590.1,258.2 L590.1,254.6 L596.4,254.6 L603.4,249.6 L601.8,246.0 L523.7,237.4 L521.3,233.0 L525.2,230.9 L558.1,230.9 L569.0,228.0 L493.2,219.4 L473.6,212.9 L477.5,207.9 L521.3,208.6 L535.4,207.2 L537.0,204.3 L422.0,194.3 L400.9,188.5 L504.1,186.4 L507.2,182.1 L500.2,177.8 L501.8,175.6 L530.7,175.6 Z M416.6,216.5 L437.7,218.0 L425.9,223.7 L433.8,233.0 L473.6,233.8 L451.0,237.4 L448.6,240.2 L451.0,244.5 L466.6,248.8 L504.1,251.0 L500.2,256.0 L501.8,259.6 L536.2,261.8 L547.9,274.0 L560.4,274.0 L568.2,268.2 L598.7,268.2 L617.5,285.5 L617.5,293.4 L623.7,304.9 L616.7,304.1 L609.7,287.6 L595.6,274.7 L580.0,272.5 L567.4,275.4 L560.4,281.2 L547.1,280.4 L541.6,275.4 L535.4,274.7 L525.2,263.9 L476.8,263.2 L485.4,258.2 L483.0,253.9 L421.2,246.0 L436.1,242.4 L438.4,238.8 L427.5,233.0 L396.2,228.0 L396.2,225.9 L414.2,224.4 L416.6,217.2 Z M471.3,239.5 L509.6,243.8 L487.7,245.3 L470.5,243.1 L468.2,241.7 L470.5,240.2 Z M452.5,149.7 L497.9,151.2 L481.4,153.3 L424.4,151.2 L451.7,150.5 Z M452.5,223.7 L478.3,224.4 L484.6,227.3 L445.5,227.3 L451.7,224.4 Z M533.0,144.0 L571.4,146.2 L522.1,146.9 L532.3,144.7 Z';
export const EAGLES_DECAL_BODY_PATH =
  'M533.0,152.6 L560.4,152.6 L598.7,164.1 L653.5,210.1 L686.3,223.7 L688.6,228.0 L654.2,217.2 L590.9,167.7 L576.0,161.2 L556.5,157.6 L453.3,162.7 L451.7,166.3 L461.9,169.1 L461.9,172.7 L354.8,172.0 L343.8,167.7 L339.9,167.7 L337.6,172.7 L353.2,185.7 L378.2,193.6 L374.3,196.4 L351.7,195.0 L347.0,200.7 L376.7,215.1 L393.1,216.5 L393.1,218.7 L382.9,220.1 L381.4,224.4 L394.7,233.0 L406.4,234.5 L408.7,243.1 L414.2,248.1 L447.0,256.0 L474.4,256.7 L468.2,262.5 L474.4,267.5 L522.9,267.5 L533.0,278.3 L555.7,286.9 L561.2,286.9 L572.9,279.0 L592.5,279.0 L605.8,291.2 L608.1,304.1 L600.3,301.3 L596.4,291.2 L590.9,286.9 L572.9,286.9 L566.7,293.4 L553.4,292.7 L535.4,286.9 L519.0,274.7 L463.5,269.7 L438.4,256.7 L408.7,252.4 L400.1,247.4 L375.1,241.7 L374.3,238.8 L386.1,233.8 L378.2,229.5 L365.7,229.5 L339.9,218.0 L343.8,215.1 L350.1,215.8 L350.9,210.1 L346.2,206.5 L336.0,205.8 L309.4,189.2 L310.2,186.4 L318.0,187.1 L332.9,192.8 L343.8,190.0 L340.7,184.2 L335.2,183.5 L311.0,167.0 L310.2,162.0 L355.6,167.7 L427.5,169.9 L433.8,164.1 L420.5,159.8 L421.2,157.6 L504.1,157.6 L532.3,153.3 Z M531.5,174.9 L569.0,175.6 L590.9,187.1 L622.2,215.1 L650.3,232.3 L665.2,238.8 L693.3,244.5 L697.2,255.3 L705.8,252.4 L716.8,264.6 L726.2,282.6 L725.4,290.5 L682.4,304.1 L665.2,304.9 L646.4,309.9 L641.7,305.6 L631.6,274.0 L614.4,260.3 L596.4,262.5 L590.1,258.2 L590.1,254.6 L596.4,254.6 L603.4,249.6 L601.8,246.0 L523.7,237.4 L521.3,233.0 L525.2,230.9 L558.1,230.9 L569.0,228.0 L493.2,219.4 L473.6,212.9 L477.5,207.9 L521.3,208.6 L535.4,207.2 L537.0,204.3 L422.0,194.3 L400.9,188.5 L504.1,186.4 L507.2,182.1 L500.2,177.8 L501.8,175.6 L530.7,175.6 Z M471.3,239.5 L509.6,243.8 L487.7,245.3 L470.5,243.1 L468.2,241.7 L470.5,240.2 Z M452.5,223.7 L478.3,224.4 L484.6,227.3 L445.5,227.3 L451.7,224.4 Z';

// The sleeve cuff, measured on the home figure (jersey top y=132, sleeve hem y=198, figure center
// x=96.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=30 crosses black
// y190-196 against a hem at y198, so the band ends flush. Extended outward to x=30 and past the hem
// to y=578 so the jersey clip trims it.
export const EAGLES_CUFF_LEFT = 'M30,545 H140 V578 H30 Z';
export const EAGLES_CUFF_RIGHT = 'M558,545 H448 V578 H558 Z';

// The collar, measured on the same figure: a yoke from reference (70,134) closing at (96,166), which
// maps to a vertex at y=481 — deeper than the generic chevron's y=455, so this kit needs its own
// path. About 6 reference px across the arm, or roughly 20 units perpendicular.
const EAGLES_COLLAR_PATH = 'M211,389 L294,481 L377,389';
const EAGLES_COLLAR_WIDTH = 20;

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
    ['eagles-cuff-left', 'sleeve-left', EAGLES_CUFF_LEFT],
    ['eagles-cuff-right', 'sleeve-right', EAGLES_CUFF_RIGHT],
  ].map(([id, surface, d]) => ({
    id,
    surface: surface as UniformSurface,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'eagles-collar',
      surface: 'collar',
      d: EAGLES_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: EAGLES_COLLAR_WIDTH,
    },
  ];
}

// The wing is white over a black outline on every kit — the same decal the club wears on all four
// shells — so neither color moves with the palette and both are literals.
function decal(): UniformLayer[] {
  return [
    {
      id: 'eagles-decal-outline',
      surface: 'helmet',
      d: EAGLES_DECAL_OUTLINE_PATH,
      clip: true,
      kind: 'fill',
      fill: EAGLES_BLACK,
    },
    {
      id: 'eagles-decal-body',
      surface: 'helmet',
      d: EAGLES_DECAL_BODY_PATH,
      clip: true,
      kind: 'fill',
      fill: '#FFFFFF',
    },
  ];
}

export const EAGLES_UNIFORMS: TeamUniformDefinition = {
  teamId: 'eagles',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Midnight green body and shell. Silver is both secondary and accent here, so it carries the
    // numeral keyline; the collar yoke and sleeve cuff are black, which this palette cannot supply,
    // and take the literal — as does the white numeral face.
    home: {
      layers: [...cuff(EAGLES_BLACK), ...collar(EAGLES_BLACK), ...decal()],
      number: { fill: '#FFFFFF', outline: EAGLES_BLACK, outlineWidth: 14 },
    },
    // White body under the green shell. The away palette moves white into primary and green into
    // secondary, so the numerals take the green while the collar and cuff stay black by literal.
    away: {
      helmetColor: 'secondary',
      layers: [...cuff(EAGLES_BLACK), ...collar(EAGLES_BLACK), ...decal()],
      number: { fill: 'secondary', outline: EAGLES_BLACK, outlineWidth: 14 },
    },
    // Black body and shell, so the collar and cuff would vanish into it — the reference trims this
    // kit in silver instead, which is its `accent`.
    'black-alt': {
      layers: [...cuff('accent'), ...collar('accent'), ...decal()],
      number: { fill: '#FFFFFF', outline: 'accent', outlineWidth: 14 },
    },
    // Kelly green, and the one kit with NO sleeve cuff — its sleeve runs unbroken to the hem. Collar
    // only, in the white this palette carries as `accent`. See the approximation noted above.
    'kelly-green': {
      layers: [...collar('accent'), ...decal()],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
