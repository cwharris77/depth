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
  'M477.3,130.1 L509.9,130.1 L526.3,131.6 L549.7,136.3 L579.6,147.2 L590.5,149.8 L601.3,150.3 L616.0,147.7 L619.3,148.8 L619.8,153.9 L597.0,213.1 L595.3,215.2 L581.7,221.4 L584.5,241.1 L574.7,245.8 L572.5,250.9 L573.6,254.6 L573.6,260.3 L571.4,266.0 L567.6,271.2 L561.6,275.8 L552.9,279.0 L528.4,250.4 L518.1,240.6 L504.0,229.2 L488.7,219.3 L473.5,211.5 L452.3,203.2 L435.4,198.6 L431.6,196.5 L430.0,192.3 L431.1,189.7 L433.3,188.2 L432.7,187.7 L413.1,189.2 L385.4,188.2 L373.4,186.1 L366.9,183.5 L364.7,181.4 L364.2,177.3 L347.3,178.8 L325.5,178.8 L302.7,175.7 L297.3,172.6 L296.2,170.5 L297.3,166.4 L303.2,163.8 L314.7,162.8 L337.5,158.6 L423.5,137.3 L458.8,131.6 L476.8,130.6 Z';
export const PATRIOTS_DECAL_FACE_PATH =
  'M477.9,136.3 L509.4,136.3 L529.5,138.4 L545.8,142.0 L583.9,155.0 L594.8,156.5 L601.9,156.5 L611.7,155.0 L590.5,210.5 L574.1,217.2 L576.9,237.5 L568.1,241.6 L568.1,245.8 L564.9,252.0 L566.5,255.6 L566.5,259.2 L562.7,266.5 L555.1,271.2 L538.2,250.9 L521.4,234.3 L511.0,226.0 L496.3,216.2 L466.4,201.7 L447.9,195.4 L438.7,193.4 L447.9,192.3 L477.9,186.1 L507.2,185.6 L498.0,180.9 L486.6,177.8 L476.2,176.8 L461.0,177.3 L458.8,163.3 L475.1,161.2 L489.8,160.7 L477.3,156.5 L470.2,155.5 L457.2,155.5 L454.5,138.4 L477.3,136.8 Z';
export const PATRIOTS_DECAL_STREAMERS_PATH =
  'M450.1,138.9 L451.2,139.4 L453.9,155.5 L431.6,158.1 L389.7,166.9 L357.1,171.6 L321.7,172.1 L303.8,170.0 L331.5,165.9 L363.6,158.6 L411.5,146.2 L439.8,140.5 L449.6,139.4 Z M455.6,163.8 L458.3,178.3 L414.2,183.0 L391.9,182.5 L373.4,179.9 L382.1,179.9 L397.9,177.8 L455.0,164.3 Z';
export const PATRIOTS_DECAL_SILVER_PATH =
  'M537.1,204.3 L548.0,205.3 L553.5,208.4 L548.0,208.4 L543.7,210.0 L538.8,215.2 L538.8,217.2 L558.4,218.3 L560.5,213.6 L563.3,211.0 L566.0,210.0 L568.7,210.5 L571.4,233.8 L560.5,233.3 L558.4,235.9 L564.3,238.5 L564.3,241.1 L557.8,241.6 L550.7,246.3 L564.9,245.8 L562.2,249.9 L556.7,249.9 L562.2,256.7 L560.5,262.4 L556.7,265.0 L536.6,241.1 L526.3,231.8 L517.0,225.0 L521.4,222.4 L528.4,223.5 L533.3,226.6 L541.5,236.9 L542.6,238.0 L543.1,237.5 L541.0,226.0 L523.0,211.5 L527.4,206.9 L533.3,204.8 L536.6,204.8 Z';
export const PATRIOTS_DECAL_STAR_PATH =
  'M576.9,162.8 L578.5,174.7 L592.6,179.9 L580.1,182.5 L579.0,183.5 L580.7,199.1 L569.2,185.6 L551.8,189.2 L562.2,177.8 L553.5,166.4 L568.7,171.1 L576.3,163.3 Z';
