// Los Angeles' bolt geometry in mannequin space: the sleeve bolts and the shell's large bolt.
//
// The uniform is bolts: one on each shoulder cap and a much larger one on the shell, each a solid
// body inside a contrasting keyline. The pants carry one too, but down the side seam where a
// front-on figure cannot show it, so it is not authored. No sleeve stripe and no collar trim.

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

// The navy alternate's shoulder bolt: a gold edge, then a navy gap, then the white body inside it.
export const CHARGERS_NAVY_BOLT_KEYLINE_LEFT =
  'M62.3,435.4 L80.8,424.6 L99.2,421.5 L103.9,423.1 L110.8,446.1 L116.2,476.2 L127,545.5 L110,508.5 L89.2,458.5 L86.9,457.7 L76.1,479.3 Z';
export const CHARGERS_NAVY_BOLT_GAP_LEFT =
  'M99,426 L106.9,448.2 L114.1,490.6 L113.6,499 L91.4,445.7 L87.5,446 L79.9,458.9 L77.4,459.5 L67.9,436.4 L82.2,429.8 L98.7,426.2 Z';
export const CHARGERS_NAVY_BOLT_BODY_LEFT =
  'M98.2,428.2 L105.3,448.4 L111.9,486.9 L111.4,494.5 L91.3,446.1 L87.7,446.4 L80.8,458.1 L78.5,458.6 L69.9,437.6 L82.9,431.7 L97.9,428.4 Z';
export const CHARGERS_NAVY_BOLT_KEYLINE_RIGHT =
  'M525.7,435.4 L507.2,424.6 L488.8,421.5 L484.1,423.1 L477.2,446.1 L471.8,476.2 L461,545.5 L478,508.5 L498.8,458.5 L501.1,457.7 L511.9,479.3 Z';
export const CHARGERS_NAVY_BOLT_GAP_RIGHT =
  'M489,426 L481.1,448.2 L473.9,490.6 L474.4,499 L496.6,445.7 L500.5,446 L508.1,458.9 L510.6,459.5 L520.1,436.4 L505.8,429.8 L489.3,426.2 Z';
export const CHARGERS_NAVY_BOLT_BODY_RIGHT =
  'M489.8,428.2 L482.7,448.4 L476.1,486.9 L476.6,494.5 L496.7,446.1 L500.3,446.4 L507.2,458.1 L509.5,458.6 L518.1,437.6 L505.1,431.7 L490.1,428.4 Z';
