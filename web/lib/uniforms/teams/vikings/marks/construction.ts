import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import {
  VIKINGS_DECAL_CRESCENT_PATH,
  VIKINGS_DECAL_HORN_FILL_PATH,
  VIKINGS_DECAL_HORN_PATH,
} from './decal';

export function vikingsHorn(horn: string, crescent: string, edge: string = horn) {
  const paths: ReadonlyArray<[string, string, string]> = [
    ['horn', VIKINGS_DECAL_HORN_PATH, edge],
    ['horn-fill', VIKINGS_DECAL_HORN_FILL_PATH, horn],
    ['crescent', VIKINGS_DECAL_CRESCENT_PATH, crescent],
  ];
  return placed(
    paths.map(([id, d, fill]): PartLayer => ({
      id: `vikings-decal-${id}`,
      surface: 'helmet',
      d,
      clip: true,
      kind: 'fill',
      fill,
    }))
  );
}
