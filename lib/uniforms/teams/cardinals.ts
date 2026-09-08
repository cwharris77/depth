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

// Shoulder 3s face opposite directions and wrap over the shoulder tops; the jersey clip
// hides the portion beyond the front silhouette.
export const CARDINALS_SHOULDER_NUMBER_LEFT =
  'M134.83,394.75 L140.63,416.43 L139.68,423.65 L132.34,425.62 L128.30,420.12 L127.40,426.94 L119.76,428.99 L115.08,422.89 L109.37,401.57 L110.32,394.35 L114.21,393.30 L116.73,402.70 L113.89,403.46 L118.05,418.99 L124.79,417.19 L121.88,406.35 L125.78,405.31 L128.68,416.15 L135.87,414.22 L131.71,398.68 L129.01,399.41 L126.49,390.01 L130.39,388.97Z';
export const CARDINALS_SHOULDER_NUMBER_RIGHT =
  'M447.37,416.43 L453.17,394.75 L457.61,388.97 L464.95,390.94 L465.70,397.72 L469.89,392.26 L477.53,394.31 L478.54,401.93 L472.83,423.25 L468.39,429.03 L464.49,427.99 L467.01,418.59 L469.86,419.36 L474.02,403.82 L467.28,402.02 L464.38,412.85 L460.48,411.81 L463.39,400.97 L456.20,399.05 L452.03,414.58 L454.73,415.30 L452.21,424.70 L448.32,423.65Z';

// Away and the black alternate use two horizontal sleeve bands.
// cardinals-jersey.ts fills the gap with the approved CARDINALS sleeve wordmark.
export const CARDINALS_SLEEVE_BAND_UPPER_LEFT = 'M32,485 L104,485 L104,499 L32,499 Z';
export const CARDINALS_SLEEVE_BAND_UPPER_RIGHT = 'M484,485 L556,485 L556,499 L484,499 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_LEFT = 'M32,540 L104,540 L104,554 L32,554 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_RIGHT = 'M484,540 L556,540 L556,554 L484,554 Z';
