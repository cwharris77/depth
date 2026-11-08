import { placed, type PlacedMark } from '../../core/marks';
import { seatedCrownStripe } from '../../core/shared';
import { RAVENS_HELMET_DECAL } from './construction';
import { RAVENS_2026_WORDMARK, BALTIMORE_2026_WORDMARK } from './wordmarks-2026';

export const RAVENS_2026_HELMET = placed([
  ...RAVENS_HELMET_DECAL.layers,
  ...seatedCrownStripe([{ id: 'ravens-2026-crown', fill: 'purple', weight: 1 }]),
]);

// Four feathers down each side of the collar band, each broad at the band's outer edge and
// tapering to a point on its inner edge. They stop short of the mesh panels beside the point.
const LEFT_FEATHERS =
  'M206,384 Q222,394 229,413 L205,396 Z M204,400 Q226,408 238,424 L205,412 Z M207,418 Q234,422 253,436 L213,430 Z M217,435 Q248,436 272,448 L227,444.5 Z';
const RIGHT_FEATHERS = LEFT_FEATHERS.replace(
  /(-?\d+(?:\.\d+)?),/g,
  (_, x) => `${588 - Number(x)},`
);

export function ravensCollarWings(color: string): PlacedMark {
  return placed(
    [LEFT_FEATHERS, RIGHT_FEATHERS].map((d, i) => ({
      id: `ravens-2026-wing-${i ? 'right' : 'left'}`,
      surface: 'collar' as const,
      kind: 'fill' as const,
      fill: color,
      clip: true,
      d,
    }))
  );
}

export const RAVENS_2026_HOME_WORDMARK = placed([
  {
    id: 'ravens-2026-home-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'white',
    d: RAVENS_2026_WORDMARK,
    clip: true,
  },
]);
export const RAVENS_2026_AWAY_WORDMARK = placed([
  {
    id: 'ravens-2026-away-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'black',
    d: BALTIMORE_2026_WORDMARK,
    clip: true,
  },
]);

export const RAVENS_2026_TALONS = placed([
  {
    id: 'ravens-2026-talon-left',
    surface: 'leg-left',
    kind: 'fill',
    fill: 'midnight',
    d: 'M118,807 H134 V1157 L118,1196 Z',
    clip: true,
  },
  {
    id: 'ravens-2026-talon-right',
    surface: 'leg-right',
    kind: 'fill',
    fill: 'midnight',
    d: 'M454,807 H470 V1196 L454,1157 Z',
    clip: true,
  },
  {
    id: 'ravens-2026-talon-inset-left',
    surface: 'leg-left',
    kind: 'fill',
    fill: 'black',
    d: 'M124,807 H129 V1170 L124,1182 Z',
    clip: true,
  },
  {
    id: 'ravens-2026-talon-inset-right',
    surface: 'leg-right',
    kind: 'fill',
    fill: 'black',
    d: 'M459,807 H464 V1182 L459,1170 Z',
    clip: true,
  },
]);
