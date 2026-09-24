import * as parts from '../parts';
import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

const spec = expandJersey('chargers-gold', {
  body: 'gold',
  collar: { style: 'inset-v', color: 'gold', outline: true },
  number: { fill: 'white', outline: 'powderBlue', outlineWeight: 'thin' },
});

export const JERSEY_GOLD: UniformPart = {
  ...spec,
  layers: [...parts.bolts('powderBlue', 'white'), ...spec.layers],
};
