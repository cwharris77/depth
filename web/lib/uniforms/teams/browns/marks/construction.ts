// Cleveland's pants art: the brown centre line of the orange-brown-orange leg stripe. Each export
// is a placed mark, emitted exactly as written.
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const centreLine = (id: string, surface: 'leg-left' | 'leg-right', x: number): PartLayer => ({
  id,
  surface,
  d: `M${x},807 H${x + 6} V1196 H${x} Z`,
  clip: true,
  kind: 'fill',
  fill: 'brown',
});

// A six-unit brown line down the middle of the 16-unit orange seam stripe, leaving equal orange
// rails on each side. It stops at the hem.
export const BROWNS_PANTS_CENTRE_LINE = placed([
  centreLine('browns-pants-stripe-center-left', 'leg-left', 123),
  centreLine('browns-pants-stripe-center-right', 'leg-right', 459),
]);
