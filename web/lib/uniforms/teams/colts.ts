// Indianapolis' construction geometry — the horseshoe decal and the shoulder-bar constants only.
// The composable parts definition that consumes them lives in ./colts.parts.ts; the former flat
// COLTS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).

// White is a literal on both kits. The home palette is navy over speedway grey with accent ===
// secondary (ESPN supplies only two colors), so no token resolves to the shell, the pants, the
// bars or the numerals; resolving any of them from `accent` would paint them grey.
export const COLTS_WHITE = '#FFFFFF';

// The current helmet source is a one-piece horseshoe band with seven rivet holes. Its open centre
// is shell-coloured rather than a counter, so the source-derived navy band is painted first and
// the isolated rivets are restored in white.
export const COLTS_DECAL_HORSESHOE_NAVY_PATH =
  'M355.4,146.3 L373.8,146.5 L382.1,148.2 L386.7,150.9 L389.1,153.6 L391.3,157.9 L392.1,162.7 L391.6,169.5 L389.1,177.9 L372.9,205.7 L366.7,220.0 L362.4,233.2 L360.5,242.4 L359.7,252.2 L360.5,262.2 L363.0,270.8 L366.5,278.6 L372.1,288.1 L377.0,294.3 L387.5,304.0 L394.3,308.3 L403.7,312.7 L412.1,315.1 L423.4,316.7 L433.7,316.4 L443.7,314.6 L455.0,310.5 L464.0,305.6 L473.4,298.3 L479.6,291.9 L485.8,283.2 L490.2,274.8 L493.1,266.7 L494.8,258.1 L494.8,247.0 L492.9,235.4 L488.8,222.2 L481.8,205.7 L465.6,177.9 L463.2,169.5 L462.6,162.7 L463.4,157.9 L465.6,153.6 L468.0,150.9 L472.6,148.2 L485.3,146.3 L499.3,146.3 L502.3,148.2 L504.5,158.4 L504.7,166.5 L502.3,168.7 L494.8,167.6 L492.6,169.2 L492.0,171.9 L493.4,175.2 L508.8,197.9 L517.4,216.8 L522.8,235.9 L524.2,246.2 L524.5,258.9 L522.6,274.0 L516.9,291.3 L510.1,304.0 L498.3,320.0 L483.7,333.2 L472.6,340.5 L464.8,344.5 L456.1,347.5 L445.3,349.9 L434.8,351.3 L422.6,351.6 L403.2,348.6 L389.1,344.0 L381.3,339.9 L370.0,332.4 L363.8,327.2 L354.6,317.8 L343.0,301.3 L335.1,284.6 L331.4,269.7 L330.3,250.8 L332.7,232.2 L339.7,210.6 L347.0,196.0 L361.3,175.2 L362.7,171.9 L362.1,169.2 L360.0,167.6 L352.4,168.7 L350.0,166.5 L350.0,160.9 L351.6,150.3 L352.4,148.2 L355.1,146.5 Z';
export const COLTS_DECAL_HORSESHOE_WHITE_PATH =
  'M426.7,331.3 L429.4,332.4 L429.4,335.1 L428.0,336.2 L426.4,336.2 L425.1,335.1 L425.1,332.4 L426.4,331.6 Z M374.8,174.4 L377.3,175.2 L377.3,178.4 L374.6,179.2 L373.2,178.1 L372.9,176.0 L374.6,174.6 Z M478.8,174.4 L481.5,175.4 L481.5,178.1 L480.2,179.2 L477.5,178.4 L476.9,176.3 L478.5,174.6 Z M360.5,299.7 L363.0,300.8 L363.0,303.7 L361.9,304.6 L358.9,303.7 L358.6,301.3 L360.2,300.0 Z M493.4,299.7 L495.8,300.8 L495.8,303.7 L494.8,304.6 L491.8,303.7 L491.5,301.3 L493.1,300.0 Z M508.0,242.2 L510.7,243.2 L511.0,245.7 L509.3,247.0 L506.9,246.5 L506.1,244.3 L507.7,242.4 Z M345.4,242.2 L346.7,242.2 L348.4,243.5 L348.1,246.2 L345.4,247.0 L343.8,245.7 L343.8,243.8 L345.1,242.4 Z';

// Two bars per sleeve, canted with the shoulder. Measured on the home figure (jersey top y=437,
// sleeve hem y=502, figure center x=516.5, so scaleY = 191/65 and scaleX = 264/84.5). Both bars
// are 7.5 reference px across — about 24 mannequin units — and lean inboard at 0.2 px of x per px
// of y: the inner bar's left edge runs reference x465 @ y443 to x471 @ y474, the outer x452 @ y448
// to x457 @ y474. Take the width from a mid-sleeve row, not the top one: at the shoulder the bars
// are clipped by the jersey edge and measure 5-6px, which renders them as thin slashes.
// The away figure carries the identical pair 514px lower and 408px left, in navy.
export const COLTS_SHOULDER_BAR_INNER_LEFT = 'M133,401 L157,401 L176,492 L152,492 Z';
export const COLTS_SHOULDER_BAR_INNER_RIGHT = 'M455,401 L431,401 L412,492 L436,492 Z';
export const COLTS_SHOULDER_BAR_OUTER_LEFT = 'M93,415 L116,415 L132,492 L109,492 Z';
export const COLTS_SHOULDER_BAR_OUTER_RIGHT = 'M495,415 L472,415 L456,492 L479,492 Z';
