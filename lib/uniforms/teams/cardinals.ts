// Arizona's non-decal construction geometry and fixed construction colors. Helmet-mark geometry
// lives in ./cardinals-decals.ts; the composable parts definition that consumes both modules lives
// in ./cardinals.parts.ts. The former flat CARDINALS_UNIFORMS was deleted in the migration that
// proved parts render byte-identically (see parts-parity.test.ts for the one-time gate).
//
// Arizona's construction is unusually spare: no helmet stripe, no shoulder yoke, and no
// contrasting collar.

// The away number's black keyline is a construction color with no token — that kit's accent is
// Arizona's gold (#FFB612), which appears nowhere on it. Black sampled from the GUD composite.
export const CARDINALS_NUMBER_KEYLINE = '#101820';

// Home wears a short white bar canted across the top of each shoulder.
export const CARDINALS_SHOULDER_BAR_LEFT = 'M156,403 L159,423 L91,440 L85,420 Z';
export const CARDINALS_SHOULDER_BAR_RIGHT = 'M432,403 L429,423 L497,440 L503,420 Z';

// Away and the black alternate replace that bar with two horizontal sleeve bands, split by the
// sleeve wordmark the trademark boundary keeps out of the model — hence the gap between them.
export const CARDINALS_SLEEVE_BAND_UPPER_LEFT = 'M32,485 L104,485 L104,499 L32,499 Z';
export const CARDINALS_SLEEVE_BAND_UPPER_RIGHT = 'M484,485 L556,485 L556,499 L484,499 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_LEFT = 'M32,540 L104,540 L104,554 L32,554 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_RIGHT = 'M484,540 L556,540 L556,554 L484,554 Z';
