import { collar, shoulderWedge } from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulderWedge('orange', 'navy'), ...collar('orange')],
  number: { fill: 'navy', outline: 'orange', outlineWidth: 14 },
};
