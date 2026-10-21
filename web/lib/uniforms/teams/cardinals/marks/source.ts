import { numeralMate } from '../../core/marks';

// Arizona's fixed art geometry in mannequin space: the shoulder numerals, the sleeve bands and the
// away numeral keyline colour.

// The away number's black keyline is a construction color with no token — that kit's accent is
// Arizona's gold (#FFB612), which appears nowhere on it.
export const CARDINALS_NUMBER_KEYLINE = '#101820';

// Shoulder 3s wrap over the shoulder tops; the jersey clip hides the portion beyond the front
// silhouette. The right one is the left turned half a turn, never a reflection.
export const CARDINALS_SHOULDER_NUMBER_LEFT =
  'M134.83,394.75 L140.63,416.43 L139.68,423.65 L132.34,425.62 L128.30,420.12 L127.40,426.94 L119.76,428.99 L115.08,422.89 L109.37,401.57 L110.32,394.35 L114.21,393.30 L116.73,402.70 L113.89,403.46 L118.05,418.99 L124.79,417.19 L121.88,406.35 L125.78,405.31 L128.68,416.15 L135.87,414.22 L131.71,398.68 L129.01,399.41 L126.49,390.01 L130.39,388.97Z';
export const CARDINALS_SHOULDER_NUMBER_RIGHT = numeralMate(CARDINALS_SHOULDER_NUMBER_LEFT);

// Away and the black alternate use two horizontal sleeve bands.
// jersey-art.ts fills the gap with the CARDINALS sleeve wordmark.
export const CARDINALS_SLEEVE_BAND_UPPER_LEFT = 'M32,485 L104,485 L104,499 L32,499 Z';
export const CARDINALS_SLEEVE_BAND_UPPER_RIGHT = 'M484,485 L556,485 L556,499 L484,499 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_LEFT = 'M32,540 L104,540 L104,554 L32,554 Z';
export const CARDINALS_SLEEVE_BAND_LOWER_RIGHT = 'M484,540 L556,540 L556,554 L484,554 Z';
