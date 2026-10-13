import { placed, type PlacedMark } from '../../core/marks';

const leftHorn =
  'M94,391 C40,385 8,416 8,462 C8,512 44,544 81,527 C105,516 113,484 96,464 C85,451 65,454 60,470 C75,461 91,475 85,491 C79,508 54,507 38,490 C18,467 23,432 48,416 C64,406 79,406 94,411 Z';
// The horn's base, a band along the top of the shoulder from the collar out to the curl.
const leftBase = 'M14,452 L204,414 L204,360 L14,360 Z';
const leftCap = 'M0,380 L118,395 L106,544 L0,544 Z';
const mirrored = (path: string) => path.replace(/(-?\d+),/g, (_, x) => `${588 - Number(x)},`);

function sleeveHorns(color: string, cap: boolean): PlacedMark {
  return placed(
    ['left', 'right'].flatMap((side) => {
      const path = (d: string) => (side === 'left' ? d : mirrored(d));
      const surface = side === 'left' ? ('sleeve-left' as const) : ('sleeve-right' as const);
      return [
        ...(cap
          ? [
              {
                id: `rams-2026-cap-${side}`,
                surface,
                kind: 'fill' as const,
                fill: 'yellow',
                clip: true,
                d: path(leftCap),
              },
            ]
          : []),
        {
          id: `rams-2026-horn-${side}`,
          surface,
          kind: 'fill' as const,
          fill: color,
          clip: true,
          d: path(leftHorn),
        },
        ...(cap
          ? []
          : [
              {
                id: `rams-2026-horn-base-${side}`,
                surface,
                kind: 'fill' as const,
                fill: color,
                clip: true,
                d: path(leftBase),
              },
            ]),
      ];
    })
  );
}

export const RAMS_2026_HOME_HORNS = sleeveHorns('yellow', false);
export const RAMS_2026_AWAY_HORNS = sleeveHorns('royal', true);
