import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBands('cardinal'), ...cardinalsJerseyDetails('away')],
  number: { fill: 'cardinal', outline: 'numberKeyline', outlineWidth: 3 },
};
