import { collar, shoulderWedge } from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_ORANGE: UniformPart = {
  base: 'orange',
  layers: [...shoulderWedge('white', 'navy'), ...collar('navy')],
  number: { fill: 'white', outline: 'navy', outlineWidth: 14 },
};
