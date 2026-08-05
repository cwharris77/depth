import type { TeamUniformDefinition } from './types';

// Seattle's navy home construction from the supplied SEA_F reference. The shoulder paths use
// the outer 588-wide mannequin space; the helmet stripe remains in helmet coordinates so the
// shared renderer's transform and clip preserve the intended surfaces.

// The supplied SEA_F top-view inset shows a slate center construction distinct from the navy
// shell. That tone is not present in the runtime Seahawks palette, so it remains reference-bound.
export const SEAHAWKS_HELMET_CENTER_COLOR = '#2A3748';
export const SEAHAWKS_HELMET_CENTER_STRIPE_PATH =
  'M394,66 C468,61 544,81 604,119 L588,132 C534,99 468,82 397,82 Z';

export const SEAHAWKS_SHOULDER_SILVER_LEFT =
  'M32,480 L45,461 L70,447 L96,440 L157,424 L168,470 L160,515 L112,500 L72,496 L34,525 Z';
export const SEAHAWKS_SHOULDER_SILVER_RIGHT =
  'M556,480 L543,461 L518,447 L492,440 L431,424 L420,470 L428,515 L476,500 L516,496 L554,525 Z';
export const SEAHAWKS_SHOULDER_LIME_LEFT =
  'M30,466 L40,445 L59,427 L78,417 L101,411 L96,440 L70,447 L45,461 L32,480 Z';
export const SEAHAWKS_SHOULDER_LIME_RIGHT =
  'M558,466 L548,445 L529,427 L510,417 L487,411 L492,440 L518,447 L543,461 L556,480 Z';

export const SEAHAWKS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'seahawks',
  kits: {
    home: {
      removeLayerIds: [
        'generic-helmet-stripe',
        'generic-sleeve-yoke-left',
        'generic-sleeve-yoke-right',
        'generic-sleeve-stripe-left',
        'generic-sleeve-stripe-right',
      ],
      layers: [
        {
          id: 'seahawks-helmet-center-stripe',
          surface: 'helmet',
          d: SEAHAWKS_HELMET_CENTER_STRIPE_PATH,
          clip: true,
          kind: 'fill',
          fill: SEAHAWKS_HELMET_CENTER_COLOR,
        },
        {
          id: 'seahawks-shoulder-silver-left',
          surface: 'sleeve-left',
          d: SEAHAWKS_SHOULDER_SILVER_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'accent',
        },
        {
          id: 'seahawks-shoulder-silver-right',
          surface: 'sleeve-right',
          d: SEAHAWKS_SHOULDER_SILVER_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'accent',
        },
        {
          id: 'seahawks-shoulder-lime-left',
          surface: 'sleeve-left',
          d: SEAHAWKS_SHOULDER_LIME_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-shoulder-lime-right',
          surface: 'sleeve-right',
          d: SEAHAWKS_SHOULDER_LIME_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
      ],
    },
  },
};
