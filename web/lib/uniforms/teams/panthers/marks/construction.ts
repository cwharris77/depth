// Carolina's own art, bound to palette keys and emitted exactly as written: the helmet mark and
// crown stripe, the shoulder fan and numerals, the sleeve marks and the back-of-neck lettering.
import {
  PANTHERS_DECAL_BODY_PATH,
  PANTHERS_DECAL_DETAIL_PATH,
  PANTHERS_DECAL_HIGHLIGHT_PATH,
  PANTHERS_DECAL_KEYLINE_PATH,
  PANTHERS_FAN_LEFT,
  PANTHERS_FAN_RIGHT,
  PANTHERS_NECK_LETTERING,
  PANTHERS_WEDGE_LEFT,
  PANTHERS_WEDGE_RIGHT,
} from './paths';
import { boundsOf, placed, type PlacedMark } from '../../core/marks';
import { NIKE_MARK } from '../../core/pants-logos';
import { PANTHERS_NUMBER_THREE } from './numbers';
import type { PartLayer } from '../../core/parts';
import { seatedCrownStripe } from '../../core/shared';

// Paint order is the whole trick: silhouette, body, the body's interior gaps back in blue, fangs.
// Reversing any pair loses the linework. The fang highlight is the mark's own grey, not the kit's.
const DECAL_SHAPES: readonly (readonly [string, string, string])[] = [
  ['panthers-decal-keyline', PANTHERS_DECAL_KEYLINE_PATH, 'blue'],
  ['panthers-decal-body', PANTHERS_DECAL_BODY_PATH, 'black'],
  ['panthers-decal-detail', PANTHERS_DECAL_DETAIL_PATH, 'blue'],
  ['panthers-decal-highlight', PANTHERS_DECAL_HIGHLIGHT_PATH, 'markSilver'],
];

const PANTHERS_HELMET_DECAL = placed(
  DECAL_SHAPES.map(([id, d, fill]): PartLayer => ({
    id,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

// The crown stripe, seated on the shell: three equal bands, blue, black, blue. On the black shell
// the centre merges with the shell and the two blue bands read on their own.
const CROWN_STRIPE = seatedCrownStripe([
  { id: 'panthers-crown-blue-upper', fill: 'blue', weight: 1 },
  { id: 'panthers-crown-black', fill: 'black', weight: 1 },
  { id: 'panthers-crown-blue-lower', fill: 'blue', weight: 1 },
]);

// The same stripe and mark on both shells.
export const PANTHERS_HELMET_ART = placed([...CROWN_STRIPE, ...PANTHERS_HELMET_DECAL.layers]);

export function panthersShoulderNumbers(fill: string, outline: string): PlacedMark {
  const box = boundsOf(PANTHERS_NUMBER_THREE);
  const scale = 45 / (box[3] - box[1]);
  const coordinates = (PANTHERS_NUMBER_THREE.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const layers: PartLayer[] = [];
  for (const side of ['left', 'right'] as const) {
    const rotated: number[] = [];
    for (let i = 0; i < coordinates.length; i += 2) {
      const x = 157 - (coordinates[i + 1] - (box[1] + box[3]) / 2) * scale;
      const y = 419 + (coordinates[i] - (box[0] + box[2]) / 2) * scale;
      // The right numeral is the left one turned half a turn about its centre and carried across
      // the centreline; a plain reflection would print the 3 backwards.
      rotated.push(...(side === 'left' ? [x, y] : [588 - x, 838 - y]));
    }
    let i = 0;
    const d = PANTHERS_NUMBER_THREE.replace(/-?\d+(?:\.\d+)?/g, () =>
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

// The motto inside the back of the collar, over the collar's back bar.
export function panthersNeckLettering(fill: string): PlacedMark {
  return placed([
    {
      id: 'panthers-neck-lettering',
      surface: 'collar',
      d: PANTHERS_NECK_LETTERING,
      clip: true,
      kind: 'fill',
      fill,
    },
  ]);
}
