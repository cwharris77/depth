import type { CompleteJerseySpec } from '../../core/complete';
import { BROWNS_THROWBACK_NUMBER_SHADOW } from '../marks/numbers';
import { BROWNS_JERSEY_WHITE } from './white';

// The 1946 throwback: the white jersey's construction with brown chest numerals over an orange
// drop shadow.
export const BROWNS_JERSEY_THROWBACK: CompleteJerseySpec = {
  ...BROWNS_JERSEY_WHITE,
  marks: [{ paint: 'under', mark: BROWNS_THROWBACK_NUMBER_SHADOW }],
};
