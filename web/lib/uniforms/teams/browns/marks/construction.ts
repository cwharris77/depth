// Cleveland's helmet and pants art: the three-band crown stripes and the centre line of each
// three-band leg stripe. Each export is a placed mark, emitted exactly as written.
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { seatedCrownStripe } from '../../core/shared';

// The orange shell's brown-white-brown centre stripe.
export const BROWNS_ORANGE_HELMET_STRIPE = placed(
  seatedCrownStripe([
    { id: 'browns-helmet-crown-brown-top', fill: 'brown', weight: 1 },
    { id: 'browns-helmet-crown-white', fill: 'white', weight: 1 },
    { id: 'browns-helmet-crown-brown-bottom', fill: 'brown', weight: 1 },
  ])
);

// The 2021 throwback orange shell's single white centre stripe, a third of the three-band width:
// the outer bands are shell-coloured.
export const BROWNS_THROWBACK_HELMET_STRIPE = placed(
  seatedCrownStripe([
    { id: 'browns-helmet-crown-orange-top', fill: 'orange', weight: 1 },
    { id: 'browns-helmet-crown-white', fill: 'white', weight: 1 },
    { id: 'browns-helmet-crown-orange-bottom', fill: 'orange', weight: 1 },
  ])
);

// The white shell's brown-orange-brown centre stripe.
export const BROWNS_WHITE_HELMET_STRIPE = placed(
  seatedCrownStripe([
    { id: 'browns-helmet-crown-brown-top', fill: 'brown', weight: 1 },
    { id: 'browns-helmet-crown-orange', fill: 'orange', weight: 1 },
    { id: 'browns-helmet-crown-brown-bottom', fill: 'brown', weight: 1 },
  ])
);

const centreLine = (
  id: string,
  surface: 'leg-left' | 'leg-right',
  x: number,
  fill: string
): PartLayer => ({
  id,
  surface,
  d: `M${x},807 H${x + 6} V1196 H${x} Z`,
  clip: true,
  kind: 'fill',
  fill,
});

// A six-unit line down the middle of the 16-unit seam stripe, leaving equal rails on each side.
// It stops at the hem.
const centreLines = (fill: string) =>
  placed([
    centreLine('browns-pants-stripe-center-left', 'leg-left', 123, fill),
    centreLine('browns-pants-stripe-center-right', 'leg-right', 459, fill),
  ]);

// Brown over the orange stripe on the white pants: orange-brown-orange.
export const BROWNS_PANTS_CENTRE_LINE = centreLines('brown');

// White over the brown stripe on the orange pants: brown-white-brown.
export const BROWNS_ORANGE_PANTS_CENTRE_LINE = centreLines('white');
