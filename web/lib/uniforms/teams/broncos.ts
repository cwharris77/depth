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
  'M346.3,152.0 L368.2,154.6 L387.5,163.1 L407.3,178.9 L424.0,200.3 L397.4,196.9 L373.8,196.9 L368.6,188.7 L360.1,181.1 L344.2,175.9 L329.2,177.2 L297.0,187.5 L285.0,187.5 L276.4,184.0 L269.5,176.8 L264.4,161.8 L276.4,170.8 L286.3,172.5 L295.3,170.4 L327.4,155.4 L345.9,152.4 Z M236.5,163.1 L237.8,174.2 L241.6,184.9 L248.1,192.6 L257.9,197.7 L279.4,198.1 L324.9,187.9 L342.9,189.2 L349.3,191.7 L355.8,197.7 L311.6,207.1 L276.0,220.8 L263.1,219.1 L245.9,210.1 L236.9,198.1 L233.5,183.2 L236.5,163.5 Z M235.6,219.5 L244.6,220.4 L262.2,228.9 L233.9,240.4 L216.3,240.0 L205.6,233.2 L200.0,222.5 L206.4,225.9 L214.6,226.8 L235.2,219.9 Z';
export const BRONCOS_DECAL_EYE_PATH =
  'M493.1,240.4 L504.7,244.3 L502.5,246.4 L495.7,247.3 L491.4,244.7 L492.7,240.9 Z';
export const BRONCOS_DECAL_HORSE_PATH =
  'M433.0,202.4 L446.7,203.7 L463.0,209.7 L472.5,216.5 L478.5,223.8 L511.5,237.5 L508.1,240.4 L569.9,279.8 L569.0,292.1 L575.5,302.8 L574.6,305.8 L571.6,313.5 L563.0,305.0 L548.9,296.4 L540.7,293.9 L531.3,294.3 L524.8,299.8 L525.7,308.8 L533.8,314.8 L547.6,318.2 L542.9,322.5 L526.6,321.6 L523.5,320.8 L520.5,312.7 L513.7,305.4 L492.2,293.4 L473.8,298.6 L460.0,299.0 L447.2,295.6 L435.2,288.7 L414.1,298.1 L397.8,311.4 L387.1,328.0 L383.2,344.3 L375.1,325.0 L366.5,313.1 L371.6,303.7 L379.8,294.7 L391.4,286.6 L407.7,279.8 L393.5,280.6 L378.1,285.3 L366.5,291.7 L354.9,302.4 L333.5,289.6 L317.6,284.0 L334.7,270.8 L353.2,261.0 L370.4,255.0 L386.2,252.0 L405.5,251.6 L424.4,254.5 L427.4,266.9 L433.9,277.6 L442.0,285.3 L454.9,291.7 L474.6,293.0 L493.1,285.3 L515.8,294.3 L491.8,278.0 L483.6,283.2 L474.6,285.7 L465.6,285.7 L455.7,282.7 L447.6,277.2 L442.0,270.4 L437.7,259.2 L436.9,249.4 L413.7,239.2 L381.1,228.9 L379.8,229.3 L388.8,243.0 L361.8,244.3 L333.5,250.3 L309.9,259.2 L282.8,275.5 L246.3,265.7 L231.3,256.7 L272.9,231.9 L298.3,221.2 L325.7,212.7 L357.5,206.7 L393.5,205.0 L421.4,207.5 L446.3,213.1 L446.7,210.5 L443.3,206.7 L433.4,202.4 Z';
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
