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

// Every mark here is traced the same way and for the same reason: the keyline is traced as the union
// of keyline AND body with holes filled, and the body is painted over it, so the outline stays
// continuous instead of breaking into slivers wherever the body touches it. The antialiased seam
// between two inks matches neither colour, which is what the hole fill absorbs.
export const CHARGERS_BOLT_KEYLINE_LEFT =
  'M103.2,415.8 L106.8,419.2 L110.7,441.6 L112.8,444.7 L117.7,496.1 L112.3,470.3 L108.9,438.5 L102.9,416.0 Z M99.8,417.2 L107.1,440.9 L113.8,486.0 L113.3,494.9 L92.7,438.2 L89.1,438.5 L82.1,452.2 L79.7,452.9 L70.9,428.3 L84.2,421.3 L99.5,417.5 Z M69.1,429.8 L77.9,455.8 L83.6,454.4 L84.4,450.3 L90.4,440.4 L91.7,440.9 L110.4,496.3 L114.6,501.9 L118.0,501.2 L119.0,503.1 L119.6,532.5 L112.0,501.2 L93.3,449.8 L88.6,449.6 L78.7,465.7 L68.8,438.2 L68.8,430.0 Z';
export const CHARGERS_BOLT_KEYLINE_RIGHT =
  'M484.8,415.8 L481.2,419.2 L477.3,441.6 L475.2,444.7 L470.3,496.1 L475.7,470.3 L479.1,438.5 L485.1,416.0 Z M488.2,417.2 L480.9,440.9 L474.2,486.0 L474.7,494.9 L495.3,438.2 L498.9,438.5 L505.9,452.2 L508.3,452.9 L517.1,428.3 L503.8,421.3 L488.5,417.5 Z M518.9,429.8 L510.1,455.8 L504.4,454.4 L503.6,450.3 L497.6,440.4 L496.3,440.9 L477.6,496.3 L473.4,501.9 L470.0,501.2 L469.0,503.1 L468.4,532.5 L476.0,501.2 L494.7,449.8 L499.4,449.6 L509.3,465.7 L519.2,438.2 L519.2,430.0 Z';
export const CHARGERS_BOLT_BODY_LEFT =
  'M99.8,417.2 L107.1,440.9 L113.8,486.0 L113.3,494.9 L92.7,438.2 L89.1,438.5 L82.1,452.2 L79.7,452.9 L70.9,428.3 L84.2,421.3 L99.5,417.5 Z';
export const CHARGERS_BOLT_BODY_RIGHT =
  'M488.2,417.2 L480.9,440.9 L474.2,486.0 L474.7,494.9 L495.3,438.2 L498.9,438.5 L505.9,452.2 L508.3,452.9 L517.1,428.3 L503.8,421.3 L488.5,417.5 Z';
// The shell mark, traced from the shell in the 2025 GUD composite itself rather than from the
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
