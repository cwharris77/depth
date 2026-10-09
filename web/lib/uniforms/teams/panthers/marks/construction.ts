// Carolina's own art, bound to palette keys and emitted exactly as written: the helmet mark, the
// shoulder fan, the keylined leg stripe.
import {
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
import { boundsOf, placed, type PlacedMark } from '../../core/marks';
import { NIKE_MARK } from '../../core/pants-logos';
import { JERSEY_NUMBER_THREE } from '../../../jersey-art';
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

export function panthersShoulderNumbers(fill: string, outline: string): PlacedMark {
  const box = boundsOf(JERSEY_NUMBER_THREE);
  const scale = 45 / (box[3] - box[1]);
  const coordinates = (JERSEY_NUMBER_THREE.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const layers: PartLayer[] = [];
  for (const side of ['left', 'right'] as const) {
    const rotated: number[] = [];
    for (let i = 0; i < coordinates.length; i += 2) {
      const x = 157 - (coordinates[i + 1] - (box[1] + box[3]) / 2) * scale;
      const y = 419 + (coordinates[i] - (box[0] + box[2]) / 2) * scale;
      rotated.push(side === 'left' ? x : 588 - x, y);
    }
    let i = 0;
    const d = JERSEY_NUMBER_THREE.replace(/-?\d+(?:\.\d+)?/g, () =>
      String(Math.round(rotated[i++] * 100) / 100)
    );
    layers.push(
      {
        id: `panthers-shoulder-number-outline-${side}`,
        surface: `sleeve-${side}`,
        d,
        clip: true,
        kind: 'stroke',
        stroke: outline,
        strokeWidth: 2.5,
      },
      {
        id: `panthers-shoulder-number-${side}`,
        surface: `sleeve-${side}`,
        d,
        clip: true,
        kind: 'fill',
        fill,
      }
    );
  }
  return placed(layers);
}

// The sleeve wraps out of the front view; the jersey silhouette clips the outer portion of each mark.
export function panthersSleeveMarks(nikeColor: string): PlacedMark {
  const box = boundsOf(PANTHERS_DECAL_KEYLINE_PATH);
  const fit = (d: string, source: readonly number[], x: number, cy: number, width: number) => {
    const scale = width / (source[2] - source[0]);
    let i = 0;
    return d.replace(/-?\d+(?:\.\d+)?/g, (value) => {
      const coordinate = Number(value);
      const fitted =
        i++ % 2 === 0
          ? x + (coordinate - source[0]) * scale
          : cy + (coordinate - (source[1] + source[3]) / 2) * scale;
      return String(Math.round(fitted * 100) / 100);
    });
  };
  const left: PartLayer[] = DECAL_SHAPES.map(([id, d, fill]) => ({
    id: `${id.replace('panthers-decal', 'panthers-sleeve')}-left`,
    surface: 'sleeve-left',
    d: fit(d, box, -42, 527, 110),
    clip: true,
    kind: 'fill',
    fill,
  }));
  let nikeCoordinate = 0;
  const nikeLeft = fit(NIKE_MARK.paths[0].d, NIKE_MARK.box, 14, 466, 40).replace(
    /-?\d+(?:\.\d+)?/g,
    (value) =>
      nikeCoordinate++ % 2 === 0 ? String(Math.round((68 - Number(value)) * 100) / 100) : value
  );
  left.push({
    id: 'panthers-nike-left',
    surface: 'sleeve-left',
    d: nikeLeft,
    clip: true,
    kind: 'fill',
    fill: nikeColor,
  });
  return placed(
    left.flatMap((layer): PartLayer[] => {
      let i = 0;
      return [
        layer,
        {
          ...layer,
          id: layer.id.replace('left', 'right'),
          surface: 'sleeve-right',
          d: layer.d.replace(/-?\d+(?:\.\d+)?/g, (value) =>
            i++ % 2 === 0 ? String(Math.round((588 - Number(value)) * 100) / 100) : value
          ),
        },
      ];
    })
  );
}

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
