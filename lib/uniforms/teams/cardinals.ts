import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Arizona's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/cardinals. Construction geometry — the shoulder bars and sleeve bands — is
// redrawn from that reference rather than traced; the helmet decal is the documented exception
// (see the provenance note below). Shoulder, sleeve and pant paths use the outer 588-wide
// mannequin space; helmet paths stay in raw helmet coordinates (x:139-802, y:65-674). Right-side
// paths mirror the left across the jersey centerline x=294 (mirroredX = 588 - x).
//
// Arizona's construction is unusually spare: no helmet stripe on any kit, no shoulder yoke, and no
// contrasting collar. Every kit therefore strips most of the generic model rather than recoloring
// it, which is why GENERIC_STRIPPED is shared across all four.

// The away number's black keyline is a construction color with no token — that kit's accent is
// Arizona's gold (#FFB612), which appears nowhere on it. Black sampled from the GUD composite.
export const CARDINALS_NUMBER_KEYLINE = '#101820';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Arizona Cardinals logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// Traced as four color regions rather than a keyline (the Seahawks approach), which survives the
// ~61x45px source far better: a filled region degrades gracefully where a thin line breaks up.
// Painted in the order below — keyline, body, eye, beak — and each path carries its own holes as
// extra subpaths, so every layer must render with fill-rule evenodd to keep them open.
export const CARDINALS_DECAL_KEYLINE_PATH =
  'M401.2,168.3 L406.0,168.9 L406.0,171.3 L400.6,178.0 L401.2,183.4 L439.4,186.4 L456.4,191.9 L466.7,193.1 L474.0,198.5 L482.5,199.1 L486.7,204.6 L493.4,204.6 L498.9,208.8 L498.9,210.6 L504.9,210.6 L508.6,215.4 L521.3,222.7 L531.6,233.0 L531.0,236.6 L533.4,236.0 L538.3,244.5 L543.7,249.3 L542.5,254.7 L545.0,254.7 L549.2,260.2 L549.8,269.2 L554.0,278.3 L555.9,288.0 L567.4,298.3 L574.7,310.9 L579.5,314.6 L580.1,320.6 L575.9,318.8 L573.5,312.2 L554.7,292.2 L544.3,291.6 L541.9,298.3 L539.5,298.9 L529.8,309.7 L520.1,310.3 L517.7,313.4 L517.7,318.2 L521.3,320.6 L553.4,326.7 L554.7,328.5 L546.2,329.7 L515.8,327.9 L512.8,329.7 L512.2,336.3 L517.7,343.6 L517.7,359.3 L520.1,364.1 L528.6,362.9 L535.9,356.9 L543.1,355.7 L554.7,350.2 L571.0,349.0 L582.0,350.8 L584.4,344.2 L588.6,345.4 L588.6,349.6 L579.5,352.7 L571.6,352.0 L560.7,354.5 L555.3,353.3 L553.4,355.1 L555.9,355.7 L532.8,365.3 L508.0,387.1 L500.1,401.0 L495.2,404.0 L493.4,411.9 L475.8,396.8 L469.1,394.4 L466.1,390.1 L461.2,388.9 L458.2,384.1 L450.9,381.7 L447.3,377.4 L443.0,376.8 L439.4,372.0 L432.1,370.8 L427.9,366.0 L420.0,364.7 L415.1,359.9 L404.8,358.7 L397.6,353.9 L386.0,352.0 L383.0,348.4 L381.2,337.5 L377.5,335.7 L374.5,329.7 L364.8,321.2 L363.0,317.0 L352.7,306.1 L350.9,301.3 L346.0,298.3 L343.6,291.0 L339.9,287.4 L338.1,277.7 L334.5,273.5 L332.0,260.2 L319.3,250.5 L309.6,240.8 L301.7,228.1 L295.7,223.9 L296.3,220.9 L301.1,218.5 L307.8,207.0 L313.2,202.8 L316.3,197.3 L327.2,199.7 L330.8,204.0 L338.1,205.8 L342.4,210.0 L351.5,211.8 L353.9,214.2 L350.9,216.7 L341.1,216.7 L337.5,213.0 L327.2,214.2 L325.4,216.0 L326.0,220.3 L330.8,222.7 L334.5,228.1 L343.0,230.0 L344.8,234.8 L335.7,236.0 L331.4,231.8 L323.6,230.6 L321.7,231.2 L323.0,240.8 L328.4,241.4 L329.6,245.7 L335.7,248.1 L337.5,252.3 L342.4,253.5 L346.0,258.4 L352.7,260.2 L356.9,265.0 L364.8,266.8 L368.4,271.1 L376.3,272.3 L382.4,277.7 L391.5,279.5 L390.3,281.9 L381.2,281.9 L378.1,279.5 L370.9,280.1 L367.2,285.0 L360.6,285.0 L360.6,291.0 L368.4,304.9 L381.8,319.4 L384.8,320.6 L386.0,324.2 L390.9,327.3 L391.5,333.3 L395.7,337.5 L397.6,343.0 L404.8,344.8 L410.9,349.6 L419.4,350.2 L424.9,355.1 L432.1,356.3 L435.2,359.9 L442.4,361.7 L447.3,366.0 L454.6,367.2 L460.6,358.7 L471.6,356.3 L474.6,338.8 L472.8,315.2 L468.5,309.7 L466.7,300.7 L462.5,295.8 L460.0,287.4 L455.8,283.7 L454.6,277.1 L449.7,274.1 L441.8,257.8 L437.6,255.9 L429.1,242.0 L419.4,232.4 L417.0,226.3 L425.5,228.7 L446.7,230.0 L452.1,234.8 L462.5,236.6 L465.5,240.8 L471.6,242.0 L475.8,246.9 L481.3,248.1 L483.1,251.7 L487.9,254.1 L497.0,264.4 L502.5,266.8 L506.1,271.1 L511.0,272.3 L514.6,277.1 L523.7,278.3 L529.8,283.7 L543.1,282.5 L547.4,279.5 L547.4,271.7 L544.3,260.2 L540.1,255.3 L536.5,245.1 L512.8,220.9 L498.2,213.6 L495.2,209.4 L486.7,207.6 L482.5,203.4 L460.0,196.1 L429.1,190.7 L394.5,188.8 L353.9,182.8 L337.5,176.2 L339.3,173.1 L341.8,173.1 L353.9,174.9 L367.8,179.8 L387.2,180.4 L401.2,168.9 Z M467.3,252.3 L470.3,252.9 L477.0,262.0 L484.9,268.0 L488.5,268.6 L492.8,274.7 L497.0,276.5 L497.0,281.3 L489.8,285.0 L493.4,291.0 L506.7,297.0 L517.0,291.6 L519.5,286.2 L526.1,285.6 L528.0,288.0 L527.4,294.6 L513.4,306.7 L509.8,307.9 L497.0,307.3 L491.6,303.1 L485.5,301.3 L481.9,295.8 L477.6,294.0 L475.2,288.6 L471.6,286.8 L469.7,278.3 L465.5,273.5 L463.7,255.9 L467.3,252.9 Z M512.8,364.1 L517.7,365.3 L517.7,369.0 L512.8,369.6 L512.8,364.7 Z M494.0,382.9 L497.6,384.1 L497.6,388.3 L494.0,388.3 L494.0,383.5 Z';
export const CARDINALS_DECAL_BODY_PATH =
  'M333.3,178.0 L339.3,178.0 L352.1,183.4 L392.1,189.5 L437.6,193.1 L463.1,197.9 L469.7,201.5 L480.7,204.0 L485.5,208.2 L494.6,210.6 L497.6,214.2 L513.4,222.7 L531.6,240.2 L543.7,261.4 L545.6,277.7 L541.3,280.7 L530.4,281.3 L524.9,277.7 L517.7,277.1 L499.5,264.4 L487.9,252.9 L484.9,252.3 L481.9,247.5 L476.4,245.7 L472.8,241.4 L466.7,240.2 L463.7,236.0 L454.0,234.2 L446.1,228.7 L429.1,227.5 L415.1,223.3 L413.3,224.5 L413.9,226.9 L423.6,237.2 L437.0,256.5 L441.2,259.6 L449.1,274.7 L453.4,277.7 L455.2,285.0 L459.4,288.6 L460.6,294.6 L465.5,301.3 L466.7,309.1 L471.6,317.6 L472.2,335.1 L469.7,347.2 L466.1,353.3 L461.2,353.3 L455.8,350.2 L446.1,355.1 L443.7,358.7 L438.2,358.7 L434.6,355.1 L426.1,353.9 L421.2,349.6 L413.9,349.0 L406.7,344.2 L400.6,343.6 L393.9,334.5 L391.5,326.7 L369.0,303.1 L363.0,292.2 L364.2,288.0 L373.3,288.6 L382.4,283.7 L390.3,283.7 L393.9,281.9 L393.3,278.9 L383.0,275.9 L376.9,271.1 L370.9,270.4 L366.0,266.2 L356.9,263.2 L353.9,259.6 L347.8,257.8 L343.0,252.3 L339.3,251.1 L332.0,242.6 L332.0,238.4 L336.3,237.8 L341.8,238.4 L346.6,241.4 L355.1,241.4 L356.9,239.6 L354.5,235.4 L347.8,234.2 L344.2,229.3 L336.3,226.9 L333.9,222.7 L328.4,219.1 L330.8,215.4 L341.1,218.5 L353.3,217.3 L355.7,216.0 L355.7,213.0 L333.3,204.0 L327.2,198.5 L319.3,196.7 L320.5,190.1 L333.3,178.6 Z M546.8,294.0 L549.2,296.4 L548.6,300.7 L551.6,300.1 L550.4,296.4 L552.8,294.6 L557.1,300.7 L560.1,301.3 L562.5,305.5 L568.0,309.1 L578.9,322.4 L578.9,327.9 L574.1,326.7 L572.9,329.1 L570.4,329.1 L569.8,327.3 L572.9,326.1 L570.4,318.8 L563.1,323.6 L562.5,326.1 L554.7,321.8 L557.7,320.0 L554.7,317.0 L545.0,317.0 L544.3,320.6 L536.5,315.8 L540.1,313.4 L540.1,310.9 L536.5,310.3 L534.0,312.2 L534.0,309.7 L538.3,306.7 L546.8,294.6 Z M526.1,328.5 L555.3,330.9 L561.9,338.1 L567.4,336.9 L573.5,341.2 L577.7,341.2 L580.7,343.6 L580.7,347.2 L554.0,347.8 L545.0,352.7 L534.6,353.9 L527.4,359.9 L525.5,359.3 L525.5,356.9 L528.0,353.3 L524.9,352.0 L523.1,355.1 L524.9,358.1 L522.5,361.1 L520.7,349.6 L518.3,341.8 L513.4,336.9 L513.4,331.5 L515.2,329.1 L526.1,329.1 Z M560.7,339.4 L565.6,340.0 L566.8,343.0 L548.0,344.8 L549.2,341.8 L560.7,340.0 Z';
export const CARDINALS_DECAL_EYE_PATH =
  'M541.3,382.9 L555.3,383.5 L559.5,388.9 L563.1,390.7 L564.4,393.8 L562.5,407.1 L549.2,416.1 L541.3,414.3 L538.3,410.1 L532.8,408.3 L531.0,404.0 L531.0,391.9 L536.5,387.7 L537.7,384.7 L541.3,383.5 Z M467.9,259.0 L469.7,259.0 L472.2,263.8 L476.4,266.2 L478.8,269.8 L486.1,272.3 L486.7,274.7 L481.9,278.3 L481.9,282.5 L487.9,291.6 L495.2,296.4 L497.0,299.5 L509.2,301.3 L509.2,303.7 L501.3,304.3 L495.8,299.5 L487.3,297.6 L484.3,292.8 L480.0,291.0 L478.2,285.6 L474.0,280.7 L472.8,272.9 L467.3,264.4 L467.9,259.6 Z M589.2,369.0 L593.5,369.6 L593.5,375.0 L592.3,376.2 L588.6,372.6 L589.2,369.6 Z M585.0,380.5 L588.0,381.7 L586.8,387.1 L582.6,385.3 L582.6,381.7 L585.0,381.1 Z';
export const CARDINALS_DECAL_BEAK_PATH =
  'M546.8,295.2 L553.4,295.8 L555.3,299.5 L558.3,300.7 L566.8,309.1 L568.0,312.8 L571.6,315.8 L574.1,322.4 L578.9,327.3 L579.5,334.5 L575.3,335.1 L571.0,329.7 L563.1,328.5 L556.5,323.6 L545.0,322.4 L537.1,318.8 L527.4,318.2 L523.7,315.8 L524.3,314.0 L530.4,312.8 L537.7,307.3 L544.3,300.7 L546.8,295.8 Z M518.3,330.9 L547.4,332.7 L557.1,337.5 L567.4,338.1 L572.9,344.2 L575.3,344.2 L576.5,346.0 L566.8,345.4 L548.6,347.8 L541.9,352.0 L531.0,355.1 L526.1,359.9 L523.1,359.9 L521.3,358.1 L521.3,340.6 L515.8,334.5 L515.8,332.7 L518.3,331.5 Z';

// Decal colors are fixed across kits: the mark does not recolor when the shell changes from white
// to black. Hexes sampled from the GUD composite (its cardinal reads #A61E2A against the official
// #97233F, so these run a step brighter than the brand values).
export const CARDINALS_DECAL_RED = '#A61E2A';
export const CARDINALS_DECAL_GOLD = '#F7B500';

// Home wears a short white bar canted across the top of each shoulder — the only mark on an
// otherwise solid red body.
export const CARDINALS_SHOULDER_BAR_LEFT = 'M156,403 L159,423 L91,440 L85,420 Z';
export const CARDINALS_SHOULDER_BAR_RIGHT = 'M432,403 L429,423 L497,440 L503,420 Z';

// Away and the black alternate replace that bar with two horizontal sleeve bands, split by the
// sleeve wordmark the trademark boundary keeps out of the model — hence the gap between them.
export const CARDINALS_SLEEVE_BAND_UPPER_LEFT = 'M32,485 L104,485 L104,499 L32,499 Z';
export const CARDINALS_SLEEVE_BAND_UPPER_RIGHT = 'M484,485 L556,485 L556,499 L484,499 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_LEFT = 'M32,540 L104,540 L104,554 L32,554 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_RIGHT = 'M484,540 L556,540 L556,554 L484,554 Z';

// Rivalries is a sandstone kit: a speckled cream body whose print has no stripe geometry, and a
// cream shell with a red-on-cream version of the mark. Cream and the numeral's orange offset are
// now the kit's curated primary/accent in lib/uniforms/data.ts.
const GENERIC_STRIPPED = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
  'generic-collar',
];

function decalLayers(body: ColorRef, keyline: ColorRef, eye: ColorRef, beak: ColorRef) {
  const shapes: { id: string; d: string; fill: ColorRef }[] = [
    { id: 'cardinals-decal-keyline', d: CARDINALS_DECAL_KEYLINE_PATH, fill: keyline },
    { id: 'cardinals-decal-body', d: CARDINALS_DECAL_BODY_PATH, fill: body },
    { id: 'cardinals-decal-eye', d: CARDINALS_DECAL_EYE_PATH, fill: eye },
    { id: 'cardinals-decal-beak', d: CARDINALS_DECAL_BEAK_PATH, fill: beak },
  ];
  return shapes.map((s): UniformLayer => ({
    ...s,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
    fillRule: 'evenodd',
  }));
}

function sleeveBands(fill: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string }[] = [
    {
      id: 'cardinals-sleeve-upper-left',
      surface: 'sleeve-left',
      d: CARDINALS_SLEEVE_BAND_UPPER_LEFT,
    },
    {
      id: 'cardinals-sleeve-upper-right',
      surface: 'sleeve-right',
      d: CARDINALS_SLEEVE_BAND_UPPER_RIGHT,
    },
    {
      id: 'cardinals-sleeve-lower-left',
      surface: 'sleeve-left',
      d: CARDINALS_SLEEVE_BAND_LOWER_LEFT,
    },
    {
      id: 'cardinals-sleeve-lower-right',
      surface: 'sleeve-right',
      d: CARDINALS_SLEEVE_BAND_LOWER_RIGHT,
    },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill', fill }));
}

export const CARDINALS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'cardinals',
  kits: {
    // Home: solid cardinal body and pants under a white shell, white shoulder bars, white numbers.
    // The generic pants stripe goes too — the reference's red pants are unbroken.
    //
    // Every white here is a literal, not `secondary`. Arizona's ESPN feed pairs cardinal with
    // black, so `toTeamColors` hands the home kit primary #97233F and secondary/accent #000000 —
    // there is no white token, and resolving these from `secondary` painted the bars and the
    // numeral keyline black. Same trap as Seattle's wolf grey.
    home: {
      helmetColor: '#FFFFFF',
      removeLayerIds: [
        ...GENERIC_STRIPPED,
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
      ],
      layers: [
        ...decalLayers(
          CARDINALS_DECAL_RED,
          CARDINALS_NUMBER_KEYLINE,
          '#FFFFFF',
          CARDINALS_DECAL_GOLD
        ),
        {
          id: 'cardinals-shoulder-bar-left',
          surface: 'sleeve-left',
          d: CARDINALS_SHOULDER_BAR_LEFT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'cardinals-shoulder-bar-right',
          surface: 'sleeve-right',
          d: CARDINALS_SHOULDER_BAR_RIGHT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
      ],
      // Plain white numerals: the generic outline would resolve to Arizona's black secondary and
      // ring them heavily, which the reference does not show.
      number: { fill: '#FFFFFF', outline: '#FFFFFF' },
    },
    // Away keeps the white shell over a white body, so the sleeve bands carry the kit instead of a
    // shoulder bar. Its numerals are red with a black keyline, which no token supplies.
    away: {
      helmetColor: 'primary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decalLayers(
          CARDINALS_DECAL_RED,
          CARDINALS_NUMBER_KEYLINE,
          '#FFFFFF',
          CARDINALS_DECAL_GOLD
        ),
        ...sleeveBands('secondary'),
      ],
      number: { fill: 'secondary', outline: CARDINALS_NUMBER_KEYLINE },
    },
    // The black alternate is the away construction on a black shell and body; here the white
    // numeral keyline does resolve from the kit's own accent.
    'black-alt': {
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decalLayers(
          CARDINALS_DECAL_RED,
          CARDINALS_NUMBER_KEYLINE,
          '#FFFFFF',
          CARDINALS_DECAL_GOLD
        ),
        ...sleeveBands('secondary'),
      ],
      number: { fill: 'secondary', outline: 'accent' },
    },
    // Rivalries: cream shell and body, and a red-on-cream mark rather than the full-color one. The
    // reference's numerals are red with an orange offset shadow; NumberStyle has no offset, so the
    // accent orange reads as an outline instead — the closest the model can express.
    'rivalries-2025': {
      helmetColor: 'primary',
      removeLayerIds: [
        ...GENERIC_STRIPPED,
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
      ],
      layers: decalLayers('secondary', 'secondary', 'primary', 'primary'),
      number: { fill: 'secondary', outline: 'accent' },
    },
  },
};
