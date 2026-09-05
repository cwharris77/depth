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

// The "W", traced from the home figure's shell. One layer and four subpaths: the mark is four flat
// gold strokes separated by shell-colored gaps, with no keyline and no interior detail — the
// simplest decal of the 32.
export const COMMANDERS_DECAL_PATH =
  'M531.6,143.2 L589.7,143.2 L591.2,148.7 L586.1,157.0 L549.0,271.2 L544.7,274.0 L500.3,274.0 L498.1,269.8 L501.0,260.8 L535.2,166.0 L535.2,152.2 L530.8,143.9 Z M336.7,143.2 L393.4,144.6 L405.1,178.5 L405.8,192.3 L382.5,256.0 L378.9,254.6 L378.2,244.9 L353.5,173.0 L336.0,143.9 Z M443.6,143.2 L490.9,143.2 L509.8,192.3 L509.8,199.9 L485.0,268.5 L446.5,152.9 L442.1,148.0 L442.9,143.9 Z M431.2,155.0 L434.9,157.7 L457.4,229.0 L440.0,273.3 L392.0,274.0 L390.5,270.5 L394.9,266.4 L430.5,155.7 Z';

// The sleeve band, measured on the home figure. A column crosses gold y432-441, white y442-446 and
// gold y447-456. Extended outward to x=30 for a flush clip.
export const COMMANDERS_BOUNDS = [467, 496, 510, 539];
export const COMMANDERS_SLEEVE_X_LEFT = [30, 89];
export const COMMANDERS_SLEEVE_X_RIGHT = [499, 558];
