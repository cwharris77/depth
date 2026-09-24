// Los Angeles' construction geometry — the bolt paths and the white construction literal only. The
// composable parts definition that consumes them lives in ./chargers.parts.ts; the former flat
// CHARGERS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).
//
// All three kits are ONE construction, and the uniform is bolts: one on each shoulder cap and a much
// larger one on the shell, each a solid body inside a contrasting keyline. The pants carry one too,
// but down the side seam where a front-on figure cannot show it, so it is not authored here. No
// sleeve stripe and no collar trim.

// White is a literal on the home kit only. Its palette is powder blue over gold with accent ===
// secondary (ESPN supplies only two colors), so nothing resolves to the shell, the sleeve bolt's
// keyline, or the numeral face. The powder-blue kit carries white in `accent` and the away in
// `primary`, so neither needs it.
export const CHARGERS_WHITE = '#FFFFFF';

// Each sleeve bolt is a broad angled band with a second point below it. The keyline extends below
// the shorter body, leaving the lower taper in the keyline colour.
export const CHARGERS_BOLT_KEYLINE_LEFT =
  'M54,431 L78,417 L102,413 L108,415 L117,445 L124,484 L138,574 L116,526 L89,461 L86,460 L72,488 Z';
export const CHARGERS_BOLT_KEYLINE_RIGHT =
  'M534,431 L510,417 L486,413 L480,415 L471,445 L464,484 L450,574 L472,526 L499,461 L502,460 L516,488 Z';
export const CHARGERS_BOLT_BODY_LEFT =
  'M101.7,418.8 L111.9,447.7 L121.3,502.7 L120.6,513.6 L91.8,444.4 L86.7,444.8 L76.9,461.5 L73.6,462.3 L61.3,432.3 L79.9,423.8 L101.3,419.1 Z';
export const CHARGERS_BOLT_BODY_RIGHT =
  'M486.3,418.8 L476.1,447.7 L466.7,502.7 L467.4,513.6 L496.2,444.4 L501.3,444.8 L511.1,461.5 L514.4,462.3 L526.7,432.3 L508.1,423.8 L486.7,419.1 Z';
// The shell mark, traced from the shell in the 2025 composite itself rather than from the
// club's logo file. The logo IS this bolt, but flat: 2.48 aspect with short blunt tails against the
// decal's 1.71 and long swept ones, because a decal applied around a curved shell arches far more in
// side profile. Fitting the logo into the decal's box gets the extents right and the drawing wrong —
// every stroke thickens with the stretch. Two shapes, this blue keyline under the gold body; the
// real helmet's third, outer white keyline is invisible on a white shell and is not authored (a
// navy-shell kit would need it). ONE component each, no enclosed hole, so no fill rule.
// Regenerate with scripts/uniform-draw/chargers_bolt.py.
export const CHARGERS_DECAL_KEYLINE_PATH =
  'M437.8,115.4 L514.0,121.9 L583.0,147.7 L636.8,188.1 L662.5,220.5 L672.1,242.3 L649.6,230.2 L640.0,230.2 L638.4,223.7 L626.4,217.2 L620.7,218.8 L593.5,205.1 L509.2,187.3 L502.0,192.2 L515.6,206.7 L514.0,210.8 L480.3,205.9 L445.8,206.7 L404.1,210.8 L351.1,224.5 L342.3,234.2 L352.7,237.4 L352.7,243.1 L300.6,268.9 L239.6,322.3 L208.3,361.9 L184.2,403.1 L183.4,357.8 L196.2,311.0 L215.5,272.2 L250.8,226.9 L239.6,218.8 L237.2,210.8 L276.5,180.0 L310.2,160.7 L363.2,141.3 L388.0,137.2 L389.6,131.6 L382.4,125.1 L384.0,121.1 L437.0,116.2 Z';
export const CHARGERS_DECAL_BOLT_PATH =
  'M454.6,129.9 L506.0,135.6 L563.8,155.0 L597.5,174.4 L629.6,203.5 L554.9,178.4 L474.7,170.4 L469.1,177.6 L478.7,190.6 L429.8,191.4 L343.9,210.0 L311.8,222.9 L310.2,231.0 L322.2,240.7 L303.8,248.7 L267.7,274.6 L202.7,342.5 L209.9,315.8 L229.1,278.6 L274.1,225.3 L274.1,218.8 L262.0,212.4 L281.3,194.6 L349.5,161.5 L421.7,148.5 L425.7,142.1 L417.7,133.2 L453.8,130.8 Z';

// The shared athletic 3 fitted to the navy shell's visible side panel.
export const CHARGERS_HELMET_NUMBER_THREE =
  'M312.6,268 L365.4,268 L381.2,281.1 L381.2,316.9 L366.3,328.5 L381.2,340.9 L381.2,378.2 L364.5,392 L312.6,392 L296.8,378.9 L296.8,359.9 L319.6,359.9 L319.6,373.8 L357.5,373.8 L357.5,340.9 L331.1,340.9 L331.1,322 L357.5,322 L357.5,287 L319.6,287 L319.6,300.1 L296.8,300.1 L296.8,281.1 Z';
