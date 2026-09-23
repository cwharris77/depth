import type { UniformPart } from '../../core/parts';
import {
  STEELERS_BUMBLEBEE_CHEVRON_PATH,
  STEELERS_BUMBLEBEE_CHEVRON_WIDTH,
  STEELERS_BUMBLEBEE_PINSTRIPE_XS,
  STEELERS_BUMBLEBEE_TORSO_PATH,
} from '../source';
import { LEGACY_ROUNDED_COLLAR_PATH } from '../../core/shared';
import { fill } from '../parts';

export const JERSEY_BUMBLEBEE: UniformPart = {
  base: 'gold',
  layers: [
    fill('steelers-bumblebee-torso', 'jersey', STEELERS_BUMBLEBEE_TORSO_PATH, 'black'),
    {
      id: 'steelers-bumblebee-chevron',
      surface: 'jersey',
      d: STEELERS_BUMBLEBEE_CHEVRON_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'black',
      strokeWidth: STEELERS_BUMBLEBEE_CHEVRON_WIDTH,
    },
    ...STEELERS_BUMBLEBEE_PINSTRIPE_XS.map((x, i) =>
      fill(
        `steelers-bumblebee-pinstripe-${i}`,
        'jersey',
        `M${x},505 H${x + 6} V806 H${x} Z`,
        'gold'
      )
    ),
    {
      id: 'steelers-bumblebee-collar',
      surface: 'collar',
      d: LEGACY_ROUNDED_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'gold',
      strokeWidth: 13,
    },
  ],
  number: { fill: 'white', outline: 'black', outlineWidth: 26 },
};
