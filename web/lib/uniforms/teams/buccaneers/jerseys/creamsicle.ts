import type { CompleteJerseySpec } from '../../core/complete';
import { buccaneersCreamCuff } from '../marks/construction';

export const BUCCANEERS_JERSEY_CREAMSICLE: CompleteJerseySpec = {
  body: 'creamOrange',
  collar: {
    style: 'inset-v',
    color: 'creamOrange',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'creamOrange',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'crimson', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: buccaneersCreamCuff('crimson', 'white') }],
};
