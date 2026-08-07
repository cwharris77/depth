import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Houston's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/texans (home is that sheet's row-1 figure 1, away its row-1 figure 5, Battle Red
// its row-2 figure 3). Right paths mirror the left across the centerline x=294.
//
// This is a minimal uniform and the module is correspondingly small — that is the measurement, not
// an omission. No sleeve stripe, no pant stripe, no helmet stripe. The home kit carries a collar
// trim; the other two carry none at all, so their only construction is the numeral treatment.
//
// The club's bull-horn mark sits on each sleeve and is NOT authored — at about 13x18 reference px
// with a sub-2px white sliver through it, it is stroke-bearing detail well under the ~25px floor.
//
// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so
// there is an accurate starting point to hand-stylize against. They are a literal reproduction of
// a third-party mark and are expected to be REPLACED by original stylized geometry before this kit
// is treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// THE BULL IS TRACED FROM THE BATTLE RED FIGURE, NOT THE HOME OR AWAY ONE, and that is the whole
// trick. On a navy shell the bull's left half is EXACTLY the shell navy — both sample (3,24,37) —
// so no predicate separates mark from surface, and the white keyline that divides them breaks into
// four disconnected components, so it cannot be closed into a fillable region either. This module
// used to record that as the reason Houston could not have a decal at all.
//
// It is only a reason the mark cannot be traced FROM THAT FIGURE. The Battle Red kit (row-2
// figure 3) wears the same bull on a RED shell, drawn as one solid navy silhouette with no keyline
// and no red half — trivially separable. That silhouette is the shape the navy figures were hiding,
// and it registers against them: overlaid, the away figure's red half, white divider and star all
// land inside it in the right places. The general rule: WHEN A MARK SHARES ITS COLOR WITH ITS
// SHELL, LOOK FOR A KIT WHERE IT DOES NOT. A club that wears one mark on two shell colors has
// already solved the separation problem for you.
//
// The white keyline is then DERIVED, not traced — the silhouette grown by seven upsampled px and
// filled, painted under the navy, exactly as Detroit's is. The broken keyline never has to be
// reassembled because it never has to be read.
export const TEXANS_DECAL_NAVY = '#031825'; // sampled (3,24,37)
export const TEXANS_DECAL_RED = '#C80023'; // sampled (200,0,35)
export const TEXANS_DECAL_KEYLINE_PATH =
  'M426.7,109.7 L483.8,112.9 L507.2,119.2 L515.8,129.4 L508.8,136.4 L465.8,144.3 L417.3,162.3 L404.8,181.9 L404.8,200.0 L413.4,211.0 L451.0,236.1 L543.2,280.0 L615.1,305.9 L625.3,306.7 L633.9,312.2 L660.5,317.7 L682.4,317.7 L689.4,324.0 L681.6,332.6 L668.3,332.6 L651.9,338.1 L631.6,336.5 L623.0,331.8 L602.6,331.8 L592.5,327.1 L545.6,319.3 L521.3,319.3 L504.1,333.4 L499.4,332.6 L492.4,326.3 L434.5,299.7 L372.8,255.7 L354.8,236.1 L343.8,208.6 L347.8,184.3 L354.8,170.9 L343.8,181.1 L330.6,199.2 L329.0,211.8 L324.3,218.8 L330.6,262.0 L342.3,287.1 L375.1,324.0 L434.5,361.7 L441.6,361.7 L449.4,367.9 L472.8,375.0 L490.0,400.9 L540.1,433.1 L547.9,440.9 L549.5,450.3 L554.9,455.8 L554.9,465.2 L561.2,473.1 L562.8,481.7 L556.5,488.0 L439.2,449.5 L349.3,406.4 L313.4,381.3 L292.2,360.9 L261.0,312.2 L254.7,291.0 L249.2,243.1 L253.1,238.4 L254.7,218.0 L261.0,201.6 L278.9,174.9 L304.0,149.0 L329.8,130.1 L387.6,112.1 L425.9,110.5 Z';
export const TEXANS_DECAL_BULL_PATH =
  'M426.7,115.2 L483.8,118.4 L494.0,123.1 L505.7,123.9 L510.4,129.4 L480.7,138.0 L465.8,138.8 L438.4,149.8 L429.1,150.5 L407.2,166.2 L399.4,181.9 L399.4,200.8 L420.5,222.7 L451.0,241.6 L543.2,285.5 L587.8,299.7 L596.4,305.1 L606.5,305.9 L615.1,311.4 L625.3,312.2 L633.9,317.7 L660.5,323.2 L683.9,324.0 L681.6,327.1 L642.5,332.6 L623.0,326.3 L602.6,326.3 L592.5,321.6 L560.4,318.5 L554.2,314.6 L521.3,313.8 L508.8,320.8 L504.1,327.9 L499.4,327.1 L493.2,320.8 L483.8,319.3 L479.9,314.6 L471.3,313.0 L467.4,308.3 L434.5,294.2 L372.8,250.2 L354.0,225.9 L348.5,203.1 L361.0,167.0 L352.4,164.7 L338.4,181.1 L325.9,196.8 L323.5,211.8 L318.8,218.8 L325.1,262.0 L337.6,289.5 L384.5,336.5 L434.5,367.1 L441.6,367.1 L449.4,373.4 L472.8,380.5 L475.2,389.9 L488.5,405.6 L540.1,438.6 L546.3,456.6 L549.5,455.8 L549.5,465.2 L554.9,470.7 L556.5,482.5 L439.2,444.1 L349.3,400.9 L328.2,387.6 L297.7,360.9 L273.5,327.1 L266.4,312.2 L264.9,298.9 L260.2,291.0 L254.7,243.1 L258.6,238.4 L260.2,218.0 L266.4,201.6 L284.4,174.9 L304.0,154.5 L329.8,135.6 L360.3,123.9 L379.8,122.3 L387.6,117.6 L425.9,116.0 Z';
export const TEXANS_DECAL_RED_PATH =
  'M523.0,126.5 L544.3,133.4 L562.5,145.3 L574.7,164.9 L574.7,174.6 L563.3,195.6 L549.6,208.2 L522.2,222.8 L513.8,253.6 L501.7,274.5 L484.9,294.8 L477.3,315.0 L454.5,331.8 L479.6,289.2 L491.8,255.0 L492.5,212.4 L484.9,190.7 L516.1,176.7 L535.9,157.2 L535.1,141.1 L526.0,132.0 L519.2,130.0 L522.2,127.2 Z';
export const TEXANS_DECAL_WHITE_PATH =
  'M444.6,188.6 L481.9,190.7 L489.5,212.4 L489.5,250.1 L477.3,286.4 L459.9,318.5 L448.5,333.2 L450.7,340.9 L431.7,347.8 L443.1,337.4 L456.1,314.3 L468.2,285.0 L474.3,258.5 L474.3,229.8 L468.2,207.5 L459.1,192.8 L440.8,190.7 L443.9,189.3 Z M415.0,222.1 L425.6,239.6 L444.6,245.2 L431.0,250.8 L435.5,264.7 L419.6,254.3 L402.8,259.9 L405.9,245.9 L389.1,236.1 L389.9,233.3 L407.4,236.1 L412.7,230.5 L414.2,222.8 Z M548.1,329.0 L561.0,333.9 L564.8,342.3 L561.7,354.1 L552.6,359.0 L545.0,358.3 L535.9,349.9 L537.4,336.7 L547.3,329.7 Z M280.4,182.3 L291.1,197.7 L313.1,214.5 L299.4,208.9 L285.7,196.3 L279.7,187.9 L279.7,183.0 Z';

// Out of scope on every kit: the chest wordmark, the league shield, the "H-TOWN" collar tab, the
// sleeve mark above, and the shoulder numerals.

// White is a literal on the home kit only. Its palette is navy over red with accent === secondary
// (ESPN supplies only two colors), so nothing resolves to its white pants or white numeral face.
export const TEXANS_WHITE = '#FFFFFF';

// The collar, measured on the home figure (jersey top y=135, sleeve hem y=201, figure center
// x=100.5, so scaleY = 191/66 and scaleX = 264/84.5). The red band runs from reference (74,138) to
// (87,161) and mirrored. Extrapolated, the arms would not meet until y=186 — well past where the
// color stops — so this is two arcs, not a chevron, the same shape Jacksonville and Denver wear.
const TEXANS_COLLAR_LEFT = 'M211,392 L252,458';
const TEXANS_COLLAR_RIGHT = 'M377,392 L336,458';
const TEXANS_COLLAR_WIDTH = 10;

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

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    ['texans-collar-left', TEXANS_COLLAR_LEFT],
    ['texans-collar-right', TEXANS_COLLAR_RIGHT],
  ].map(([id, d]) => ({
    id,
    surface: 'collar' as const,
    d,
    clip: true,
    kind: 'stroke' as const,
    stroke,
    strokeWidth: TEXANS_COLLAR_WIDTH,
  }));
}

// Two constructions, because the reference draws two. On a NAVY shell the bull is outlined in
// white with a red right half and a white star; on the RED shell it is one solid navy silhouette
// with neither. Fixed art either way — the mark does not recolor with the palette, so it takes
// literals.
function decal(onNavyShell: boolean): UniformLayer[] {
  const shapes: [string, string, ColorRef][] = onNavyShell
    ? [
        ['texans-decal-keyline', TEXANS_DECAL_KEYLINE_PATH, TEXANS_WHITE],
        ['texans-decal-bull', TEXANS_DECAL_BULL_PATH, TEXANS_DECAL_NAVY],
        ['texans-decal-red', TEXANS_DECAL_RED_PATH, TEXANS_DECAL_RED],
        ['texans-decal-white', TEXANS_DECAL_WHITE_PATH, TEXANS_WHITE],
      ]
    : [['texans-decal-bull', TEXANS_DECAL_BULL_PATH, TEXANS_DECAL_NAVY]];

  return shapes.map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

export const TEXANS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'texans',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Navy body over white pants under the navy shell. Red is `secondary` and accent === secondary,
    // so red carries the collar and the numeral keyline while white — which this palette cannot
    // supply — takes the literal for both the pants and the numeral face.
    home: {
      pantsColor: TEXANS_WHITE,
      layers: [...collar('secondary'), ...decal(true)],
      number: { fill: TEXANS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body over navy pants under the navy shell, and no collar trim — the reference draws its
    // neckline in outline only. The away palette moves white into primary, navy into secondary and
    // red into accent, so the numerals invert to a navy face on a red keyline.
    away: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      layers: decal(true),
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Red body, pants and shell, all `primary`, and no collar trim. Navy moves to `secondary` and
    // white is available as `accent`, so the numerals need no literal here.
    'battle-red': {
      layers: decal(false),
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
  },
};
