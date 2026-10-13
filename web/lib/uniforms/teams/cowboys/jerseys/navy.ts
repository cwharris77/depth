import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { COWBOYS_SLEEVE_STAR } from '../marks/construction';
import { COWBOYS_NUMBER_THREE } from '../marks/numbers';

// Navy body, a white-over-silver neck band and rounded collar, a white-edged silver sleeve band
// with the sleeve star over its outer end, white numerals.
export const COWBOYS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'deepNavy',
  collar: {
    style: 'inset-v',
    color: 'silver',
    trim: 'none',
    inside: 'body',
    lining: 'white',
    backBar: 'white',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: { bands: [{ color: 'silver', size: 'm' }], gap: 'none', edge: 'white' },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'white',
    outline: 'deepNavy',
    outlineWeight: 'thin',
    outerOutline: 'white',
    texture: 'mesh',
    glyphPath: COWBOYS_NUMBER_THREE,
  },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: COWBOYS_SLEEVE_STAR,
      anchor: 'sleeves',
      slots: { edge: 'deepNavy', keyline: 'white', star: 'deepNavy' },
      id: 'sleeve-star',
    }),
  ],
};
