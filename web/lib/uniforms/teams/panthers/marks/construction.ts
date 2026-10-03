// Carolina's own art, bound to palette keys and emitted exactly as written: the helmet mark, the
// shoulder fan, the deep collar V and the keylined leg stripe.
import {
  PANTHERS_COLLAR_PATH,
  PANTHERS_COLLAR_WIDTH,
  PANTHERS_DECAL_BODY_PATH,
  PANTHERS_DECAL_DETAIL_PATH,
  PANTHERS_DECAL_HIGHLIGHT_PATH,
  PANTHERS_DECAL_KEYLINE_PATH,
  PANTHERS_FAN_LEFT,
  PANTHERS_FAN_RIGHT,
  PANTHERS_STRIPE_CENTER_LEFT,
  PANTHERS_STRIPE_CENTER_RIGHT,
  PANTHERS_WEDGE_LEFT,
  PANTHERS_WEDGE_RIGHT,
} from './paths';
import { placed, type PlacedMark } from '../../core/marks';
import { fromGeneric, type PartLayer } from '../../core/parts';

// Paint order is the whole trick: silhouette, body, the body's interior gaps back in blue, fangs.
// Reversing any pair loses the linework. The fang highlight is the mark's own grey, not the kit's.
const DECAL_SHAPES: readonly (readonly [string, string, string])[] = [
  ['panthers-decal-keyline', PANTHERS_DECAL_KEYLINE_PATH, 'blue'],
  ['panthers-decal-body', PANTHERS_DECAL_BODY_PATH, 'black'],
  ['panthers-decal-detail', PANTHERS_DECAL_DETAIL_PATH, 'blue'],
  ['panthers-decal-highlight', PANTHERS_DECAL_HIGHLIGHT_PATH, 'markSilver'],
];

export const PANTHERS_HELMET_DECAL = placed(
  DECAL_SHAPES.map(([id, d, fill]): PartLayer => ({
    id,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

// A wider triangle first, the shorter one over it: where the middle band ends, the two outer bands
// merge.
export function panthersShoulderFan(outer: string, middle: string): PlacedMark {
  const shapes = [
    ['panthers-fan-left', 'sleeve-left', PANTHERS_FAN_LEFT, outer],
    ['panthers-fan-right', 'sleeve-right', PANTHERS_FAN_RIGHT, outer],
    ['panthers-wedge-left', 'sleeve-left', PANTHERS_WEDGE_LEFT, middle],
    ['panthers-wedge-right', 'sleeve-right', PANTHERS_WEDGE_RIGHT, middle],
  ] as const;
  return placed(
    shapes.map(([id, surface, d, fill]): PartLayer => ({
      id,
      surface,
      d,
      clip: true,
      kind: 'fill',
      fill,
    }))
  );
}

export function panthersCollar(fill: string): PlacedMark {
  return placed([
    {
      id: 'panthers-collar',
      surface: 'collar',
      d: PANTHERS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: fill,
      strokeWidth: PANTHERS_COLLAR_WIDTH,
    },
  ]);
}

// The mannequin's own stripe band as the keyline, the measured centre over it.
export function panthersLegStripe(keyline: string, center: string): PlacedMark {
  return placed([
    fromGeneric('generic-pants-stripe-left', keyline),
    fromGeneric('generic-pants-stripe-right', keyline),
    {
      id: 'panthers-stripe-center-left',
      surface: 'leg-left',
      d: PANTHERS_STRIPE_CENTER_LEFT,
      clip: true,
      kind: 'fill',
      fill: center,
    },
    {
      id: 'panthers-stripe-center-right',
      surface: 'leg-right',
      d: PANTHERS_STRIPE_CENTER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: center,
    },
  ]);
}
