import { BRONCOS_CHEST_WORDMARK } from '../source';
import { fill } from '../parts';
import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

const spec = expandJersey('broncos-white', {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    inside: 'whiteNeck',
    lining: 'orange',
    outline: true,
    backBar: 'orange',
  },
  shoulderPanel: {
    bands: [
      { color: 'orange', size: 'l' },
      { color: 'navy', size: 'm' },
    ],
  },
  number: { fill: 'navy', outline: 'orange', outlineWeight: 'thin' },
});

export const JERSEY_WHITE: UniformPart = {
  ...spec,
  layers: [
    ...spec.layers,
    fill('broncos-white-wordmark', 'jersey', BRONCOS_CHEST_WORDMARK, 'orange'),
  ],
};
