import type { CompleteJerseySpec } from '../../core/complete';
import { ramsRivalriesSleeveHorn } from '../marks/construction';
import { RAMS_NUMBER_THREE } from '../marks/numbers';

// Near-black body with a body-coloured collar and white meshed numerals. The front-facing horn tapers beside a blue sleeve panel.
export const RAMS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'white',
    outline: 'royal',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: RAMS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: ramsRivalriesSleeveHorn('yellow', 'royal') }],
};
