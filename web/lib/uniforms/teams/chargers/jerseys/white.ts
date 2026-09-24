import * as parts from '../parts';
import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

const spec = expandJersey('chargers-white', {
  body: 'white',
  collar: { style: 'inset-v', color: 'white', outline: true },
  number: { fill: 'powderBlue', outline: 'gold', outlineWeight: 'thin' },
});

export const JERSEY_WHITE: UniformPart = {
  ...spec,
  layers: [...parts.bolts('powderBlue', 'gold'), ...spec.layers],
};
