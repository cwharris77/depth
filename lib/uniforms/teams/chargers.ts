// Los Angeles' construction geometry — the bolt paths and the white construction literal only. The
// composable parts definition that consumes them lives in ./chargers.parts.ts; the former flat
// CHARGERS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).
//
// All three kits are ONE construction, and the whole uniform is bolts: one on each shoulder cap, a
// much larger one on the shell, and one down each pant leg, each a solid body inside a contrasting
// keyline. Two different drawings, though — the shell wears the club's arched logo bolt, the sleeves
// and pants a straight symmetric one. No sleeve stripe and no collar trim.

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
// The shell mark: the club's logo bolt, re-authored from Commons `File:Los Angeles Chargers
// logo.svg` (public domain) rather than traced off the composite's 93px helmet, with placement
// measured from that composite. The logo is three stacked shapes — an outer white keyline, this
// blue one, the gold body — and the outer white is invisible on a white shell, so it is not
// authored; a navy-shell kit would need it. ONE component, no enclosed hole, so no fill rule.
// Regenerate with scripts/uniform-draw/chargers_bolt.py.
export const CHARGERS_DECAL_KEYLINE_PATH =
  'M428.7,117.0 L446.3,120.2 L469.5,127.5 L486.4,134.8 L508.6,147.4 L520.8,155.7 L541.0,172.5 L557.5,189.2 L572.7,207.5 L582.8,221.6 L590.2,233.2 L602.0,254.1 L610.1,270.8 L621.2,298.5 L627.6,318.4 L634.4,345.6 L638.7,372.3 L640.8,398.5 L626.3,372.8 L612.1,350.9 L599.0,332.5 L579.8,309.0 L563.6,291.7 L546.7,276.0 L529.9,262.4 L514.7,252.0 L509.6,248.8 L509.3,249.9 L519.8,286.5 L519.4,286.5 L505.6,276.6 L489.4,266.6 L472.6,257.7 L459.8,252.0 L444.2,246.2 L428.1,241.5 L409.5,237.9 L396.7,236.8 L396.4,236.3 L389.3,236.3 L389.0,235.8 L364.7,235.8 L364.4,236.3 L364.4,237.3 L376.8,257.7 L367.1,258.8 L351.6,261.9 L335.4,266.6 L321.6,271.9 L308.1,278.1 L292.2,287.0 L277.4,297.0 L264.6,306.9 L243.4,326.3 L223.8,347.7 L206.3,370.2 L187.7,397.9 L189.1,386.4 L191.8,370.7 L194.8,357.1 L199.2,340.9 L203.6,327.3 L210.3,309.5 L216.1,296.4 L224.1,280.2 L230.9,268.2 L243.7,248.3 L253.8,234.7 L271.0,214.8 L293.2,193.9 L282.8,179.3 L281.1,176.7 L281.4,176.1 L288.2,169.9 L299.0,161.5 L313.1,152.6 L323.6,147.4 L337.7,141.6 L355.9,136.4 L374.5,133.2 L398.7,132.2 L399.1,132.7 L407.5,132.7 L407.8,133.2 L420.3,134.3 L431.1,136.4 L435.5,137.9 L435.8,136.9 L434.8,133.8 L428.7,117.5 Z';
export const CHARGERS_DECAL_BOLT_PATH =
  'M451.3,141.1 L463.1,144.2 L481.0,151.5 L494.8,158.9 L508.0,167.2 L530.5,185.0 L540.0,193.9 L555.5,210.7 L571.3,231.1 L585.1,252.5 L594.6,269.8 L602.0,285.5 L609.8,304.8 L614.8,320.0 L619.2,336.7 L610.4,322.6 L599.3,307.4 L586.2,291.7 L569.6,274.5 L551.1,257.7 L538.6,247.8 L523.8,237.3 L511.0,229.5 L499.9,223.7 L488.1,219.0 L487.7,219.6 L488.1,222.2 L495.8,248.8 L496.2,250.4 L495.8,250.4 L487.7,245.2 L473.6,237.9 L447.3,227.4 L419.6,220.1 L407.2,218.0 L391.7,216.9 L391.3,216.4 L364.7,216.9 L364.4,217.5 L353.6,218.5 L340.4,221.6 L339.4,223.2 L351.2,243.1 L333.0,247.8 L317.2,254.1 L293.9,266.1 L277.4,276.6 L253.8,294.4 L238.6,308.0 L225.5,321.6 L218.4,329.9 L214.0,336.2 L220.1,319.5 L230.2,298.0 L239.6,281.3 L253.1,260.9 L268.6,241.0 L283.5,224.8 L300.7,209.1 L314.1,199.2 L302.0,180.3 L310.4,174.0 L318.2,169.3 L327.3,164.6 L338.7,159.9 L359.3,154.2 L372.1,152.1 L376.8,152.1 L377.2,151.5 L399.1,151.0 L399.4,151.5 L407.2,151.5 L407.5,152.1 L419.3,153.1 L437.8,157.3 L450.3,161.5 L459.8,165.7 L460.1,164.6 L451.7,141.6 Z';

// The pant bolt, one per leg. GUD draws it only in the leg swatch beside each figure, never on the
// figure itself, whose legs render flat — reading the figures alone is what shipped these pants
// unmarked. Every one of the four pant colours carries it. Same two-part construction as the shell
// mark, a keyline under a solid body, but a DIFFERENT bolt: straight and symmetric, not the arched
// logo. Traced and placed by scripts/uniform-draw/chargers_bolt.py.
export const CHARGERS_LEG_KEYLINE_LEFT =
  'M143.0,957.4 L144.0,958.7 L144.7,972.9 L146.4,1059.5 L152.6,1051.4 L150.2,1103.3 L153.3,1101.7 L153.1,1114.6 L147.0,1248.5 L145.7,1245.3 L145.0,1229.5 L143.3,1147.7 L142.3,1147.4 L139.3,1156.1 L137.6,1155.5 L139.3,1105.5 L137.3,1108.1 L136.4,1106.8 L142.8,957.7 Z';
export const CHARGERS_LEG_KEYLINE_RIGHT =
  'M445.0,957.4 L444.0,958.7 L443.3,972.9 L441.6,1059.5 L435.4,1051.4 L437.8,1103.3 L434.7,1101.7 L434.9,1114.6 L441.0,1248.5 L442.3,1245.3 L443.0,1229.5 L444.7,1147.7 L445.7,1147.4 L448.7,1156.1 L450.4,1155.5 L448.7,1105.5 L450.7,1108.1 L451.6,1106.8 L445.2,957.7 Z';
export const CHARGERS_LEG_BOLT_LEFT =
  'M142.8,1009.6 L144.3,1068.2 L145.9,1069.2 L149.7,1062.1 L148.2,1083.6 L148.0,1108.1 L147.0,1113.9 L148.2,1115.2 L150.9,1110.4 L149.7,1116.5 L146.9,1197.3 L145.4,1140.3 L143.5,1138.7 L139.8,1146.8 L141.1,1134.8 L141.3,1107.2 L142.5,1096.5 L142.0,1093.6 L140.5,1095.6 L139.6,1093.9 L142.8,1009.9 Z';
export const CHARGERS_LEG_BOLT_RIGHT =
  'M445.2,1009.6 L443.7,1068.2 L442.1,1069.2 L438.3,1062.1 L439.8,1083.6 L440.0,1108.1 L441.0,1113.9 L439.8,1115.2 L437.1,1110.4 L438.3,1116.5 L441.1,1197.3 L442.6,1140.3 L444.5,1138.7 L448.2,1146.8 L446.9,1134.8 L446.7,1107.2 L445.5,1096.5 L446.0,1093.6 L447.5,1095.6 L448.4,1093.9 L445.2,1009.9 Z';
