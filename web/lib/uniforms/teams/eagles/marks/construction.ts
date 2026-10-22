// Philadelphia's own construction layers, bound to palette keys. The helmet wing is a placed mark,
// emitted exactly as written; the sleeve logos are fitted to the sleeve anchors.
import {
  EAGLES_DECAL_BLACK_PATH,
  EAGLES_DECAL_SILVER_PATH,
  EAGLES_DECAL_WHITE_PATH,
} from './paths';
import { anchoredMark } from '../../core/jersey-spec';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { EAGLES_HEAD_MARK } from './head';
import { EAGLES_CLASSIC_MARK } from './classic';

export const eaglesClassicSleeve = () =>
  anchoredMark({
    paint: 'under',
    mark: EAGLES_CLASSIC_MARK,
    anchor: 'sleeve-front-logos',
    slots: Object.fromEntries(EAGLES_CLASSIC_MARK.paths.map(({ slot }) => [slot, slot])) as Record<
      (typeof EAGLES_CLASSIC_MARK.paths)[number]['slot'],
      string
    >,
    id: 'sleeve-classic',
  });

export const eaglesSleeveHead = () =>
  anchoredMark({
    paint: 'under',
    mark: EAGLES_HEAD_MARK,
    anchor: 'sleeve-front-logos',
    slots: { white: 'white', logoGreen: 'logoGreen', black: 'black', logoSilver: 'logoSilver' },
    id: 'sleeve-head',
  });

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

// The heritage wing on the kelly shell: the same art with its feather channels in silver, leaving
// a silver wing with white feather tips and no black.
export const EAGLES_HERITAGE_WING_DECAL = placed([
  decal('eagles-decal-white', EAGLES_DECAL_WHITE_PATH, 'white'),
  decal('eagles-decal-black', EAGLES_DECAL_BLACK_PATH, 'silver'),
  decal('eagles-decal-silver', EAGLES_DECAL_SILVER_PATH, 'silver'),
]);
