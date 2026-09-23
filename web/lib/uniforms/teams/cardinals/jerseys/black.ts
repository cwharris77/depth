import type { UniformPart } from '../../core/parts';

export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...sleeveBands('cardinal'), ...cardinalsJerseyDetails('black')],
  number: { fill: 'cardinal', outline: 'white', outlineWidth: 3 },
};
