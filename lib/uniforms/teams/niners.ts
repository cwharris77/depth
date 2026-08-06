import { HELMET_CROWN_STRIPE_PATH } from './shared';
import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// San Francisco's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/49ers (home is that sheet's row-1 figure 1, Rivalries its row-1 figure 3, away
// its row-2 figure 1). Sleeve paths use the outer 588-wide mannequin space; the helmet decal stays
// in raw helmet coordinates (x:139-802, y:65-674). Right paths mirror the left across the
// centerline x=294 (mirroredX = 588 - x).
//
// Unusually for this set, all three kits are ONE construction with the tokens swapped: a crown
// stripe, three bands at the end of each sleeve, and the oval on the shell. Nothing else — no
// shoulder yoke, no collar trim, and no pant stripe on any of the three (the striped swatch beside
// each figure in the composite is the sock, not the pant). So the shared parts live in `defaults`
// and each kit override is just its colors.
//
// Out of scope on every kit, per the usual boundary: the "49ERS" chest wordmark, the league shield,
// and the Rivalries kit's collar and script marks.

// White is a literal on the home kit. Its palette is red over gold with accent === secondary (ESPN
// supplies only two colors), so no token resolves to the sleeve bands or the numerals — resolving
// either from `accent` would paint them gold.
export const NINERS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are a contour trace of the club's helmet mark, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. They are a literal reproduction of a
// third-party mark and are expected to be REPLACED by original stylized geometry before this kit is
// treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// Traced as three stacked silhouettes — ring, field, letters — rather than as regions with punched
// holes. The first attempt traced the field with the monogram as evenodd holes, and the letters'
// antialiased grey shading fell outside every predicate, so the "F" punched through to the black
// ring and rendered solid black. Painting each layer as a plain union of components and stacking
// them ring → field → letters removes the failure mode entirely: no layer here needs a fill rule.
// The reference's thin white ring between the black and the red survives only as two arcs at that
// size, so it is dropped rather than shipped asymmetric.
export const NINERS_DECAL_RING_PATH =
  'M417.8,161.3 L461.8,163.2 L482.2,169.4 L490.9,170.0 L499.6,175.0 L510.7,177.5 L515.7,181.8 L522.5,183.1 L526.2,187.4 L533.0,189.3 L536.8,194.3 L541.7,196.1 L543.0,199.2 L547.3,201.7 L554.1,208.5 L556.6,213.5 L559.7,215.4 L562.2,223.5 L566.5,225.9 L566.5,263.8 L562.8,265.7 L560.3,273.8 L556.0,277.5 L554.1,281.9 L547.3,288.7 L544.2,289.9 L541.1,294.9 L536.8,296.1 L533.0,301.1 L526.2,303.0 L521.3,308.0 L513.8,309.8 L510.7,313.5 L504.5,314.2 L493.4,319.8 L481.6,321.6 L469.2,326.6 L443.8,327.8 L435.2,329.7 L415.9,329.7 L378.8,326.0 L371.3,322.2 L356.5,319.8 L348.4,314.8 L340.4,313.5 L336.6,309.8 L327.3,307.3 L323.6,303.0 L316.8,300.5 L313.7,296.8 L308.8,294.9 L293.9,280.6 L292.7,276.3 L287.7,270.7 L285.2,262.0 L281.5,260.1 L281.5,229.7 L285.8,227.2 L287.7,219.1 L292.0,214.8 L293.9,209.8 L302.6,201.1 L305.0,200.5 L307.5,196.1 L313.7,193.6 L316.8,189.9 L323.6,187.4 L327.3,183.1 L334.8,181.8 L341.0,176.9 L350.3,175.0 L359.6,170.0 L373.2,168.2 L383.7,163.8 L417.8,161.9 Z';
export const NINERS_DECAL_FIELD_PATH =
  'M412.8,170.6 L451.3,171.3 L461.8,173.1 L468.6,176.2 L481.6,177.5 L489.7,181.8 L499.6,183.7 L503.3,187.4 L510.7,189.3 L514.5,193.6 L520.7,195.5 L524.4,200.5 L527.5,201.1 L529.9,205.4 L534.3,207.9 L536.1,211.6 L541.7,216.0 L543.6,222.2 L548.5,229.0 L550.4,242.1 L548.5,262.0 L544.2,267.6 L541.7,274.4 L536.8,278.1 L536.1,280.6 L527.5,289.3 L525.6,289.3 L520.0,295.5 L514.5,297.4 L511.4,301.1 L505.2,302.4 L501.4,306.1 L490.9,308.6 L484.1,312.9 L471.1,314.2 L463.7,317.9 L452.5,319.8 L399.2,319.8 L387.4,317.9 L380.6,314.2 L365.1,312.3 L359.6,308.0 L351.5,307.3 L347.2,303.0 L338.5,300.5 L335.4,296.1 L330.4,294.9 L326.7,290.6 L322.4,288.7 L313.7,280.0 L310.0,272.5 L306.3,269.4 L305.0,263.2 L300.1,253.9 L300.1,236.5 L304.4,229.0 L306.9,220.3 L310.6,217.2 L313.1,211.6 L331.7,194.9 L336.0,194.3 L341.0,188.7 L348.4,187.4 L352.8,183.1 L360.8,182.4 L368.2,177.5 L382.5,176.2 L394.9,171.9 L412.8,171.3 Z';
export const NINERS_DECAL_LETTERS_PATH =
  'M407.3,188.0 L433.9,189.3 L437.6,191.1 L441.3,191.1 L445.1,189.3 L459.9,189.9 L461.2,204.2 L459.3,207.3 L450.0,206.7 L443.8,201.7 L437.0,201.1 L430.2,196.1 L424.0,194.9 L402.3,194.9 L399.2,196.1 L392.4,202.3 L392.4,206.7 L394.3,208.5 L429.0,209.2 L432.1,211.0 L437.6,211.0 L443.8,214.1 L453.7,216.0 L460.6,222.2 L461.2,227.8 L464.9,233.4 L459.3,247.1 L456.8,249.5 L450.6,251.4 L446.9,255.8 L443.8,257.0 L425.2,257.6 L422.1,260.7 L413.5,261.4 L398.6,257.6 L390.5,257.6 L386.8,255.8 L381.9,255.8 L376.9,262.0 L369.5,263.2 L367.0,260.1 L368.2,252.7 L367.6,241.5 L371.3,235.9 L378.2,239.0 L381.9,244.6 L389.9,246.4 L394.3,250.2 L412.2,253.3 L419.0,252.7 L419.7,248.3 L417.2,245.2 L409.8,244.6 L406.0,242.7 L406.0,239.0 L408.5,236.5 L418.4,237.7 L433.3,237.1 L442.0,241.5 L442.0,244.6 L434.5,245.2 L430.2,247.7 L430.2,249.5 L433.3,250.8 L440.1,250.8 L442.6,248.3 L443.2,244.6 L446.9,242.7 L446.9,240.2 L443.2,233.4 L439.5,231.5 L431.4,231.5 L424.0,229.7 L400.5,230.3 L385.6,225.9 L376.9,226.6 L373.8,225.3 L372.6,222.8 L368.2,219.7 L365.8,211.0 L368.9,202.9 L372.6,201.7 L375.7,196.1 L384.3,194.9 L391.2,189.9 L407.3,188.7 Z M475.4,253.3 L479.1,254.5 L480.4,256.4 L480.4,284.3 L477.9,287.5 L475.4,288.1 L474.2,286.8 L471.7,280.0 L466.8,275.6 L458.7,273.8 L443.2,273.8 L437.0,278.1 L436.4,286.2 L443.2,294.3 L451.9,296.8 L451.9,303.0 L450.6,304.8 L446.3,303.0 L437.6,302.4 L402.9,303.0 L401.7,296.8 L412.2,294.9 L417.2,291.8 L418.4,288.7 L417.8,273.8 L419.7,270.1 L433.9,265.1 L451.3,266.3 L453.7,269.4 L457.5,270.1 L458.7,267.6 L456.8,266.3 L471.1,263.2 L473.6,255.1 L475.4,253.9 Z M477.9,234.6 L484.1,236.5 L502.1,236.5 L503.3,235.3 L507.6,235.3 L510.7,241.5 L511.4,254.5 L510.1,258.2 L505.8,261.4 L502.7,248.3 L499.0,245.2 L471.7,244.6 L470.5,240.9 L474.8,237.7 L476.0,235.3 L477.9,235.3 Z';

// The mark's black keyline does not recolor when the shell changes from gold to black — it stays
// black on both, so it cannot resolve from any kit's tokens. Sampled from the GUD composite.
export const NINERS_DECAL_BLACK = '#141414';

// Three bands at the end of each sleeve. Measured on the home figure (jersey top y=132, sleeve hem
// y=196, figure center x=101.5, so scaleY = 191/64 and scaleX = 264/84.5): reference y158-162,
// y169-173 and y179-184, all spanning x20-37. Extended outward to x=30 so the jersey clip trims
// them flush at the sleeve edge.
export const NINERS_STRIPE_TOPS = [460, 493, 524];
export const NINERS_STRIPE_HEIGHT = 13;
export const NINERS_SLEEVE_X_LEFT = [30, 92];
export const NINERS_SLEEVE_X_RIGHT = [496, 558];

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

function sleeveStripes(fill: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', NINERS_SLEEVE_X_LEFT],
    ['sleeve-right', NINERS_SLEEVE_X_RIGHT],
  ];

  NINERS_STRIPE_TOPS.forEach((top, i) => {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `niners-sleeve-stripe-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${top + NINERS_STRIPE_HEIGHT} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill,
      });
    }
  });

  return out;
}

// Ring, field, letters — painted in that order, each a plain union (see the trace note above).
function ovalDecal(field: ColorRef): UniformLayer[] {
  const parts: { id: string; d: string; fill: ColorRef }[] = [
    { id: 'niners-decal-ring', d: NINERS_DECAL_RING_PATH, fill: NINERS_DECAL_BLACK },
    { id: 'niners-decal-field', d: NINERS_DECAL_FIELD_PATH, fill: field },
    { id: 'niners-decal-letters', d: NINERS_DECAL_LETTERS_PATH, fill: NINERS_WHITE },
  ];
  return parts.map((layer): UniformLayer => ({
    ...layer,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
  }));
}

function crownStripe(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'niners-helmet-crown-stripe',
      surface: 'helmet',
      d: HELMET_CROWN_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill,
    },
  ];
}

export const NINERS_UNIFORMS: TeamUniformDefinition = {
  teamId: '49ers',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Gold shell and gold pants under a red body. The oval's field is this palette's own primary,
    // and the crown stripe takes the same red.
    home: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      layers: [...crownStripe('primary'), ...ovalDecal('primary'), ...sleeveStripes(NINERS_WHITE)],
      number: { fill: NINERS_WHITE, outline: NINERS_WHITE, outlineWidth: 10 },
    },
    // White body over the same gold shell and pants. The away palette moves white into primary and
    // red into secondary, so every red element takes the inverse token and the bands — white at
    // home — become red here.
    away: {
      helmetColor: 'accent',
      pantsColor: 'accent',
      layers: [
        ...crownStripe('secondary'),
        ...ovalDecal('secondary'),
        ...sleeveStripes('secondary'),
      ],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // Rivalries is black on black with a black shell: the only kit of the three whose helmet and
    // pants take primary. Its numerals are the one place in this module where a keyline is really
    // visible in the reference — red on a gold trim, thin enough to need a narrow width.
    'rivalries-2025': {
      layers: [...crownStripe('accent'), ...ovalDecal('accent'), ...sleeveStripes('accent')],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
