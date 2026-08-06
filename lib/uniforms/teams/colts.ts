import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Indianapolis' two archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/colts (home is that sheet's row-1 figure 3, away its row-2 figure 1; the black
// alternate and the preseason kit in that composite are not in depth's archive). Shoulder paths
// use the outer 588-wide mannequin space; the helmet decal stays in raw helmet coordinates
// (x:139-802, y:65-674). Right paths mirror the left across the centerline x=294 (588 - x).
//
// The construction is spare: a bare white shell carrying only the horseshoe, two canted shoulder
// bars per sleeve, and plain numerals. No helmet stripe, no collar trim, and no pant stripe — the
// reference's white pants are unbroken from hip to sock — so both kits strip most of the generic
// model rather than recoloring it.

// White is a literal on both kits. The home palette is navy over speedway grey with accent ===
// secondary (ESPN supplies only two colors), so no token resolves to the shell, the pants, the
// bars or the numerals; resolving any of them from `accent` would paint them grey.
export const COLTS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// this path is a contour trace of the club's helmet mark, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. It is a literal reproduction of a
// third-party mark and is expected to be REPLACED by original stylized geometry before this kit is
// treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The cleanest trace of the set so far, and the reason is shape character rather than size: a
// horseshoe is one bold closed band with no counter and no thin linework, so the 35x37px source
// survives where the Falcons' falcon and the Seahawks' keyline shredded. Traced from the helmet
// bbox (x 56-162, y 290-387 in the reference) mapped onto the raw helmet space at ~6.2x.
export const COLTS_DECAL_HORSESHOE_PATH =
  'M337.6,114.7 L355.0,114.7 L355.0,116.5 L359.3,118.9 L369.5,121.4 L373.1,126.2 L375.5,134.0 L375.5,141.3 L373.1,146.1 L372.5,152.8 L367.7,158.8 L364.7,166.7 L361.7,168.5 L359.3,175.2 L355.6,178.8 L353.8,186.6 L349.0,192.7 L347.2,203.6 L343.0,210.2 L340.6,233.2 L343.0,253.2 L346.6,257.4 L349.0,265.2 L353.8,270.1 L355.6,275.5 L360.5,279.1 L362.9,283.4 L365.9,284.6 L368.9,288.8 L375.5,291.2 L377.9,294.9 L385.7,296.7 L390.5,300.3 L396.6,302.1 L431.5,302.1 L440.5,296.7 L448.3,295.5 L451.3,291.2 L456.1,289.4 L468.2,277.9 L469.4,274.9 L474.8,270.1 L476.6,264.6 L479.6,262.2 L486.8,240.5 L485.6,218.1 L481.4,209.6 L480.2,198.7 L475.4,192.1 L474.2,184.8 L470.0,180.0 L468.2,173.3 L463.3,167.9 L462.1,163.7 L457.9,160.0 L456.1,152.8 L451.9,146.7 L450.7,132.2 L451.9,128.6 L457.9,121.4 L465.8,119.5 L473.6,114.7 L491.0,114.7 L491.6,118.3 L496.4,125.6 L498.2,133.4 L497.0,138.9 L485.6,141.3 L483.8,143.1 L483.8,146.7 L487.4,154.0 L492.2,158.2 L494.6,163.7 L497.6,165.5 L500.1,173.3 L504.3,177.0 L505.5,183.6 L510.3,191.5 L511.5,201.2 L513.3,204.2 L516.9,206.0 L516.9,263.4 L512.1,266.5 L509.7,277.9 L506.1,282.2 L504.9,287.6 L485.6,313.0 L480.8,315.4 L477.8,319.7 L473.0,321.5 L469.4,325.7 L463.3,327.5 L459.7,331.1 L450.1,333.0 L447.1,338.4 L437.5,338.4 L436.9,336.6 L434.5,336.6 L433.9,338.4 L380.3,338.4 L379.1,334.8 L376.7,333.0 L368.3,331.7 L364.7,328.1 L356.2,325.1 L352.6,320.3 L350.2,320.3 L335.8,305.8 L335.2,303.3 L331.6,301.5 L329.2,296.1 L325.0,293.1 L323.1,286.4 L318.3,281.0 L317.1,273.7 L312.9,267.1 L310.5,251.3 L306.3,247.1 L306.3,228.4 L310.5,221.1 L312.9,201.8 L317.1,194.5 L318.9,184.8 L323.1,180.6 L325.6,171.5 L329.2,169.1 L337.0,154.0 L342.4,149.2 L342.4,141.3 L338.2,139.5 L332.2,141.3 L329.8,135.9 L330.4,123.8 L337.6,115.3 Z';

// Two bars per sleeve, canted with the shoulder. Measured on the home figure (jersey top y=437,
// sleeve hem y=502, figure center x=516.5, so scaleY = 191/65 and scaleX = 264/84.5). Both bars
// are 7.5 reference px across — about 24 mannequin units — and lean inboard at 0.2 px of x per px
// of y: the inner bar's left edge runs reference x465 @ y443 to x471 @ y474, the outer x452 @ y448
// to x457 @ y474. Take the width from a mid-sleeve row, not the top one: at the shoulder the bars
// are clipped by the jersey edge and measure 5-6px, which renders them as thin slashes.
// The away figure carries the identical pair 514px lower and 408px left, in navy.
export const COLTS_SHOULDER_BAR_INNER_LEFT = 'M133,401 L157,401 L176,492 L152,492 Z';
export const COLTS_SHOULDER_BAR_INNER_RIGHT = 'M455,401 L431,401 L412,492 L436,492 Z';
export const COLTS_SHOULDER_BAR_OUTER_LEFT = 'M93,415 L116,415 L132,492 L109,492 Z';
export const COLTS_SHOULDER_BAR_OUTER_RIGHT = 'M495,415 L472,415 L456,492 L479,492 Z';

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

function shoulderBars(fill: ColorRef): UniformLayer[] {
  const bars: { id: string; surface: UniformSurface; d: string }[] = [
    {
      id: 'colts-shoulder-bar-inner-left',
      surface: 'sleeve-left',
      d: COLTS_SHOULDER_BAR_INNER_LEFT,
    },
    {
      id: 'colts-shoulder-bar-inner-right',
      surface: 'sleeve-right',
      d: COLTS_SHOULDER_BAR_INNER_RIGHT,
    },
    {
      id: 'colts-shoulder-bar-outer-left',
      surface: 'sleeve-left',
      d: COLTS_SHOULDER_BAR_OUTER_LEFT,
    },
    {
      id: 'colts-shoulder-bar-outer-right',
      surface: 'sleeve-right',
      d: COLTS_SHOULDER_BAR_OUTER_RIGHT,
    },
  ];
  return bars.map((bar): UniformLayer => ({ ...bar, clip: true, kind: 'fill', fill }));
}

function horseshoe(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'colts-helmet-horseshoe',
      surface: 'helmet',
      d: COLTS_DECAL_HORSESHOE_PATH,
      clip: true,
      kind: 'fill',
      fill,
      fillRule: 'evenodd',
    },
  ];
}

export const COLTS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'colts',
  // Both kits share the white shell and white pants; only the body color and which token carries
  // navy differ, so the shell/pants live in defaults rather than being restated per kit.
  defaults: {
    helmetColor: COLTS_WHITE,
    pantsColor: COLTS_WHITE,
    removeLayerIds: GENERIC_STRIPPED,
  },
  kits: {
    // Royal body: the palette's own primary is the navy, so the horseshoe resolves from `primary`
    // and the bars and numerals take the white literal.
    home: {
      layers: [...horseshoe('primary'), ...shoulderBars(COLTS_WHITE)],
      number: { fill: COLTS_WHITE, outline: COLTS_WHITE, outlineWidth: 10 },
    },
    // White body: the away palette moves white into primary and navy into secondary, so the same
    // painted result needs the inverse token on every navy element.
    away: {
      layers: [...horseshoe('secondary'), ...shoulderBars('secondary')],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
  },
};
