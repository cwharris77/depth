import type { CompleteJerseySpec } from '../../core/complete';

// Royal-white-royal sleeve stripes, and white shoulder and chest numerals outlined in royal.
export const BRONCOS_JERSEY_CRUSH: CompleteJerseySpec = {
  body: 'crushOrange',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'royal' },
  sleeveStripes: {
    bands: [
      { color: 'royal', size: 'm' },
      { color: 'white', size: 's' },
      { color: 'royal', size: 'm' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'royal', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
