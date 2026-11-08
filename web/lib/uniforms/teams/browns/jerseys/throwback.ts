import type { CompleteJerseySpec } from '../../core/complete';
import { BROWNS_JERSEY_WHITE } from './white';

// The 1946 throwback: the white jersey's construction with brown chest numerals outlined in
// orange.
export const BROWNS_JERSEY_THROWBACK: CompleteJerseySpec = {
  ...BROWNS_JERSEY_WHITE,
  number: {
    ...BROWNS_JERSEY_WHITE.number,
    outline: 'orange',
    outlineWeight: 'regular',
  },
};
