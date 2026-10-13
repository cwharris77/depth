import type { CompleteJerseySpec } from '../../core/complete';
import { RAMS_JERSEY_ROYAL } from './royal';
import { RAMS_JERSEY_WHITE } from './white';
import { RAMS_NUMBER_THREE } from '../marks/numbers';

// Seen from the front the sleeve horn is the same tapering seam band as before; the numerals
// lose their fade.
export const RAMS_JERSEY_ROYAL_2026: CompleteJerseySpec = {
  ...RAMS_JERSEY_ROYAL,
  number: {
    fill: 'yellow',
    outline: 'yellow',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: RAMS_NUMBER_THREE,
    glyphLabel: '3',
  },
};

// The white jersey keeps its royal seam band over the yellow outer sleeve; the numerals gain a
// yellow keyline.
export const RAMS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...RAMS_JERSEY_WHITE,
  number: {
    fill: 'royal',
    outline: 'yellow',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: RAMS_NUMBER_THREE,
    glyphLabel: '3',
  },
};
