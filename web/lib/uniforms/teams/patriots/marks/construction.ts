// New England's own art, bound to palette keys and emitted exactly as written: the helmet mark and
// the three diagonal bands down each shoulder cap.
import {
  PATRIOTS_BANDS_LEFT,
  PATRIOTS_BANDS_RIGHT,
  PATRIOTS_DECAL_FACE_PATH,
  PATRIOTS_DECAL_KEYLINE_PATH,
  PATRIOTS_DECAL_SILVER_PATH,
  PATRIOTS_DECAL_STAR_PATH,
  PATRIOTS_DECAL_STREAMERS_PATH,
} from './paths';
import { placed, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// Keyline, face, streamers, silver trim, star: paint order keeps the white star over the face.
const DECAL_SHAPES: readonly (readonly [string, string, string])[] = [
  ['patriots-decal-keyline', PATRIOTS_DECAL_KEYLINE_PATH, 'white'],
  ['patriots-decal-face', PATRIOTS_DECAL_FACE_PATH, 'navy'],
  ['patriots-decal-streamers', PATRIOTS_DECAL_STREAMERS_PATH, 'red'],
  ['patriots-decal-silver', PATRIOTS_DECAL_SILVER_PATH, 'silver'],
  ['patriots-decal-star', PATRIOTS_DECAL_STAR_PATH, 'white'],
];

export const PATRIOTS_HELMET_DECAL = placed(
  DECAL_SHAPES.map(([id, d, fill]): PartLayer => ({
    id,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

// Three bands per shoulder; the middle one takes the inner colour, the outer two the outer colour.
export function patriotsShoulderBands(outer: string, inner: string): PlacedMark {
  const sides = [
    ['sleeve-left', 'left', PATRIOTS_BANDS_LEFT],
    ['sleeve-right', 'right', PATRIOTS_BANDS_RIGHT],
  ] as const;
  return placed(
    sides.flatMap(([surface, side, paths]) =>
      paths.map((d, i): PartLayer => ({
        id: `patriots-band-${i}-${side}`,
        surface,
        d,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? inner : outer,
      }))
    )
  );
}
