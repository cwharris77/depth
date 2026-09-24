import * as parts from '../parts';
import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

const spec = expandJersey('chargers-powder', {
  body: 'powderBlue',
  collar: { style: 'inset-v', color: 'powderBlue', outline: true },
  number: { fill: 'white', outline: 'gold', outlineWeight: 'thin' },
});

export const JERSEY_POWDER: UniformPart = {
  ...spec,
  layers: [...parts.bolts('white', 'gold'), ...spec.layers],
};
