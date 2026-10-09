// Tampa Bay's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import { BUCCANEERS_CREAMSICLE_DECAL_PATHS, BUCCANEERS_FLAG_DECAL_PATHS } from './decal';
import {
  BUCCANEERS_CREAM_BOUNDS,
  BUCCANEERS_CUFF_LEFT,
  BUCCANEERS_CUFF_RIGHT,
  BUCCANEERS_SLEEVE_X_LEFT,
  BUCCANEERS_SLEEVE_X_RIGHT,
} from './paths';
import { BUCCANEERS_SHIP } from './ship';
import { placed, type Mark, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

const sleeveFill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The flag fills the side panel; the source canvas includes padding around the artwork.
export const BUCCANEERS_FLAG_DECAL: PlacedMark = placed(
  BUCCANEERS_FLAG_DECAL_PATHS.map(({ d, fill }, index) => ({
    id: `buccaneers-flag-svg-${String(index + 1).padStart(3, '0')}`,
    surface: 'helmet',
    d: d.replace(
      /[ML]([\d.]+),([\d.]+)/g,
      (point, x, y) =>
        `${point[0]}${(460 + (Number(x) - 388) * 1.9).toFixed(3)},${(275 + (Number(y) - 236) * 1.9).toFixed(3)}`
    ),
    clip: true,
    kind: 'fill',
    fill,
  }))
);

// The creamsicle shell's decal, painted in source order.
export const BUCCANEERS_CREAMSICLE_DECAL: PlacedMark = placed(
  BUCCANEERS_CREAMSICLE_DECAL_PATHS.map(({ d, fill }, index) => ({
    id: `buccaneers-creamsicle-svg-${String(index + 1).padStart(2, '0')}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

// A single solid band at the sleeve hem, left sleeve before right.
export function buccaneersCuff(color: string): PlacedMark {
  return placed([
    sleeveFill('buccaneers-cuff-left', 'sleeve-left', BUCCANEERS_CUFF_LEFT, color),
    sleeveFill('buccaneers-cuff-right', 'sleeve-right', BUCCANEERS_CUFF_RIGHT, color),
  ]);
}

// The creamsicle's three-band cuff: `band` over `line` over `band`, each band left then right.
export function buccaneersCreamCuff(band: string, line: string): PlacedMark {
  const layers: PartLayer[] = [];
  const sides: [UniformSurface, string, readonly number[]][] = [
    ['sleeve-left', 'left', BUCCANEERS_SLEEVE_X_LEFT],
    ['sleeve-right', 'right', BUCCANEERS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < BUCCANEERS_CREAM_BOUNDS.length - 1; i += 1) {
    const top = BUCCANEERS_CREAM_BOUNDS[i];
    const bottom = BUCCANEERS_CREAM_BOUNDS[i + 1];
    for (const [surface, side, [x0, x1]] of sides) {
      layers.push(
        sleeveFill(
          `buccaneers-cream-band-${i}-${side}`,
          surface,
          `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
          i === 1 ? line : band
        )
      );
    }
  }
  return placed(layers);
}

// Offset the side-facing ship around the sleeve; the front silhouette clips its outer half.
export const BUCCANEERS_SLEEVE_SHIP: Mark = {
  ...BUCCANEERS_SHIP,
  box: [
    BUCCANEERS_SHIP.box[0] - 280,
    BUCCANEERS_SHIP.box[1],
    BUCCANEERS_SHIP.box[2] - 280,
    BUCCANEERS_SHIP.box[3],
  ],
};
