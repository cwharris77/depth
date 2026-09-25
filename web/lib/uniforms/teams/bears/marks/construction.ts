// Chicago's own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import { BEARS_DECAL_KEYLINE_PATH, BEARS_DECAL_LETTER_PATH } from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const decal = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
  fillRule: 'evenodd',
});

// The wishbone C: the white keyline, then the orange letter over it; both need fill-rule evenodd
// for their counters.
export const BEARS_C_DECAL = placed([
  decal('bears-decal-keyline', BEARS_DECAL_KEYLINE_PATH, 'white'),
  decal('bears-decal-letter', BEARS_DECAL_LETTER_PATH, 'orange'),
]);
