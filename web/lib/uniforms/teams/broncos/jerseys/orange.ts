import { BRONCOS_CHEST_WORDMARK } from '../source';
import { fill } from '../parts';
import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

const spec = expandJersey('broncos-orange', {
  body: 'orange',
  collar: {
    style: 'inset-v',
    color: 'orange',
    inside: 'orangeNeck',
    lining: 'navy',
    backBar: 'navy',
  },
  shoulderPanel: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'navy', size: 'm' },
    ],
  },
  number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
});

export const JERSEY_ORANGE: UniformPart = {
  ...spec,
  layers: [
    ...spec.layers,
    fill('broncos-orange-wordmark', 'jersey', BRONCOS_CHEST_WORDMARK, 'navy'),
  ],
};
