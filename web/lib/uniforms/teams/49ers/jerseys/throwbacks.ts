import type { CompleteJerseySpec } from '../../core/complete';
import { NINERS_NUMBER_THREE } from '../marks/numbers';
import { NINERS_THROWBACK_SHADOW } from '../marks/jersey-art';

function throwback(body: 'red' | 'white'): CompleteJerseySpec {
  const light = body === 'white';
  return {
    body,
    collar: {
      style: 'inset-v',
      color: body,
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
        { color: light ? 'red' : 'white', size: 'm' },
        { color: light ? 'red' : 'white', size: 'm' },
        { color: light ? 'red' : 'white', size: 'm' },
      ],
      gap: 'broad',
      edge: 'none',
    },
    cuff: 'none',
    sleeveNumber: 'none',
    number: {
      height: 185,
      fill: light ? 'red' : 'white',
      outline: 'black',
      outlineWeight: 'thin',
      texture: 'plain',
      glyphPath: NINERS_NUMBER_THREE,
    },
    marks: [{ paint: 'under', mark: NINERS_THROWBACK_SHADOW }],
  };
}
export const NINERS_THROWBACK_RED = throwback('red');
export const NINERS_THROWBACK_WHITE = throwback('white');
