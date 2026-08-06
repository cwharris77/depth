import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Cincinnati's construction geometry and kit overrides, using the Gridiron Uniform Database
// composite chart as the visual construction reference. Paths stay in their authored helmet and
// outer-viewBox spaces so the shared renderer can place them without team-specific transforms.
// The stripe geometry is provisional pending a hand-authored replacement; do not treat these paths
// as exact or licensed reproductions of the reference art.

// The five-part stripe field uses the helmet's raw x:139-802, y:65-674 coordinate space. It is a
// sibling of GEO.helmet inside the shared translate/scale group, so no extra transform belongs here.
export const BENGALS_HELMET_STRIPE_PATH =
  'M409.3,516.9 L345.0,504.1 L277.4,436.8 L251.6,359.9 L258.1,276.5 L316.0,167.6 L415.8,81.0 L451.2,77.8 L435.1,100.3 L467.3,100.3 L486.6,81.0 L512.3,81.0 L560.6,103.5 L509.1,148.3 L470.5,218.9 L457.6,263.7 L457.6,366.3 L425.4,283.0 L425.4,186.8 L454.4,106.7 L422.2,106.7 L386.8,141.9 L348.2,199.6 L309.6,295.8 L309.6,359.9 L328.9,417.6 L457.6,468.9 L396.5,491.3 L409.3,516.9 Z M261.3,484.9 L242.0,484.9 L213.0,462.5 L193.7,411.2 L193.7,276.5 L213.0,218.9 L271.0,122.7 L338.5,87.4 L232.3,225.3 L206.6,302.2 L213.0,398.3 L261.3,484.9 Z M551.0,324.6 L509.1,321.4 L515.6,257.3 L554.2,180.4 L589.6,138.7 L615.3,132.3 L637.9,154.7 L573.5,218.9 L534.9,315.0 L551.0,324.6 Z M602.5,324.6 L573.5,321.4 L586.4,295.8 L679.7,215.6 L689.4,257.3 L647.5,279.8 L602.5,324.6 Z';

// Sleeve-cap stripes use the outer viewBox directly. The right path explicitly mirrors the left
// across the jersey's x=294 centerline (mirroredX = 588 - x), matching the generic yoke convention.
export const BENGALS_SLEEVE_STRIPE_PATH_LEFT =
  'M106.8,526.4 L86.0,457.6 L86.0,419.2 L103.6,411.2 L102.0,444.8 L111.6,483.2 L106.8,526.4 Z M71.6,497.6 L47.6,451.2 L47.6,441.6 L55.6,433.6 L66.8,451.2 L73.2,476.8 L71.6,497.6 Z M55.6,491.2 L36.4,491.2 L34.8,483.2 L49.2,484.8 L55.6,491.2 Z';
export const BENGALS_SLEEVE_STRIPE_PATH_RIGHT =
  'M481.2,526.4 L502.0,457.6 L502.0,419.2 L484.4,411.2 L486.0,444.8 L476.4,483.2 L481.2,526.4 Z M516.4,497.6 L540.4,451.2 L540.4,441.6 L532.4,433.6 L521.2,451.2 L514.8,476.8 L516.4,497.6 Z M532.4,491.2 L551.6,491.2 L553.2,483.2 L538.8,484.8 L532.4,491.2 Z';

// Color Rush uses a small outer-knee claw rather than a full-leg stripe. These paths also use the
// outer viewBox, with the right explicitly mirrored across x=294 so renderer order stays data-only.
export const BENGALS_PANTS_KNEE_ACCENT_LEFT =
  'M161.2,1163.2 L145.2,1156.8 L130.8,1142.4 L127.6,1132.8 L132.4,1118.4 L140.4,1139.2 L161.2,1163.2 Z';
export const BENGALS_PANTS_KNEE_ACCENT_RIGHT =
  'M426.8,1163.2 L442.8,1156.8 L457.2,1142.4 L460.4,1132.8 L455.6,1118.4 L447.6,1139.2 L426.8,1163.2 Z';

const SLEEVE_BAND_PATH_LEFT = 'M34,558 L156,558 L152,578 L34,578 Z';
const SLEEVE_BAND_PATH_RIGHT = 'M554,558 L432,558 L436,578 L554,578 Z';
const COLLAR_PATH = 'M206,388 L294,455 L386,388';

function stripeLayers(color: ColorRef): UniformLayer[] {
  return [
    {
      id: 'generic-sleeve-yoke-left',
      surface: 'sleeve-left',
      d: BENGALS_SLEEVE_STRIPE_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'generic-sleeve-yoke-right',
      surface: 'sleeve-right',
      d: BENGALS_SLEEVE_STRIPE_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'generic-sleeve-stripe-left',
      surface: 'sleeve-left',
      d: SLEEVE_BAND_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'generic-sleeve-stripe-right',
      surface: 'sleeve-right',
      d: SLEEVE_BAND_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'generic-collar',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: 13,
    },
  ];
}

function helmetStripeLayer(color: ColorRef): UniformLayer {
  return {
    id: 'generic-helmet-stripe',
    surface: 'helmet',
    d: BENGALS_HELMET_STRIPE_PATH,
    clip: true,
    kind: 'fill',
    fill: color,
  };
}

export const BENGALS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'bengals',
  defaults: {
    // Bengals kits do not use the generic full-leg bands; Color Rush adds only outer-knee claws.
    removeLayerIds: ['generic-pants-stripe-left', 'generic-pants-stripe-right'],
    layers: [helmetStripeLayer('secondary'), ...stripeLayers('secondary')],
  },
  kits: {
    // ESPN's home primary is Cincinnati orange, while the worn jersey and pants are black. Pulling
    // both bodies from secondary preserves that mapping while primary supplies the orange trim.
    home: {
      jerseyColor: 'secondary',
      pantsColor: 'secondary',
      layers: [helmetStripeLayer('secondary'), ...stripeLayers('primary')],
      number: { outline: 'primary' },
    },
    // The curated away palette does not expose its black construction color. teamcolorcodes lists
    // Bengals orange #FB4F14 and black #000000, so literals keep the shell orange and trim black
    // while the runtime kit primary remains the white jersey/pants body.
    away: {
      helmetColor: '#FB4F14',
      layers: [helmetStripeLayer('#000000'), ...stripeLayers('#000000')],
      number: { outline: '#000000' },
    },
    // The orange alternate inherits the orange jersey and black stripes; only its white pants need
    // remapping to the curated row's accent token.
    'orange-alt': {
      pantsColor: 'accent',
    },
    // The Bengals describe Color Rush as a white-tiger treatment. It shares away's fixed orange
    // shell but uniquely restores the small black knee accents removed by the team defaults.
    'color-rush': {
      helmetColor: '#FB4F14',
      layers: [
        {
          id: 'generic-pants-stripe-left',
          surface: 'leg-left',
          d: BENGALS_PANTS_KNEE_ACCENT_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'generic-pants-stripe-right',
          surface: 'leg-right',
          d: BENGALS_PANTS_KNEE_ACCENT_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
      ],
    },
  },
};
