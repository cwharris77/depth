// Denver's construction geometry — the horse and Orange-Crush "D" decal paths, the shoulder
// wedge and sleeve-band paths, the collar arcs, and the construction color literal only. The
// composable parts definition that consumes them lives in ./broncos.parts.ts; the former flat
// BRONCOS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).
//
// READ THE STALE-PALETTE NOTE from the original module (kept here): the stored home palette is
// stale — home renders an orange body, not the reference's navy jersey — and the definition is
// authored against what the renderer resolves TODAY. This geometry preserves the existing render.

// White is a literal on the home kit only. Its palette is orange over navy with accent === secondary
// (ESPN supplies only two colors), so nothing resolves to the upper shoulder wedge or the numeral
// face. Every other kit reaches white through a token.
export const BRONCOS_WHITE = '#FFFFFF';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Denver Broncos logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// TWO marks, because Orange Crush wears the era's "D" rather than the modern horse.
//   - The horse is two layers of solid region — orange mane under a white head. Its eye and nostril
//     are shell-colored, so they need no path at all.
//   - The "D" is a keyline case: white traced as the union of white AND orange, with the orange "D"
//     painted over it. The white bucking horse inside survives for free.
export const BRONCOS_DECAL_MANE_PATH =
  'M349.3,147.6 L371.2,150.2 L390.5,158.7 L410.3,174.5 L427.0,195.9 L400.4,192.5 L376.8,192.5 L371.6,184.3 L363.1,176.7 L347.2,171.5 L332.2,172.8 L300.0,183.1 L288.0,183.1 L279.4,179.6 L272.5,172.4 L267.4,157.4 L279.4,166.4 L289.3,168.1 L298.3,166.0 L330.4,151.0 L348.9,148.0 Z M239.5,158.7 L240.8,169.8 L244.6,180.5 L251.1,188.2 L260.9,193.3 L282.4,193.7 L327.9,183.5 L345.9,184.8 L352.3,187.3 L358.8,193.3 L314.6,202.7 L279.0,216.4 L266.1,214.7 L248.9,205.7 L239.9,193.7 L236.5,178.8 L239.5,159.1 Z M238.6,215.1 L247.6,216.0 L265.2,224.5 L236.9,236.0 L219.3,235.6 L208.6,228.8 L203.0,218.1 L209.4,221.5 L217.6,222.4 L238.2,215.5 Z M497.4,236.0 L499.5,236.9 L499.1,241.2 L502.9,238.6 L504.7,239.5 L503.4,242.0 L498.2,242.5 L496.1,238.6 L496.9,236.5 Z';
export const BRONCOS_DECAL_HORSE_PATH =
  'M436.0,198.0 L449.7,199.3 L466.0,205.3 L475.5,212.1 L481.5,219.4 L514.5,233.1 L511.1,236.0 L572.9,275.4 L572.0,287.7 L578.5,298.4 L577.6,301.4 L574.6,309.1 L566.0,300.6 L551.9,292.0 L543.7,289.5 L534.3,289.9 L527.8,295.4 L528.7,304.4 L536.8,310.4 L550.6,313.8 L545.9,318.1 L529.6,317.2 L526.5,316.4 L523.5,308.3 L516.7,301.0 L495.2,289.0 L476.8,294.2 L463.0,294.6 L450.2,291.2 L438.2,284.3 L417.1,293.7 L400.8,307.0 L390.1,323.6 L386.2,339.9 L378.1,320.6 L369.5,308.7 L374.6,299.3 L382.8,290.3 L394.4,282.2 L410.7,275.4 L396.5,276.2 L381.1,280.9 L369.5,287.3 L357.9,298.0 L336.5,285.2 L320.6,279.6 L337.7,266.4 L356.2,256.6 L373.4,250.6 L389.2,247.6 L408.5,247.2 L427.4,250.1 L430.4,262.5 L436.9,273.2 L445.0,280.9 L457.9,287.3 L477.6,288.6 L496.1,280.9 L518.8,289.9 L494.8,273.6 L486.6,278.8 L477.6,281.3 L468.6,281.3 L458.7,278.3 L450.6,272.8 L445.0,266.0 L440.7,254.8 L439.9,245.0 L416.7,234.8 L384.1,224.5 L382.8,224.9 L391.8,238.6 L364.8,239.9 L336.5,245.9 L312.9,254.8 L285.8,271.1 L249.3,261.3 L234.3,252.3 L275.9,227.5 L301.3,216.8 L328.7,208.3 L360.5,202.3 L396.5,200.6 L424.4,203.1 L449.3,208.7 L449.7,206.1 L446.3,202.3 L436.4,198.0 Z';
export const BRONCOS_CRUSH_DECAL_KEYLINE_PATH =
  'M329.2,147.6 L427.1,149.5 L332.9,149.5 L326.7,155.1 L326.7,176.9 L328.6,148.3 Z M334.2,152.6 L433.9,153.2 L458.1,160.1 L483.5,180.6 L496.5,204.2 L495.9,219.1 L492.8,204.2 L487.2,212.3 L475.4,212.3 L474.2,205.4 L467.4,205.4 L446.3,188.0 L432.7,182.4 L428.4,168.2 L399.2,168.2 L397.4,175.0 L382.5,175.0 L381.3,179.3 L388.7,181.8 L372.6,183.7 L373.8,214.8 L368.3,212.9 L365.8,216.6 L373.2,231.5 L382.5,234.0 L378.2,240.9 L382.5,258.9 L382.5,294.3 L440.1,297.4 L454.4,288.1 L460.0,296.2 L466.8,296.2 L466.8,299.9 L458.7,301.8 L459.3,317.9 L474.8,311.1 L489.7,290.6 L486.0,282.5 L480.4,296.2 L481.6,258.3 L467.4,248.3 L466.1,229.0 L474.8,227.2 L468.0,232.8 L485.4,234.0 L483.5,238.4 L491.6,243.3 L491.6,278.8 L495.9,274.4 L497.7,237.7 L496.5,278.1 L475.4,312.3 L457.5,324.1 L438.9,327.9 L332.3,327.2 L331.1,298.0 L348.4,292.4 L348.4,191.8 L344.1,184.9 L331.7,181.8 L333.6,153.2 Z M405.4,178.1 L412.2,179.3 L404.2,186.2 L411.0,190.5 L420.3,179.3 L421.5,193.6 L436.4,204.2 L435.8,207.3 L424.0,207.3 L412.2,199.8 L409.1,209.2 L426.5,228.4 L424.0,237.7 L440.1,246.4 L442.6,261.4 L448.8,263.8 L462.4,256.4 L471.7,261.4 L471.1,268.8 L464.9,261.4 L455.6,263.2 L440.7,276.3 L433.9,292.4 L394.9,292.4 L394.9,278.8 L399.2,271.9 L394.9,267.0 L393.7,247.1 L388.1,242.1 L395.5,235.3 L397.4,244.6 L406.0,237.7 L406.7,230.3 L389.9,215.4 L394.9,209.8 L402.9,214.8 L404.8,208.5 L399.9,200.5 L386.2,202.3 L384.4,197.4 L393.7,193.6 L388.1,184.9 L398.0,187.4 L404.8,178.7 Z M500.2,206.1 L502.1,236.5 L495.9,230.3 L473.6,223.5 L481.6,221.0 L495.9,224.7 L502.1,218.5 L500.2,206.7 Z';
export const BRONCOS_CRUSH_DECAL_D_PATH =
  'M334.2,152.6 L433.9,153.2 L458.1,160.1 L483.5,180.6 L496.5,204.2 L495.9,219.1 L492.8,204.2 L487.2,212.3 L475.4,212.3 L474.2,205.4 L467.4,205.4 L446.3,188.0 L432.7,182.4 L428.4,168.2 L399.2,168.2 L397.4,175.0 L382.5,175.0 L381.3,179.3 L388.7,181.8 L372.6,183.7 L373.8,214.8 L368.3,212.9 L365.8,216.6 L373.2,231.5 L382.5,234.0 L378.2,240.9 L382.5,258.9 L382.5,294.3 L440.1,297.4 L454.4,288.1 L460.0,296.2 L466.8,296.2 L466.8,299.9 L458.7,301.8 L459.3,317.9 L474.8,311.1 L489.7,290.6 L486.0,282.5 L480.4,296.2 L481.6,258.3 L467.4,248.3 L466.1,229.0 L474.8,227.2 L468.0,232.8 L485.4,234.0 L483.5,238.4 L491.6,243.3 L491.6,278.8 L495.9,274.4 L497.7,237.7 L496.5,278.1 L475.4,312.3 L457.5,324.1 L438.9,327.9 L332.3,327.2 L331.1,298.0 L348.4,292.4 L348.4,191.8 L344.1,184.9 L331.7,181.8 L333.6,153.2 Z';

// The shoulder wedge — white band over navy, slanted with the shoulder. Extended to x=30 for a
// flush clip.
export const BRONCOS_WEDGE_UPPER_LEFT = 'M30,428 L89,421 L89,447 L30,457 Z';
export const BRONCOS_WEDGE_UPPER_RIGHT = 'M558,428 L499,421 L499,447 L558,457 Z';
export const BRONCOS_WEDGE_LOWER_LEFT = 'M30,457 L89,447 L89,476 L30,486 Z';
export const BRONCOS_WEDGE_LOWER_RIGHT = 'M558,457 L499,447 L499,476 L558,486 Z';

// The collar — two arcs that stop well short of meeting (not a chevron).
export const BRONCOS_COLLAR_LEFT = 'M211,412 L252,450';
export const BRONCOS_COLLAR_RIGHT = 'M377,412 L336,450';
export const BRONCOS_COLLAR_WIDTH = 9;

// Orange Crush's sleeve bands — three separated bands (royal, white, royal); the gaps are body
// color showing through, unlike the Jaguars cuff.
export const BRONCOS_CRUSH_BAND_TOP_LEFT = 'M30,476 H96 V493 H30 Z';
export const BRONCOS_CRUSH_BAND_TOP_RIGHT = 'M558,476 H492 V493 H558 Z';
export const BRONCOS_CRUSH_BAND_MID_LEFT = 'M30,499 H96 V510 H30 Z';
export const BRONCOS_CRUSH_BAND_MID_RIGHT = 'M558,499 H492 V510 H558 Z';
export const BRONCOS_CRUSH_BAND_LOW_LEFT = 'M30,516 H96 V531 H30 Z';
export const BRONCOS_CRUSH_BAND_LOW_RIGHT = 'M558,516 H492 V531 H558 Z';
