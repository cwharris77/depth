// Philadelphia's own construction layers, bound to palette keys. The helmet wing is a placed mark,
// emitted exactly as written; the sleeve wing is the same art fitted to the sleeve anchors.
import {
  EAGLES_DECAL_BLACK_PATH,
  EAGLES_DECAL_SILVER_PATH,
  EAGLES_DECAL_WHITE_PATH,
} from './paths';
import { anchoredMark } from '../../core/jersey-spec';
import { boundsOf, placed, type Mark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const decal = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
});

// The wing: a white substrate, black feather channels, then the silver body, on every shell.
export const EAGLES_WING_DECAL = placed([
  decal('eagles-decal-white', EAGLES_DECAL_WHITE_PATH, 'white'),
  decal('eagles-decal-black', EAGLES_DECAL_BLACK_PATH, 'black'),
  decal('eagles-decal-silver', EAGLES_DECAL_SILVER_PATH, 'silver'),
]);

// The wing as a mark; the white substrate's bounds contain the other two slots.
const WING_MARK: Mark<'white' | 'black' | 'silver'> = {
  box: boundsOf(EAGLES_DECAL_WHITE_PATH),
  paths: [
    { slot: 'white', d: EAGLES_DECAL_WHITE_PATH },
    { slot: 'black', d: EAGLES_DECAL_BLACK_PATH },
    { slot: 'silver', d: EAGLES_DECAL_SILVER_PATH },
  ],
};

// The wing on each sleeve, painted under the numerals and cuff.
export const eaglesSleeveWing = () =>
  anchoredMark({
    paint: 'under',
    mark: WING_MARK,
    anchor: 'sleeves',
    slots: { white: 'white', black: 'black', silver: 'silver' },
    id: 'sleeve-wing',
  });
