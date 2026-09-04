import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Atlanta's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/falcons. Jersey paths use the outer 588-wide mannequin space; right paths
// mirror the left across the jersey centerline x=294 (mirroredX = 588 - x).
//
// No helmet decal. The falcon mark is 28x34px in the reference — comparable to Chicago's C, which
// traced cleanly — but it is thin swooping linework rather than a solid letterform, and it shreds
// into disconnected strokes at that size the same way Seattle's keyline did. A bare shell beats an
// illegible trace; the rule that keeps emerging is that solid shapes trace and thin lines do not.
//
// Atlanta's construction is the sparest of any team done so far: no sleeve bands, no shoulder
// yoke, no contrasting collar, and plain pants. The only geometry is a thin red stripe down each
// side seam of the torso, so every kit strips nearly the whole generic model.

// Black is a literal on the away and red-alt kits. Atlanta's away palette resolves secondary AND
// accent to the same red (#A71930), so no token supplies the black shell and pants those kits
// wear. Hex from teamcolorcodes.
export const FALCONS_BLACK = '#000000';

// The side-seam piping, measured at x=52 and x=148 on a reference figure centered at 99.5, running
// from y=208 to the jersey hem (jersey top 126, sleeve hem 189).
export const FALCONS_SIDE_STRIPE_LEFT = 'M141,631 H147 V806 H141 Z';
export const FALCONS_SIDE_STRIPE_RIGHT = 'M441,631 H447 V806 H441 Z';

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

function sideStripes(fill: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string }[] = [
    { id: 'falcons-side-stripe-left', surface: 'jersey', d: FALCONS_SIDE_STRIPE_LEFT },
    { id: 'falcons-side-stripe-right', surface: 'jersey', d: FALCONS_SIDE_STRIPE_RIGHT },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill', fill }));
}

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Atlanta Falcons logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// The falcon, traced from the home figure's shell (bbox x55-161, y20-117 in the reference) mapped
// onto the raw helmet space at ~6.25x. Three plain-union fills in paint order: white silhouette,
// black body, red streaks.
//
// This mark was the archive's reference example of "does not trace" — cited in the brief and in
// three other modules as the thing that shreds. It does trace. What was true is that its BODY is
// the same black as the shell, so there is nothing to separate the mark from the surface; what was
// wrong is concluding from that that the mark is unreachable. The white keyline around it is a
// CLOSED RING, and a closed ring is a separator: fill its hole and you have the silhouette, and the
// body then falls out as the black component that does not touch the crop border (the shell black
// does). Houston's identical problem is unsolvable from its own figure precisely because its
// keyline is broken into four pieces — the ring, not the color, is what decides this.
//
// All three archived kits wear a black shell, so the body layer is redundant on every one of them
// today. It is authored anyway: it costs one path and it is what keeps the mark correct if a
// non-black shell is ever added, which is exactly the check Jacksonville's spots failed.
export const FALCONS_DECAL_RED = '#E12444'; // sampled (225,36,68)
export const FALCONS_DECAL_SILHOUETTE_PATH =
  'M354.4,110.3 L396.8,122.9 L412.1,123.6 L420.5,128.5 L437.8,129.9 L449.7,135.5 L485.8,142.4 L495.5,148.0 L506.6,148.7 L544.9,162.0 L581.7,181.5 L592.1,192.7 L596.3,205.9 L593.5,220.6 L581.7,232.4 L578.2,232.4 L565.7,219.9 L508.0,221.3 L509.4,228.2 L524.7,237.3 L546.9,261.0 L540.0,270.1 L519.8,282.6 L485.8,289.6 L482.3,287.5 L483.0,281.3 L478.8,276.4 L457.3,275.7 L450.3,279.2 L442.7,301.5 L437.1,305.7 L430.2,325.2 L424.6,330.1 L417.7,348.9 L399.6,378.9 L396.8,401.2 L400.3,421.5 L378.8,413.1 L354.4,392.2 L341.2,373.3 L328.7,341.2 L322.5,303.6 L323.2,268.0 L328.7,236.6 L335.7,215.7 L340.5,210.8 L341.2,202.4 L271.0,200.3 L353.7,111.0 Z';
export const FALCONS_DECAL_BODY_PATH =
  'M361.4,134.8 L409.3,141.0 L500.4,160.6 L558.1,178.7 L581.0,194.1 L572.0,200.3 L571.3,204.5 L550.4,204.5 L544.2,208.0 L460.8,210.1 L460.1,213.6 L466.3,219.2 L387.8,374.0 L386.4,404.0 L365.6,383.1 L353.7,361.5 L364.2,351.0 L397.5,298.7 L407.3,288.9 L414.2,273.6 L410.0,272.2 L407.3,275.0 L351.7,341.2 L346.8,333.6 L345.4,308.5 L340.5,301.5 L411.4,247.1 L414.2,240.8 L408.6,240.1 L404.5,245.0 L396.8,246.4 L348.2,278.5 L346.1,268.7 L351.7,253.4 L351.0,240.1 L395.4,223.4 L408.0,222.0 L414.2,215.7 L429.5,212.9 L426.7,209.4 L412.8,208.7 L407.3,214.3 L392.0,214.3 L365.6,220.6 L363.5,215.7 L373.2,201.0 L371.8,192.7 L416.3,192.7 L428.1,189.2 L414.2,183.6 L330.1,180.1 L330.1,174.5 L358.6,145.2 L360.7,135.5 Z M476.1,222.7 L482.3,223.4 L522.6,247.8 L531.7,255.4 L533.7,263.1 L524.0,270.8 L515.0,264.5 L501.1,264.5 L496.9,266.6 L495.5,272.9 L485.8,264.5 L455.9,263.8 L475.4,223.4 Z';
export const FALCONS_DECAL_STREAKS_PATH =
  'M372.5,153.6 L476.8,172.4 L489.3,177.3 L505.2,178.0 L510.8,182.9 L489.3,183.6 L364.2,164.8 L362.1,160.6 L371.8,154.3 Z M405.9,309.9 L406.6,316.1 L380.2,369.2 L373.9,370.5 L371.1,361.5 L405.2,310.6 Z M398.2,268.0 L363.5,311.9 L356.5,314.7 L355.8,305.7 L397.5,268.7 Z';

// Fixed art on the black shell; nothing here moves with the palette.
function decal(): UniformLayer[] {
  return (
    [
      ['falcons-decal-silhouette', FALCONS_DECAL_SILHOUETTE_PATH, '#FFFFFF'],
      ['falcons-decal-body', FALCONS_DECAL_BODY_PATH, FALCONS_BLACK],
      ['falcons-decal-streaks', FALCONS_DECAL_STREAKS_PATH, FALCONS_DECAL_RED],
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

export const FALCONS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'falcons',
  kits: {
    // ESPN gives Atlanta color=red / alternateColor=black. `isNeutral(black)` is true, so
    // toTeamColors keeps primary as the red — and the generic model paints helmet, jersey AND
    // pants from primary, rendering Atlanta head-to-toe red. The reference home kit is black on
    // black. Pinning all three bodies to secondary fixes it while primary still supplies the red
    // piping and numeral keyline. Same defect and same fix as Cincinnati and Pittsburgh; a sweep
    // of all 32 teams found those three plus New Orleans and no others.
    home: {
      helmetColor: 'secondary',
      jerseyColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...sideStripes('primary'), ...decal()],
      // White numerals with a thin red keyline — the generic width of 26 would ring them heavily.
      number: { fill: '#FFFFFF', outline: 'primary', outlineWidth: 10 },
    },
    // White body over the black shell and black pants the reference shows. Neither is available as
    // a token here (secondary and accent are both the red), hence the literals.
    away: {
      helmetColor: FALCONS_BLACK,
      pantsColor: FALCONS_BLACK,
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...sideStripes('secondary'), ...decal()],
      number: { fill: FALCONS_BLACK, outline: 'secondary', outlineWidth: 10 },
    },
    // Red alternate — inferred, not measured: Atlanta did not wear a red jersey in 2025, so it is
    // absent from the composite. This recolors the same construction onto the red body its curated
    // palette describes. Treat as provisional until a red reference is available.
    'red-alt': {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...sideStripes('accent'), ...decal()],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 10 },
    },
  },
};
