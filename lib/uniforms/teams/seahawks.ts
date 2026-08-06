import { HELMET_CROWN_STRIPE_PATH } from './shared';
import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Seattle's four archived kits, redrawn from the Gridiron Uniform Database references in
// nfl-uniform-refs/seahawks (2025 season composite + the 1976 throwback era sheet). Construction
// geometry — stripes, bands, piping — is redrawn from those references rather than traced; the
// helmet decal is the documented exception and is a machine trace awaiting hand-stylizing (see
// TRACE-PENDING-STYLIZE below). Shoulder, sleeve and
// pant paths use the outer 588-wide mannequin space; helmet paths stay in raw helmet coordinates
// (x:139-802, y:65-674) so the renderer's translate(80.25 11) scale(0.5) group and per-surface
// clip put each mark on its intended surface. Right-side paths mirror the left across the jersey
// centerline x=294 (mirroredX = 588 - x) and are stored explicitly rather than transformed.

// Wolf Grey is a construction fact of the modern kit, not a runtime body color: `toTeamColors`
// sets accent = secondary, so an ESPN-sourced (home) palette carries no third token and 'accent'
// would resolve to action green. Hex from teamcolorcodes.
export const SEAHAWKS_WOLF_GREY = '#A5ACAF';

// The side-view shell carries no construction stripe — everything else on it is the decal. The
// composite's top-view inset is the only evidence of a center stripe: a slate wedge, narrow at the
// front and widening toward the back, tone-on-tone against the shell. GUD renders that inset as
// #2B394A on a #00132A shell; the live ESPN shell is a brighter #002A5C, so the sampled hex would
// read as a dark smudge rather than a lighter stripe. This value re-bases the inset's tonal step
// (+43/+38/+32) onto that brighter navy so the same relationship survives.
export const SEAHAWKS_HELMET_CENTER_COLOR = '#2B507C';
// The crown band this kit paints that color now lives in ./shared — San Francisco needs the same
// geometry, and it is a fact about the mannequin shell rather than about Seattle.

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// this path is a contour trace of the club's helmet mark, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. It is a literal reproduction of a
// third-party mark and is expected to be REPLACED by original stylized geometry before this kit is
// treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// Produced by contour-tracing the decal's white keyline (upsampled 10x, Douglas-Peucker simplified)
// and mapping it into raw helmet coordinates. The keyline is filled white and the shell reads
// through the counters, which is why no navy backing shape is needed on the navy home/away shells.
export const SEAHAWKS_HELMET_HAWK_PATH =
  'M439.9,222.4 L454.0,223.5 L457.2,227.5 L464.3,229.2 L467.0,233.6 L472.4,234.8 L478.3,238.7 L470.2,239.2 L467.5,238.1 L465.4,234.2 L458.3,232.5 L453.5,228.0 L442.1,226.9 L436.1,224.1 L439.9,223.0 Z M381.5,223.0 L404.8,223.0 L407.5,224.7 L398.8,226.9 L385.3,227.5 L363.6,226.3 L370.7,223.5 L381.5,223.5 Z M319.8,228.6 L342.5,228.6 L345.8,230.3 L330.1,233.1 L302.5,232.0 L309.5,229.2 L319.8,229.2 Z M520.5,244.8 L531.9,246.0 L535.2,249.9 L542.2,251.6 L549.2,257.2 L557.3,266.7 L562.8,280.7 L562.8,298.1 L558.4,303.7 L557.3,313.8 L553.0,316.6 L551.9,325.6 L548.1,328.4 L541.7,342.4 L533.5,350.8 L531.4,350.8 L532.5,346.3 L535.7,343.5 L537.3,338.5 L542.2,334.5 L549.8,317.7 L553.0,316.0 L554.1,307.1 L557.9,300.3 L558.4,277.9 L553.0,267.3 L542.2,256.1 L536.8,254.4 L533.5,250.5 L522.7,249.3 L520.0,247.7 L520.5,245.4 Z M375.5,246.0 L394.5,246.5 L398.8,249.9 L416.7,252.1 L418.8,256.1 L405.3,254.9 L399.3,250.5 L372.8,251.0 L350.6,260.5 L343.1,266.2 L339.8,271.2 L336.6,272.3 L329.0,282.4 L324.7,284.1 L324.7,290.3 L330.1,295.9 L335.0,297.0 L337.7,301.5 L351.2,308.8 L351.2,311.6 L346.9,315.5 L345.8,321.7 L341.4,326.1 L340.4,337.3 L342.5,341.3 L355.0,348.0 L299.8,351.4 L279.2,355.8 L250.0,357.0 L250.0,350.8 L284.1,350.2 L306.8,345.8 L331.7,344.6 L333.9,342.4 L331.2,336.2 L331.7,331.7 L338.2,318.3 L337.1,312.7 L332.2,311.0 L329.0,306.5 L324.7,305.4 L322.0,302.0 L309.5,296.4 L250.0,301.5 L250.0,291.9 L289.5,290.3 L312.8,285.2 L329.0,270.1 L340.9,262.2 L343.1,258.3 L349.0,256.6 L353.9,252.1 L375.5,246.5 Z M475.1,256.6 L477.8,256.6 L479.4,260.5 L482.7,262.8 L502.2,263.3 L511.9,267.8 L520.0,269.0 L530.3,276.2 L535.2,284.1 L535.7,303.7 L529.7,321.7 L523.8,321.7 L517.8,316.6 L506.5,315.5 L500.0,311.0 L483.2,309.9 L471.3,305.4 L412.3,305.4 L390.1,311.6 L380.4,318.3 L375.0,325.6 L372.3,332.9 L363.6,332.3 L365.8,324.5 L369.6,322.2 L371.2,317.7 L380.9,308.2 L396.6,302.6 L425.3,301.5 L449.1,296.4 L451.3,292.5 L456.2,289.1 L457.8,283.0 L462.1,277.4 L463.2,269.0 L473.5,257.2 L475.1,257.2 Z M381.5,264.5 L385.3,265.6 L382.0,276.8 L384.2,285.2 L392.3,289.1 L406.9,289.7 L413.4,291.9 L401.5,294.2 L377.2,293.6 L371.2,289.1 L365.3,288.0 L362.5,284.1 L358.2,281.8 L359.8,276.8 L367.4,272.9 L370.1,269.0 L375.5,268.4 L381.5,265.0 Z M443.2,274.6 L448.0,274.6 L449.1,277.4 L438.3,287.5 L423.7,289.1 L424.2,286.9 L433.4,284.1 L443.2,275.1 Z M421.0,313.2 L455.6,313.2 L462.7,314.4 L463.7,316.0 L413.4,318.3 L408.5,321.7 L402.6,322.8 L392.3,332.9 L386.4,331.7 L386.9,329.5 L397.2,320.0 L407.5,317.7 L414.0,314.4 L421.0,313.8 Z M476.2,334.5 L514.1,336.2 L520.5,343.0 L519.5,354.2 L521.6,358.1 L525.4,358.7 L524.9,361.5 L513.5,371.0 L511.9,370.4 L511.9,367.6 L516.2,360.3 L516.8,346.9 L515.1,341.8 L511.3,339.6 L428.6,339.0 L438.3,335.7 L476.2,335.1 Z M404.2,340.2 L416.7,341.8 L408.5,344.6 L369.6,344.6 L377.7,341.3 L404.2,340.7 Z';
export const SEAHAWKS_HELMET_HAWK_EYE_PATH =
  'M403.1,266.7 L406.4,267.3 L411.2,274.0 L410.2,277.9 L406.4,278.5 L400.4,275.7 L400.4,270.6 L403.1,267.3 Z';

// The shoulder sweep, shared by the home and away kits: a band tapering to a point near the
// sternum, arcing up over the shoulder and running down the outer sleeve to the hem (y≈557, just
// above the mannequin's cuff notch). Home paints it wolf grey, away navy; the geometry is
// identical in both references.
export const SEAHAWKS_SHOULDER_BAND_LEFT =
  'M222,448 C150,459 78,474 46,499 C38,514 37,536 37,557 L59,557 C62,532 72,512 121,498 C160,492 206,476 222,448 Z';
export const SEAHAWKS_SHOULDER_BAND_RIGHT =
  'M366,448 C438,459 510,474 542,499 C550,514 551,536 551,557 L529,557 C526,532 516,512 467,498 C428,492 382,476 366,448 Z';

// The action-green sleeve cap sits outboard of and above the band, separated from it by a thin
// strip of exposed body color. Both outer edges deliberately overshoot the sleeve silhouette so
// the jersey clip trims them flush instead of leaving a seam along the edge.
export const SEAHAWKS_SHOULDER_CAP_LEFT =
  'M46,423 C66,426 82,439 91,456 L91,462 C74,470 52,482 30,498 C22,472 30,440 46,423 Z';
export const SEAHAWKS_SHOULDER_CAP_RIGHT =
  'M542,423 C522,426 506,439 497,456 L497,462 C514,470 536,482 558,498 C566,472 558,440 542,423 Z';

// A short bar canted across the top of each shoulder yoke, inboard of the green cap.
export const SEAHAWKS_SHOULDER_BAR_LEFT = 'M156,411 L165,420 L109,439 L99,430 Z';
export const SEAHAWKS_SHOULDER_BAR_RIGHT = 'M432,411 L423,420 L479,439 L489,430 Z';

// The 1976 sleeve carries two full-width horizontal bands instead of a shoulder sweep.
export const SEAHAWKS_1976_SLEEVE_WHITE_LEFT = 'M30,498 H176 V522 H30 Z';
export const SEAHAWKS_1976_SLEEVE_WHITE_RIGHT = 'M412,498 H558 V522 H412 Z';
export const SEAHAWKS_1976_SLEEVE_GREEN_LEFT = 'M30,522 H176 V546 H30 Z';
export const SEAHAWKS_1976_SLEEVE_GREEN_RIGHT = 'M412,522 H558 V546 H412 Z';
// Its silver pants carry a wide white stripe with a narrower green stripe inset over it.
export const SEAHAWKS_1976_PANTS_WHITE_LEFT = 'M114,807 H138 V1462 H114 Z';
export const SEAHAWKS_1976_PANTS_WHITE_RIGHT = 'M450,807 H474 V1462 H450 Z';
export const SEAHAWKS_1976_PANTS_GREEN_LEFT = 'M120,807 H132 V1462 H120 Z';
export const SEAHAWKS_1976_PANTS_GREEN_RIGHT = 'M456,807 H468 V1462 H456 Z';
// Its silver shell carries stacked royal and green bands where the modern shell is bare.
export const SEAHAWKS_1976_HELMET_ROYAL_BAND = 'M150,250 H600 V292 H150 Z';
export const SEAHAWKS_1976_HELMET_GREEN_BAND = 'M150,292 H560 V330 H150 Z';

// Rivalries reads pine-on-ice. Its body and pine now live in the kit's curated palette (primary
// and accent in lib/uniforms/data.ts), so only the shell tone needs a literal: the deep teal is a
// fourth color with no token, and can't be one — it fails AA on the dark UI (1.57), so it could
// never be uiAccent. Sampled from the GUD 2025 composite.
export const SEAHAWKS_RIVALRIES_TEAL = '#023A4D';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';
const GENERIC_SHOULDER_IDS = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
];

// Home and away share one construction and differ only in which color paints the band and bar, so
// the three mirrored pairs are built once rather than transcribed per kit.
function shoulderLayers(band: ColorRef, cap: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    {
      id: 'seahawks-shoulder-bar-left',
      surface: 'sleeve-left',
      d: SEAHAWKS_SHOULDER_BAR_LEFT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-bar-right',
      surface: 'sleeve-right',
      d: SEAHAWKS_SHOULDER_BAR_RIGHT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-band-left',
      surface: 'sleeve-left',
      d: SEAHAWKS_SHOULDER_BAND_LEFT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-band-right',
      surface: 'sleeve-right',
      d: SEAHAWKS_SHOULDER_BAND_RIGHT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-cap-left',
      surface: 'sleeve-left',
      d: SEAHAWKS_SHOULDER_CAP_LEFT,
      fill: cap,
    },
    {
      id: 'seahawks-shoulder-cap-right',
      surface: 'sleeve-right',
      d: SEAHAWKS_SHOULDER_CAP_RIGHT,
      fill: cap,
    },
  ];

  return shapes.map((shape) => ({ ...shape, clip: true, kind: 'fill' }));
}

// The modern decal, shared by the kits that wear a shell it reads against. The 1976 throwback is
// excluded: that era used an entirely different mark, so it gets its stacked bands and no decal.
function hawkLayers(keyline: ColorRef, eye: ColorRef): UniformLayer[] {
  return [
    {
      id: 'seahawks-helmet-hawk',
      surface: 'helmet',
      d: SEAHAWKS_HELMET_HAWK_PATH,
      clip: true,
      kind: 'fill',
      fill: keyline,
    },
    {
      id: 'seahawks-helmet-hawk-eye',
      surface: 'helmet',
      d: SEAHAWKS_HELMET_HAWK_EYE_PATH,
      clip: true,
      kind: 'fill',
      fill: eye,
    },
  ];
}

export const SEAHAWKS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'seahawks',
  kits: {
    // Home drops every generic shoulder/sleeve mark: the reference has no helmet side band, no
    // yoke fill, and no cuff bar — the grey sweep terminates at the hem instead. The generic
    // collar chevron and pants stripes are kept because secondary already resolves to action
    // green, which is what the reference shows for both.
    home: {
      removeLayerIds: GENERIC_SHOULDER_IDS,
      layers: [
        {
          id: 'seahawks-helmet-center-stripe',
          surface: 'helmet',
          d: HELMET_CROWN_STRIPE_PATH,
          clip: true,
          kind: 'fill',
          fill: SEAHAWKS_HELMET_CENTER_COLOR,
        },
        ...hawkLayers('#FFFFFF', 'secondary'),
        ...shoulderLayers(SEAHAWKS_WOLF_GREY, 'secondary'),
      ],
      // The reference number is wolf grey with an action-green outline; only the fill differs from
      // the generic model, whose outline already resolves to secondary.
      number: { fill: SEAHAWKS_WOLF_GREY },
    },
    // Away is the same construction on a white body with Seattle's navy shell. Its curated
    // `secondary` is that navy and `accent` is action green, so the band/bar/collar take secondary
    // and the sleeve cap takes accent — the inverse of home's token usage, same painted result.
    // The reference's white pants carry no stripe, so the generic pair is removed rather than
    // recolored.
    away: {
      helmetColor: 'secondary',
      removeLayerIds: [
        ...GENERIC_SHOULDER_IDS,
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
      ],
      layers: [
        {
          id: 'seahawks-helmet-center-stripe',
          surface: 'helmet',
          d: HELMET_CROWN_STRIPE_PATH,
          clip: true,
          kind: 'fill',
          fill: SEAHAWKS_HELMET_CENTER_COLOR,
        },
        ...hawkLayers('#FFFFFF', 'accent'),
        ...shoulderLayers('secondary', 'accent'),
      ],
      number: { fill: 'secondary', outline: 'accent' },
    },
    // The 1976 kit predates the shoulder sweep entirely: a silver shell and silver pants, stacked
    // royal/green bands on both the helmet and the sleeves, and plain white numbers. Its outline
    // resolves to primary so the royal-on-royal keyline disappears rather than ringing the numbers
    // in green, which is what the reference shows.
    '1976-throwback': {
      helmetColor: 'accent',
      pantsColor: 'accent',
      removeLayerIds: [
        ...GENERIC_SHOULDER_IDS,
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
      ],
      layers: [
        {
          id: 'seahawks-1976-helmet-royal',
          surface: 'helmet',
          d: SEAHAWKS_1976_HELMET_ROYAL_BAND,
          clip: true,
          kind: 'fill',
          fill: 'primary',
        },
        {
          id: 'seahawks-1976-helmet-green',
          surface: 'helmet',
          d: SEAHAWKS_1976_HELMET_GREEN_BAND,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-sleeve-white-left',
          surface: 'sleeve-left',
          d: SEAHAWKS_1976_SLEEVE_WHITE_LEFT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-sleeve-white-right',
          surface: 'sleeve-right',
          d: SEAHAWKS_1976_SLEEVE_WHITE_RIGHT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-sleeve-green-left',
          surface: 'sleeve-left',
          d: SEAHAWKS_1976_SLEEVE_GREEN_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-sleeve-green-right',
          surface: 'sleeve-right',
          d: SEAHAWKS_1976_SLEEVE_GREEN_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-pants-white-left',
          surface: 'leg-left',
          d: SEAHAWKS_1976_PANTS_WHITE_LEFT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-pants-white-right',
          surface: 'leg-right',
          d: SEAHAWKS_1976_PANTS_WHITE_RIGHT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-pants-green-left',
          surface: 'leg-left',
          d: SEAHAWKS_1976_PANTS_GREEN_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-pants-green-right',
          surface: 'leg-right',
          d: SEAHAWKS_1976_PANTS_GREEN_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-collar-white',
          surface: 'collar',
          d: COLLAR_PATH,
          clip: true,
          kind: 'stroke',
          stroke: '#FFFFFF',
          strokeWidth: 18,
        },
        {
          id: 'generic-collar',
          surface: 'collar',
          d: COLLAR_PATH,
          clip: true,
          kind: 'stroke',
          stroke: 'secondary',
          strokeWidth: 8,
        },
      ],
      number: { outline: 'primary' },
    },
    // Rivalries is a print, not a construction: its feathered shoulder texture has no stripe
    // geometry to draw, so — as with the Bills' ice kit — it is represented by the absence of
    // shoulder marks rather than by inventing bands. What remains is the deep teal shell, the navy
    // collar and cuffs the generic model already supplies from secondary, and the pine number.
    'rivalries-2025': {
      helmetColor: SEAHAWKS_RIVALRIES_TEAL,
      removeLayerIds: [
        'generic-helmet-stripe',
        'generic-sleeve-yoke-left',
        'generic-sleeve-yoke-right',
      ],
      layers: hawkLayers('#FFFFFF', 'accent'),
      number: { fill: 'accent', outline: 'secondary' },
    },
  },
};
