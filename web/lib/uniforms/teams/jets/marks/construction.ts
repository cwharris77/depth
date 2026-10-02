// New York's own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import { JETS_DECAL_PATH } from './paths';
import { placed } from '../../core/marks';

const wordmark = (id: string, fill: string) =>
  placed([{ id, surface: 'helmet', d: JETS_DECAL_PATH, clip: true, kind: 'fill', fill }]);

// The wordmark: four letterforms with the jet sweeping out of the J, in one fill.
export const JETS_WORDMARK_WHITE = wordmark('jets-decal', 'white');
export const JETS_WORDMARK_GREEN = wordmark('jets-decal', 'green');
