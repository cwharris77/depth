import type { CompleteJerseySpec } from '../../core/complete';

export const JERSEY_LIGHT_BLUE: CompleteJerseySpec = {
  body: 'lightBlue',
  collar: { style: 'rounded', color: 'lightBlue', trim: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'white' },
  number: { fill: 'white', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
