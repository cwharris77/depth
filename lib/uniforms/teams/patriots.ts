// New England's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/patriots (home is that sheet's row-2 figure 3, away its row-1 figure 1, Pat
// Patriot its row-1 figure 7 — boxed "worn in same games"). Right paths mirror the left across the
// centerline x=294.
//
// One construction throughout: three parallel bands running diagonally down each shoulder cap,
// outer/inner/outer, and nothing else. No collar trim, no helmet stripe, no pant stripe.
//
// The band COLORS are measured on three of the four kits and they are not a simple token swap:
// navy body wears red/white/red, white body wears red/navy/red, red body wears white/navy/white.
// So both the outer and inner colors are parameters — assuming either one is fixed renders one of
// the kits wrong, the same trap Denver's shoulder wedge sets.
//
// THE RIVALRIES KIT IS INFERRED — no figure of its own on the sheet. It takes the home pattern
// against its own palette.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "WE ARE ALL PATRIOTS"
// collar tab, the Super Bowl and USA-250 patches, the logo on each sleeve, and shoulder numerals.
//
// Construction geometry only — the band and mark paths. The composable parts definition that
// consumes them lives in ./patriots.parts.ts; the former flat PATRIOTS_UNIFORMS was deleted in the
// migration that proved parts render byte-identically (see parts-parity.test.ts for the one-time
// gate).

// The shoulder bands, measured on the home figure (jersey top y=901, sleeve hem y=967, figure center
// x=714.5, so scaleY = 191/66 and scaleX = 264/84.5). At reference y=913 the three run x650-656,
// x657-662 and x662-667; by y=937 each has shifted about 7px right, which is the slant. The set
// spans y908-938. Each band is ~19 units wide and leans ~22 units right over its 90-unit drop.
export const PATRIOTS_BANDS_LEFT = [
  'M92,404 L111,404 L133,493 L114,493 Z',
  'M111,404 L130,404 L152,493 L133,493 Z',
  'M130,404 L149,404 L171,493 L152,493 Z',
];
export const PATRIOTS_BANDS_RIGHT = [
  'M496,404 L477,404 L455,493 L474,493 Z',
  'M477,404 L458,404 L436,493 L455,493 Z',
  'M458,404 L439,404 L417,493 L436,493 Z',
];

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:New England Patriots logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// The mark, traced from the home figure's shell (bbox x37-159, y285-399 in the reference) mapped
// onto the raw helmet space at ~6.25x. Four plain-union fills in paint order: keyline, face, the
// two red streamers, star.
//
// The WHITE LAYER IS ONE COMPONENT, not the white trace. Traced white returns four components, and
// three of them are pieces of the keyline rather than the star — drawn on top they repaint the
// keyline over the face and swallow the chin. Only the component at reference (115-120, 303-308) is
// the star, and it is the only one this layer carries. The chin reading white is correct, not a
// gap: the reference draws the jaw white too.
//
// This mark is one of the few here whose source is a GIF; it was normalized to RGB before
// measuring. That matters for the predicates — the navy samples (3,18,51), so a blue-channel
// threshold tuned on the PNG sheets (b > 60) misses it entirely and the face comes back empty.
export const PATRIOTS_DECAL_KEYLINE_PATH =
  'M476.3,108.9 L519.1,108.9 L540.5,111.0 L571.2,117.5 L610.4,132.5 L624.6,136.1 L638.9,136.8 L658.2,133.2 L662.4,134.7 L663.1,141.8 L633.2,223.5 L631.1,226.4 L613.2,235.0 L616.8,262.2 L604.0,268.7 L601.1,275.9 L602.5,280.9 L602.5,288.8 L599.7,296.6 L594.7,303.8 L586.8,310.3 L575.4,314.6 L543.3,275.1 L529.8,261.5 L511.3,245.8 L491.3,232.1 L471.3,221.4 L443.5,209.9 L421.4,203.5 L416.4,200.6 L414.3,194.9 L415.7,191.3 L418.6,189.1 L417.8,188.4 L392.2,190.6 L355.8,189.1 L340.1,186.3 L331.6,182.7 L328.7,179.8 L328.0,174.1 L305.9,176.2 L277.4,176.2 L247.4,171.9 L240.3,167.6 L238.9,164.8 L240.3,159.0 L248.1,155.5 L263.1,154.0 L293.0,148.3 L405.7,118.9 L452.1,111.0 L475.6,109.6 Z';
export const PATRIOTS_DECAL_FACE_PATH =
  'M477.0,117.5 L518.4,117.5 L544.8,120.3 L566.2,125.4 L616.1,143.3 L630.3,145.4 L639.6,145.4 L652.5,143.3 L624.6,220.0 L603.2,229.3 L606.8,257.2 L595.4,263.0 L595.4,268.7 L591.1,277.3 L593.3,282.3 L593.3,287.3 L588.3,297.4 L578.3,303.8 L556.2,275.9 L534.1,252.9 L520.5,241.5 L501.3,227.8 L462.1,207.8 L437.8,199.2 L425.7,196.3 L437.8,194.9 L477.0,186.3 L515.5,185.6 L503.4,179.1 L488.4,174.8 L474.9,173.4 L454.9,174.1 L452.1,154.7 L473.5,151.9 L492.7,151.2 L476.3,145.4 L467.0,144.0 L449.9,144.0 L446.4,120.3 L476.3,118.2 Z';
export const PATRIOTS_DECAL_STREAMERS_PATH =
  'M440.7,121.1 L442.1,121.8 L445.7,144.0 L416.4,147.6 L361.5,159.8 L318.7,166.2 L272.4,166.9 L248.8,164.1 L285.2,158.3 L327.3,148.3 L390.0,131.1 L427.1,123.2 L439.9,121.8 Z M447.8,155.5 L451.4,175.5 L393.6,182.0 L364.4,181.3 L340.1,177.7 L351.5,177.7 L372.2,174.8 L447.1,156.2 Z';
export const PATRIOTS_DECAL_SILVER_PATH =
  'M554.8,211.4 L569.0,212.8 L576.1,217.1 L569.0,217.1 L563.3,219.2 L556.9,226.4 L556.9,229.3 L582.6,230.7 L585.4,224.3 L589.0,220.7 L592.6,219.2 L596.1,220.0 L599.7,252.2 L585.4,251.5 L582.6,255.1 L590.4,258.7 L590.4,262.2 L581.9,263.0 L572.6,269.4 L591.1,268.7 L587.6,274.4 L580.4,274.4 L587.6,283.7 L585.4,291.6 L580.4,295.2 L554.0,262.2 L540.5,249.3 L528.4,240.0 L534.1,236.4 L543.3,237.9 L549.8,242.2 L560.5,256.5 L561.9,257.9 L562.6,257.2 L559.7,241.5 L536.2,221.4 L541.9,214.9 L549.8,212.1 L554.0,212.1 Z';
export const PATRIOTS_DECAL_STAR_PATH =
  'M606.8,154.0 L609.0,170.5 L627.5,177.7 L611.1,181.3 L609.7,182.7 L611.8,204.2 L596.8,185.6 L574.0,190.6 L587.6,174.8 L576.1,159.0 L596.1,165.5 L606.1,154.7 Z';
