// Washington's construction geometry — the "W" decal path, the sleeve-band bounds, and the white
// construction literal only. The composable parts definition that consumes them lives in
// ./commanders.parts.ts; the former flat COMMANDERS_UNIFORMS was deleted in the migration that
// proved parts render byte-identically (see parts-parity.test.ts for the one-time gate).
//
// One construction: a broad band at the sleeve cap split by a thinner line through its middle. No
// collar trim, no helmet stripe, no pant stripe.

// White is a literal on the home kit only. Its palette is burgundy over gold with accent ===
// secondary (ESPN supplies only two colors), so nothing resolves to the line through the band or to
// the numeral keyline.
export const COMMANDERS_WHITE = '#FFFFFF';

// The placed outer and shell-colored inner layers are generated from the supplied SVG.
import { COMMANDERS_DECAL_INNER_PATH, COMMANDERS_DECAL_OUTER_PATH } from './commanders-decal';
export { COMMANDERS_DECAL_INNER_PATH };
export const COMMANDERS_DECAL_PATH = COMMANDERS_DECAL_OUTER_PATH;

// The sleeve band, measured on the home figure. A column crosses gold y432-441, white y442-446 and
// gold y447-456. Extended outward to x=30 for a flush clip.
export const COMMANDERS_BOUNDS = [467, 496, 510, 539];
export const COMMANDERS_SLEEVE_X_LEFT = [30, 89];
export const COMMANDERS_SLEEVE_X_RIGHT = [499, 558];
