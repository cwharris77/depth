import { cardinalsJerseyDetails } from '../parts';
import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: [
    {
      id: 'cardinals-shoulder-number-left',
      surface: 'sleeve-left',
      d: parts.CARDINALS_SHOULDER_NUMBER_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'cardinals-shoulder-number-right',
      surface: 'sleeve-right',
      d: parts.CARDINALS_SHOULDER_NUMBER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    ...cardinalsJerseyDetails('home'),
  ],
  number: { fill: 'white', outline: 'stitch', outlineWidth: 1.5 },
};
