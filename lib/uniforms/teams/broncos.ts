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
  'M341.0,170.6 L368.3,172.5 L409.8,199.2 L365.2,206.1 L350.3,194.3 L335.4,192.4 L319.9,194.3 L291.4,211.7 L273.5,214.1 L258.0,206.1 L258.0,202.3 L279.6,202.3 L323.0,172.5 L340.4,171.3 Z M339.8,208.5 L340.4,214.1 L310.0,225.9 L272.8,249.6 L248.0,248.3 L233.8,237.1 L226.4,224.1 L228.8,216.6 L242.5,232.8 L261.7,234.0 L316.8,209.8 L339.1,209.2 Z M233.8,258.9 L249.3,259.5 L255.5,265.1 L228.2,280.6 L216.4,280.6 L203.4,273.8 L204.7,270.7 L216.4,271.3 L233.2,259.5 Z';
export const BRONCOS_DECAL_HORSE_PATH =
  'M438.3,203.6 L446.9,206.1 L449.4,215.4 L458.1,216.0 L464.3,211.0 L479.2,219.7 L501.5,222.2 L510.8,229.0 L472.3,222.8 L478.5,234.0 L493.4,240.9 L512.0,241.5 L534.3,252.0 L540.5,247.7 L531.8,245.2 L531.8,240.9 L539.9,240.9 L557.8,249.6 L556.0,260.7 L562.2,266.3 L567.8,263.8 L565.9,253.9 L569.6,253.3 L569.6,266.3 L578.9,279.4 L553.5,268.8 L542.4,268.8 L531.2,276.9 L528.7,286.2 L536.8,294.3 L552.3,298.6 L538.0,299.3 L525.6,286.8 L493.4,280.0 L499.6,276.9 L519.4,278.8 L515.1,268.2 L495.9,263.2 L482.3,273.8 L457.5,273.8 L445.1,264.5 L433.3,243.3 L380.0,236.5 L376.9,242.7 L382.5,250.2 L356.5,255.8 L330.5,268.2 L290.2,299.9 L241.9,295.5 L279.6,259.5 L320.5,235.3 L376.9,216.0 L437.0,214.8 L440.1,212.3 L437.6,204.2 Z M414.1,258.9 L423.4,260.1 L436.4,277.5 L453.8,287.5 L437.6,286.2 L421.5,299.3 L404.2,320.4 L399.2,340.3 L383.1,324.1 L382.5,318.5 L395.5,300.5 L412.2,287.5 L410.4,281.2 L392.4,286.8 L365.2,311.7 L331.7,303.6 L364.5,272.5 L394.3,260.1 L413.5,259.5 Z';
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
