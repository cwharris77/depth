import { placed } from '../../core/marks';

// A very heavy block numeral with softly rounded outer corners and almost no waist notch.
export const BROWNS_NUMBER_THREE =
  'M256,539 L332,539 Q343,539 343,550 L343,612 L340,616.5 L343,621 L343,683 Q343,694 332,694 L256,694 Q245,694 245,683 L245,646 L282,646 L282,661 L306,661 L306,629.5 L271,629.5 L271,603.5 L306,603.5 L306,572 L282,572 L282,587 L245,587 L245,550 Q245,539 256,539 Z';

// The throwback's orange drop shadow: the 185-unit chest numeral offset 8 units right and down,
// painted under the numeral.
const NUMBER_THREE_SHADOW =
  'M264,547 L340,547 Q351,547 351,560.13 L351,634.13 L348,639.5 L351,644.87 L351,718.87 Q351,732 340,732 L264,732 Q253,732 253,718.87 L253,674.71 L290,674.71 L290,692.61 L314,692.61 L314,655.02 L279,655.02 L279,623.98 L314,623.98 L314,586.39 L290,586.39 L290,604.29 L253,604.29 L253,560.13 Q253,547 264,547 Z';

export const BROWNS_THROWBACK_NUMBER_SHADOW = placed([
  {
    id: 'browns-throwback-number-shadow',
    surface: 'jersey',
    clip: true,
    kind: 'fill',
    fill: 'orange',
    d: NUMBER_THREE_SHADOW,
  },
]);
