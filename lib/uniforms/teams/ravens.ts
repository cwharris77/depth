// Baltimore's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/ravens (home is that sheet's row-1 figure 1, black alternate its row-2 figure 3,
// away its row-3 figure 1 — the other figures in each row are pant combinations, not separate
// kits). Sleeve paths use the outer 588-wide mannequin space; right paths mirror the left across
// the centerline x=294 (mirroredX = 588 - x).
//
// All three kits are ONE construction with the tokens swapped: a bare black shell, a short tilted
// bar on each shoulder cap, a solid band filling the last third of each sleeve, and trimmed
// numerals. No helmet stripe, no collar trim, no pant stripe — the reference's pants are unbroken
// on every combination, and the black/white/black stripe in the swatch beside each figure is the
// sock, not the pant (the same swatch convention the Chiefs sheet uses).
//
// ONE APPROXIMATION, deliberate: the shoulder bar and the numerals both carry a black drop-shadow
// along their lower-right edge, under the gold keyline. At the 188px swatch this renders sub-pixel,
// so the bar is authored as gold-under-white and the numeral shadow is dropped entirely. The gold
// keyline is what actually reads at size, and it is preserved on both.
//
// Out of scope on every kit: the chest wordmark, the league shield, and the shield patch the
// reference draws on each sleeve.
//
// Construction geometry only — the shoulder-bar, sleeve-band and mark paths. The composable parts
// definition that consumes them lives in ./ravens.parts.ts; the former flat RAVENS_UNIFORMS was
// deleted in the migration that proved parts render byte-identically (see parts-parity.test.ts for
// the one-time gate).

// The shoulder bar, measured on the home figure (jersey top y=132, sleeve hem y=197, figure center
// x=99.5, so scaleY = 191/65 and scaleX = 264/84.5). It runs reference x35-59 and is tilted about
// 4px over that 24px length, which is the shoulder slope. Thickness is taken from the mid-bar
// column at x=47, the only cut that crosses every layer cleanly: gold y144-149 around a white face
// at y145-148. Reading the bar's full outer boundary instead gives y145-151, but that lower 2px is
// the black drop-shadow, not gold — folding it in renders the keyline at twice its weight and the
// bar reads gold-with-a-white-slot rather than white-with-a-gold-keyline.
export const RAVENS_SHOULDER_OUTER_LEFT = 'M93,424 L168,412 L168,427 L93,439 Z';
export const RAVENS_SHOULDER_OUTER_RIGHT = 'M495,424 L420,412 L420,427 L495,439 Z';
export const RAVENS_SHOULDER_INNER_LEFT = 'M99,427 L164,415 L164,424 L99,436 Z';
export const RAVENS_SHOULDER_INNER_RIGHT = 'M489,427 L424,415 L424,424 L489,436 Z';

// The sleeve band, measured on the same figure: reference x19-48 (mirrored x153-181 on the right,
// which is within 2px of the computed mirror) and y188-197, so it ends flush with the hem. Extended
// outward to x=30 and past the hem to y=576 so the jersey clip trims it flush.
export const RAVENS_SLEEVE_BAND_LEFT = 'M30,548 H133 V576 H30 Z';
export const RAVENS_SLEEVE_BAND_RIGHT = 'M558,548 H455 V576 H558 Z';

// The generator traces the approved standalone Ravens mark rather than the tiny GUD decal. The
// SVG is non-free/fair-use artwork from Wikimedia's `File:Baltimore Ravens logo.svg`; its black
// gaps are shell-colored and therefore intentionally omitted from the layer stack. Placement was
// measured from the GUD 2025 helmet: visible mark x=15.4..79.8%, y=11.2..42.8% of the shell.
export const RAVENS_DECAL_GOLD_PATH =
  'M378.1,129.1 L424.3,133.3 L454.6,144.6 L475.2,160.2 L477.0,160.2 L476.8,154.5 L477.9,154.5 L488.1,167.3 L492.9,178.6 L498.2,171.5 L499.8,188.5 L529.1,189.9 L530.2,194.1 L551.0,201.2 L546.8,205.4 L572.9,221.0 L584.8,237.9 L587.4,247.8 L587.4,254.9 L583.7,266.2 L571.6,261.9 L548.3,266.2 L470.5,264.8 L445.4,280.3 L444.3,280.3 L443.5,271.8 L442.0,271.8 L428.8,283.1 L423.5,293.0 L420.1,307.2 L417.4,308.6 L407.9,294.5 L405.0,283.1 L404.7,274.7 L392.3,276.1 L397.8,267.6 L398.6,261.9 L398.2,257.7 L392.9,253.5 L359.3,254.9 L324.0,267.6 L321.8,267.6 L332.3,249.2 L332.6,246.4 L331.5,242.2 L328.1,240.7 L280.9,253.5 L301.5,218.1 L302.8,208.2 L299.3,202.6 L269.2,205.4 L225.7,222.4 L253.5,187.0 L294.4,154.5 L336.4,136.2 L378.0,130.5 Z M373.6,167.3 L377.3,167.3 L369.9,185.6 L398.9,188.5 L404.0,192.7 L406.0,199.8 L403.7,206.8 L372.0,222.4 L334.3,222.4 L342.4,198.4 L351.4,181.4 L362.2,171.5 L373.5,168.7 Z M373.0,153.1 L399.7,153.1 L415.0,158.8 L417.1,164.4 L414.3,171.5 L398.1,181.4 L388.6,182.8 L399.2,172.9 L399.2,167.3 L394.1,161.6 L317.3,168.7 L372.8,154.5 Z';
export const RAVENS_DECAL_PURPLE_PATH =
  'M374.9,143.2 L417.6,146.1 L454.6,158.8 L476.6,177.2 L482.9,189.9 L484.2,201.2 L480.5,204.0 L467.5,185.6 L461.0,182.8 L471.2,184.2 L468.3,178.6 L451.7,170.1 L438.3,171.5 L453.6,180.0 L417.9,184.2 L443.6,194.1 L425.6,195.5 L415.5,204.0 L455.2,205.4 L430.0,206.8 L427.4,211.1 L466.2,215.3 L418.2,216.7 L392.3,229.4 L451.5,223.8 L449.1,225.2 L449.3,230.9 L465.0,242.2 L467.3,250.6 L463.9,259.1 L454.3,264.8 L455.6,256.3 L453.6,247.8 L444.9,259.1 L424.6,270.4 L417.2,281.7 L416.6,277.5 L417.9,273.3 L428.8,254.9 L412.7,259.1 L413.9,253.5 L413.5,247.8 L408.4,239.3 L391.2,233.7 L355.3,236.5 L366.2,225.2 L407.6,206.8 L409.7,199.8 L408.9,192.7 L399.5,184.2 L419.0,171.5 L420.5,167.3 L420.5,160.2 L413.9,151.7 L400.2,147.5 L362.7,148.9 L327.4,158.8 L304.1,171.5 L303.3,175.7 L304.9,175.7 L360.3,167.3 L350.1,174.3 L341.3,188.5 L329.0,222.4 L328.6,228.0 L330.6,228.0 L318.6,228.0 L324.9,215.3 L327.9,202.6 L327.4,189.9 L322.9,182.8 L297.0,180.0 L280.3,184.2 L322.3,156.0 L374.7,144.6 Z M370.9,192.7 L378.0,195.5 L380.1,198.4 L380.1,204.0 L378.9,205.4 L378.6,208.2 L379.4,209.7 L374.7,212.5 L362.4,213.9 L365.9,201.2 L370.7,194.1 Z M382.8,167.3 L388.3,170.1 L389.2,171.5 L389.2,175.7 L386.2,181.4 L376.0,182.8 L374.9,181.4 L377.6,174.3 L382.6,168.7 Z';
export const RAVENS_DECAL_WHITE_PATH =
  'M500.1,204.0 L549.6,218.1 L567.3,232.3 L574.2,243.6 L575.5,252.1 L556.2,239.3 L508.0,228.0 L459.4,223.8 L458.3,225.2 L458.4,229.4 L462.3,233.7 L471.2,239.3 L472.5,237.9 L471.6,233.7 L494.2,233.7 L536.7,240.7 L567.4,250.6 L552.1,253.5 L479.2,252.1 L472.3,245.0 L467.5,252.1 L467.3,246.4 L465.4,240.7 L449.4,229.4 L451.8,222.4 L392.8,228.0 L426.7,216.7 L469.9,218.1 L456.5,211.1 L427.7,209.7 L439.9,206.8 L500.0,216.7 L492.9,209.7 L506.4,211.1 L500.3,204.0 Z M373.6,148.9 L410.5,151.7 L418.2,157.4 L420.3,164.4 L412.4,177.2 L399.1,182.8 L399.7,187.0 L408.6,194.1 L409.2,198.4 L408.7,202.6 L405.0,206.8 L403.9,206.8 L405.8,202.6 L405.8,195.5 L401.3,188.5 L369.9,184.2 L377.3,165.8 L364.9,168.7 L352.5,178.6 L342.4,196.9 L334.8,218.1 L334.3,223.8 L369.8,223.8 L328.9,226.6 L334.5,206.8 L343.7,185.6 L360.7,165.8 L304.4,172.9 L335.5,157.4 L373.5,150.3 Z M368.8,188.5 L384.9,189.9 L389.1,198.4 L386.5,206.8 L379.7,213.9 L357.5,216.7 L364.8,195.5 L368.6,189.9 Z M455.2,188.5 L460.9,188.5 L454.7,191.3 L454.3,196.9 L456.0,199.8 L450.9,194.1 L455.1,189.9 Z';
export const RAVENS_DECAL_EYE_PATH =
  'M452.7,187.0 L462.3,187.0 L466.0,191.3 L466.2,195.5 L462.3,201.2 L452.5,201.2 L448.3,194.1 L452.5,188.5 Z';
