// Seattle's own construction layers, bound to palette keys: the helmet decals, the modern feathered
// collar and the pants art the stripe spec cannot draw. Each export is a placed mark, emitted
// exactly as written.
import {
  SEAHAWKS_NECK_OPENING,
  SEAHAWKS_COLLAR_BAND,
  SEAHAWKS_COLLAR_FEATHERS_LEFT,
  SEAHAWKS_COLLAR_FEATHERS_RIGHT,
  SEAHAWKS_NECK_TWELVE,
  SEAHAWKS_THROWBACK_PANTS_KEYLINE_LEFT,
  SEAHAWKS_THROWBACK_PANTS_KEYLINE_RIGHT,
  SEAHAWKS_THROWBACK_PANTS_ROYAL_LEFT,
  SEAHAWKS_THROWBACK_PANTS_ROYAL_RIGHT,
  SEAHAWKS_THROWBACK_PANTS_WHITE_LEFT,
  SEAHAWKS_THROWBACK_PANTS_WHITE_RIGHT,
  SEAHAWKS_THROWBACK_SOCK_LEFT,
  SEAHAWKS_THROWBACK_SOCK_RIGHT,
  SEAHAWKS_HELMET_HAWK_EYE_PATH,
  SEAHAWKS_HELMET_HAWK_GREY_PATH,
  SEAHAWKS_HELMET_HAWK_PATH,
} from './paths';
import { SEAHAWKS_THROWBACK_HAWK } from './throwback-hawk';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';
import { placeMark, placed, type PlacedMark } from '../../core/marks';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The modern decal: the wolf-grey wing, then a white keyline whose counters let the shell read
// through, then the eye. There is no navy backing shape, which is why the mark only works on a
// shell it contrasts with.
function hawk(eye: string): PartLayer[] {
  return [
    fill('seahawks-helmet-hawk-grey', 'helmet', SEAHAWKS_HELMET_HAWK_GREY_PATH, 'wolfGrey'),
    fill('seahawks-helmet-hawk', 'helmet', SEAHAWKS_HELMET_HAWK_PATH, 'white'),
    fill('seahawks-helmet-hawk-eye', 'helmet', SEAHAWKS_HELMET_HAWK_EYE_PATH, eye),
  ];
}

export const SEAHAWKS_NAVY_HAWK_DECAL = placed([
  fill('seahawks-helmet-center-stripe', 'helmet', HELMET_CROWN_STRIPE_PATH, 'crownWedge'),
  ...hawk('green'),
]);

export const SEAHAWKS_TEAL_HAWK_DECAL = placed(hawk('rivalriesPine'));

export const SEAHAWKS_THROWBACK_HAWK_DECAL = placed(
  placeMark('seahawks-throwback-hawk', SEAHAWKS_THROWBACK_HAWK, 'helmet-side', {
    royal: 'throwbackRoyal',
    white: 'white',
    block: 'throwbackGreen',
    eye: 'throwbackGreen',
  })
);

// The body-color collar frames a shaded opening and back-neck tab; its chevrons stop before the V
// point. The modern jerseys share geometry with different feather colors.
export function seahawksModernCollar(body: string, neck: string, feathers: string): PlacedMark {
  return placed([
    fill('seahawks-neck-opening', 'collar', SEAHAWKS_NECK_OPENING, neck),
    fill('seahawks-collar-band', 'collar', SEAHAWKS_COLLAR_BAND, body),
    fill('seahawks-collar-feathers-left', 'collar', SEAHAWKS_COLLAR_FEATHERS_LEFT, feathers),
    fill('seahawks-collar-feathers-right', 'collar', SEAHAWKS_COLLAR_FEATHERS_RIGHT, feathers),
    fill('seahawks-neck-tab-border', 'collar', 'M279,389 H309 V417 H279 Z', 'green'),
    fill('seahawks-neck-tab', 'collar', 'M281,391 H307 V415 H281 Z', 'navy'),
    fill('seahawks-neck-twelve', 'collar', SEAHAWKS_NECK_TWELVE, 'wolfGrey'),
  ]);
}

// The throwback stripe's white ground, painted before the green edge band.
export const SEAHAWKS_THROWBACK_PANTS_GROUND = placed([
  fill(
    'seahawks-throwback-pants-white-left',
    'leg-left',
    SEAHAWKS_THROWBACK_PANTS_WHITE_LEFT,
    'white'
  ),
  fill(
    'seahawks-throwback-pants-white-right',
    'leg-right',
    SEAHAWKS_THROWBACK_PANTS_WHITE_RIGHT,
    'white'
  ),
]);

// The white keyline and royal centre over the green band, then the royal socks, drawn on the legs
// from the hem down.
export const SEAHAWKS_THROWBACK_PANTS_CENTRE_AND_SOCKS = placed([
  fill(
    'seahawks-throwback-pants-keyline-left',
    'leg-left',
    SEAHAWKS_THROWBACK_PANTS_KEYLINE_LEFT,
    'white'
  ),
  fill(
    'seahawks-throwback-pants-keyline-right',
    'leg-right',
    SEAHAWKS_THROWBACK_PANTS_KEYLINE_RIGHT,
    'white'
  ),
  fill(
    'seahawks-throwback-pants-royal-left',
    'leg-left',
    SEAHAWKS_THROWBACK_PANTS_ROYAL_LEFT,
    'throwbackRoyal'
  ),
  fill(
    'seahawks-throwback-pants-royal-right',
    'leg-right',
    SEAHAWKS_THROWBACK_PANTS_ROYAL_RIGHT,
    'throwbackRoyal'
  ),
  fill('seahawks-throwback-sock-left', 'leg-left', SEAHAWKS_THROWBACK_SOCK_LEFT, 'throwbackRoyal'),
  fill(
    'seahawks-throwback-sock-right',
    'leg-right',
    SEAHAWKS_THROWBACK_SOCK_RIGHT,
    'throwbackRoyal'
  ),
]);
