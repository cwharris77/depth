import type { CompleteJerseySpec } from '../../core/complete';
import { ramsFullSleeveHorn } from '../marks/construction';

// Sol body with a body-coloured collar, three royal stripes near each sleeve hem and flat royal
// block numerals.
export const RAMS_JERSEY_CLASSIC_SOL: CompleteJerseySpec = {
  body: 'yellow',
  collar: {
    style: 'inset-v',
    color: 'yellow',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: {
    bands: [
      { color: 'royal', size: 's' },
      { color: 'royal', size: 's' },
      { color: 'royal', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
    position: 'hem',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { height: 190, fill: 'royal', outline: 'royal', outlineWeight: 'none', texture: 'plain' },
  marks: [],
};

// White body with a navy collar, a royal horn curving over each shoulder, sleeve TV numbers and
// royal block numerals keylined in navy.
export const RAMS_JERSEY_FEARSOME_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'navy',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'royal', outline: 'navy' },
  number: { height: 190, fill: 'royal', outline: 'navy', outlineWeight: 'thin', texture: 'plain' },
  marks: [{ paint: 'over', mark: ramsFullSleeveHorn('royal') }],
};
