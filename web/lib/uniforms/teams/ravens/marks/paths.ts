// Baltimore's shoulder-bar and sleeve-band geometry in mannequin space. Sleeve paths use the outer
// 588-wide mannequin space; right paths mirror the left across the centerline x=294.

// The shoulder bar is a short bar tilted about 4px over its length, which is the shoulder slope.
// A gold keyline path sits under a smaller face path.
export const RAVENS_SHOULDER_OUTER_LEFT = 'M93,424 L168,412 L168,427 L93,439 Z';
export const RAVENS_SHOULDER_OUTER_RIGHT = 'M495,424 L420,412 L420,427 L495,439 Z';
export const RAVENS_SHOULDER_INNER_LEFT = 'M99,427 L164,415 L164,424 L99,436 Z';
export const RAVENS_SHOULDER_INNER_RIGHT = 'M489,427 L424,415 L424,424 L489,436 Z';

// The sleeve band runs well past the hem and the outer edge so the jersey clip trims it flush.
export const RAVENS_SLEEVE_BAND_LEFT = 'M30,548 H133 V576 H30 Z';
export const RAVENS_SLEEVE_BAND_RIGHT = 'M558,548 H455 V576 H558 Z';
