// Houston's construction geometry — the bull and Battle-Red horn paths, the collar arcs, and
// the fixed construction colors only. The composable parts definition that consumes them lives in
// ./texans.parts.ts; the former flat TEXANS_UNIFORMS was deleted in the migration that proved
// parts render byte-identically (see parts-parity.test.ts for the one-time gate).

// HOUSTON WEARS TWO DIFFERENT HELMET MARKS. The navy kits wear the club's standard bull HEAD —
// compact, horned, with a face, a red right half and a white star. It is hand-drawn (cubic
// Beziers in a 0-100 design box mapped onto raw helmet space at x284-554, y104-350), NOT traced:
// the bull's body is exactly the shell navy and its white keyline is drawn dashed at that scale,
// so no predicate selects it. The keyline is a STROKE rather than a grown fill, safe only because
// these curves are hand-drawn and smooth. The Battle Red kit wears a large stylized horn sweeping
// the whole crown, a machine contour trace of GUD's illustration.
export const TEXANS_BULL_NAVY_PATH =
  'M397.4,320.5 C413.6,305.7 429.8,286.0 437.9,261.4 C446.0,241.8 448.7,227.0 446.0,212.2 C440.6,197.5 421.7,185.2 402.8,177.8 C383.9,170.4 365.0,163.0 354.2,150.7 C348.8,140.9 351.5,131.1 362.3,123.7 C373.1,116.3 386.6,111.4 400.1,108.9 L321.8,106.5 C308.3,121.2 297.5,138.4 294.8,153.2 C294.8,168.0 300.2,180.3 311.0,190.1 C319.1,195.0 327.2,199.9 335.3,202.4 L316.4,222.1 C327.2,231.9 338.0,244.2 346.1,256.5 C354.2,268.8 359.6,283.6 359.6,293.4 L348.8,300.8 C362.3,308.2 378.5,315.6 397.4,320.5 Z';
export const TEXANS_BULL_RED_PATH =
  'M408.2,320.5 C419.0,305.7 435.2,286.0 451.4,261.4 C459.5,246.7 464.9,231.9 464.9,217.2 C464.9,207.3 464.9,202.4 462.2,197.5 C483.8,195.0 502.7,187.6 513.5,177.8 C521.6,168.0 518.9,158.1 508.1,150.7 C532.4,158.1 545.9,175.3 545.9,192.6 C545.9,212.2 532.4,227.0 510.8,231.9 C500.0,246.7 478.4,276.2 446.0,300.8 C432.5,310.6 419.0,318.0 408.2,320.5 Z';
export const TEXANS_BULL_STAR_PATH =
  'M385.3,203.0 L397.3,221.1 L420.1,217.2 L404.9,233.2 L416.1,251.7 L394.7,243.5 L378.8,258.9 L380.8,237.8 L359.8,228.8 L382.4,224.0 Z';
export const TEXANS_BULL_KEYLINE_WIDTH = 13;

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Houston Texans logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// Fixed art: the mark is the same three colors on every shell, so nothing here takes a token.
export const TEXANS_DECAL_NAVY = '#031825'; // sampled (3,24,37)
export const TEXANS_DECAL_RED = '#C80023'; // sampled (200,0,35)
export const TEXANS_BATTLE_RED_DECAL_PATH =
  'M426.7,115.2 L483.8,118.4 L494.0,123.1 L505.7,123.9 L510.4,129.4 L480.7,138.0 L465.8,138.8 L438.4,149.8 L429.1,150.5 L407.2,166.2 L399.4,181.9 L399.4,200.8 L420.5,222.7 L451.0,241.6 L543.2,285.5 L587.8,299.7 L596.4,305.1 L606.5,305.9 L615.1,311.4 L625.3,312.2 L633.9,317.7 L660.5,323.2 L683.9,324.0 L681.6,327.1 L642.5,332.6 L623.0,326.3 L602.6,326.3 L592.5,321.6 L560.4,318.5 L554.2,314.6 L521.3,313.8 L508.8,320.8 L504.1,327.9 L499.4,327.1 L493.2,320.8 L483.8,319.3 L479.9,314.6 L471.3,313.0 L467.4,308.3 L434.5,294.2 L372.8,250.2 L354.0,225.9 L348.5,203.1 L361.0,167.0 L352.4,164.7 L338.4,181.1 L325.9,196.8 L323.5,211.8 L318.8,218.8 L325.1,262.0 L337.6,289.5 L384.5,336.5 L434.5,367.1 L441.6,367.1 L449.4,373.4 L472.8,380.5 L475.2,389.9 L488.5,405.6 L540.1,438.6 L546.3,456.6 L549.5,455.8 L549.5,465.2 L554.9,470.7 L556.5,482.5 L439.2,444.1 L349.3,400.9 L328.2,387.6 L297.7,360.9 L273.5,327.1 L266.4,312.2 L264.9,298.9 L260.2,291.0 L254.7,243.1 L258.6,238.4 L260.2,218.0 L266.4,201.6 L284.4,174.9 L304.0,154.5 L329.8,135.6 L360.3,123.9 L379.8,122.3 L387.6,117.6 L425.9,116.0 Z';

// White is a literal on the home kit only. Its palette is navy over red with accent === secondary
// (ESPN supplies only two colors), so nothing resolves to its white pants or white numeral face.
export const TEXANS_WHITE = '#FFFFFF';

// The collar, measured on the home figure. The red band runs from reference (74,138) to (87,161)
// and mirrored. Extrapolated, the arms would not meet until y=186 — so this is two arcs, not a
// chevron, the same shape Jacksonville and Denver wear.
export const TEXANS_COLLAR_LEFT = 'M211,392 L252,458';
export const TEXANS_COLLAR_RIGHT = 'M377,392 L336,458';
export const TEXANS_COLLAR_WIDTH = 10;
