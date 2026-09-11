// New York's construction geometry — the monogram path and the sleeve/collar constants only.
// The composable parts definition that consumes them lives in ./giants.parts.ts; the former flat
// GIANTS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).

// White is a literal on home and the throwback. Both palettes are blue over red with no white
// token (home has accent === secondary from ESPN; the throwback's accent is white but is spent on
// the collar and stripe set), so the numerals and the decal need the literal.
export const GIANTS_WHITE = '#FFFFFF';

// The cleanest letterform trace of the set: a bold lowercase monogram over a solid underbar, which
// survives its 35x31px source the way the Bears' C did. Two components (the "n" fused to the bar,
// and the "y"), emitted as one path and painted as a union — the "n" counter is open at the foot,
// so nothing here needs a fill rule. Traced from the helmet bbox (x 65-171, y 32-129 in the
// reference) mapped onto the raw helmet space at ~6.2x.
export const GIANTS_DECAL_MONOGRAM_PATH =
  'M421.6,161.3 L427.8,163.2 L451.3,163.2 L455.7,161.3 L458.7,162.5 L460.0,166.9 L459.4,229.0 L461.8,237.7 L465.6,240.2 L474.2,239.6 L481.1,229.0 L480.4,165.0 L481.7,162.5 L500.9,163.2 L507.1,161.9 L508.9,163.8 L509.6,288.1 L508.3,291.8 L505.8,293.7 L504.0,298.0 L499.0,301.2 L495.3,306.1 L333.6,306.1 L332.3,304.3 L332.3,280.6 L334.8,278.2 L472.4,278.8 L477.3,276.9 L479.8,274.4 L480.4,266.3 L478.6,263.9 L473.6,263.2 L464.3,267.0 L455.7,266.3 L449.5,263.2 L440.8,261.4 L432.7,252.7 L431.5,239.6 L431.5,190.5 L429.6,187.4 L422.2,187.4 L420.3,186.2 L419.1,164.4 L420.3,161.9 L421.6,161.9 Z M321.8,160.7 L326.1,160.7 L327.4,161.9 L353.4,161.9 L354.6,160.7 L359.0,160.7 L363.3,165.6 L368.3,165.6 L374.5,161.3 L391.8,161.3 L404.2,167.5 L409.8,177.5 L409.8,235.9 L412.3,240.2 L419.7,240.9 L421.6,242.7 L421.6,255.2 L422.8,259.5 L420.9,263.2 L389.3,263.2 L383.1,261.4 L381.9,258.9 L381.9,194.2 L380.7,190.5 L374.5,186.8 L365.2,188.0 L362.1,190.5 L360.8,193.6 L360.2,262.6 L358.4,263.9 L334.8,263.9 L332.9,262.6 L332.9,192.4 L330.5,186.8 L321.8,186.8 L319.9,184.9 L319.3,164.4 L321.8,161.3 Z';

// Away's sleeve set: thin, thick, thin. Measured on the away figure (jersey top y=645, sleeve hem
// y=711, figure center x=109.5, so scaleY = 191/66 and scaleX = 264/84.5) — reference y675-678,
// y679-690 and y691-694, all spanning x27-43. Extended outward to x=30 for a flush clip.
export const GIANTS_AWAY_STRIPE_BANDS: [number, number][] = [
  [470, 479],
  [481, 513],
  [516, 525],
];
export const GIANTS_AWAY_SLEEVE_X_LEFT = [30, 86];
export const GIANTS_AWAY_SLEEVE_X_RIGHT = [502, 558];

// The throwback's set sits lower and wider, at the cuff rather than up the sleeve: reference
// y188-191 red, y192-194 white, y196-198 red, spanning x438-458 on a figure whose jersey top is
// y135 and whose center is x519.5.
export const GIANTS_THROWBACK_STRIPE_BANDS: [number, number][] = [
  [536, 548],
  [548, 557],
  [557, 568],
];
export const GIANTS_THROWBACK_SLEEVE_X_LEFT = [30, 102];
export const GIANTS_THROWBACK_SLEEVE_X_RIGHT = [486, 558];

// Only the throwback carries collar trim: a red band with a white core, about 5 reference px
// across, which is roughly 16 mannequin units.
export const GIANTS_COLLAR_OUTER_WIDTH = 18;
export const GIANTS_COLLAR_CORE_WIDTH = 7;
