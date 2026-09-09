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
  'M332.6,125.0 L364.5,125.0 L390.2,129.4 L423.7,142.6 L443.8,158.4 L444.5,157.5 L443.8,151.4 L444.5,151.4 L454.3,162.8 L460.4,175.1 L466.4,169.9 L468.0,186.6 L498.8,188.3 L498.1,190.1 L498.8,191.9 L520.2,198.9 L521.1,200.6 L517.1,201.5 L517.3,204.2 L529.4,209.4 L547.3,223.5 L558.0,241.1 L559.8,249.0 L559.1,260.5 L555.8,269.3 L543.9,264.9 L519.6,268.4 L438.0,267.5 L410.8,283.3 L409.2,281.6 L408.3,275.4 L406.5,275.4 L392.7,287.7 L387.8,297.4 L382.6,314.1 L371.2,298.3 L368.8,289.5 L367.4,277.2 L354.9,278.9 L361.4,265.7 L360.1,258.7 L355.8,256.1 L321.6,256.9 L281.2,270.1 L291.7,250.8 L291.5,245.5 L288.8,242.9 L269.4,244.6 L238.1,255.2 L253.1,230.6 L259.5,216.5 L260.6,207.7 L256.8,202.4 L226.9,205.0 L180.4,222.6 L191.4,205.9 L209.5,184.8 L245.9,154.9 L287.2,134.7 L332.4,125.9 Z M336.6,164.6 L338.6,166.3 L331.0,183.9 L362.7,187.5 L368.5,194.5 L368.5,201.5 L366.3,206.8 L346.7,213.8 L334.4,221.8 L293.7,223.5 L302.6,197.1 L312.7,178.7 L325.2,168.1 L336.4,165.5 Z M337.5,149.6 L366.3,150.5 L379.3,156.7 L380.8,162.8 L377.5,169.9 L357.2,180.4 L352.2,180.4 L360.7,173.4 L362.1,169.9 L362.1,165.5 L359.8,161.1 L353.6,158.4 L318.3,159.3 L277.8,165.5 L307.1,154.9 L337.3,150.5 Z';
export const RAVENS_DECAL_PURPLE_PATH =
  'M336.6,140.0 L375.0,141.7 L419.3,155.8 L436.9,168.1 L444.1,176.9 L449.2,187.5 L451.0,198.0 L450.8,201.5 L446.5,201.5 L435.8,185.7 L429.1,181.3 L440.0,183.9 L435.1,176.9 L415.0,167.2 L397.8,167.2 L409.2,170.7 L418.6,177.8 L399.6,177.8 L378.6,183.9 L378.4,186.6 L392.9,186.6 L406.5,191.9 L385.1,196.2 L376.8,204.2 L404.7,202.4 L419.7,205.0 L398.9,205.9 L392.5,209.4 L436.0,216.5 L390.9,215.6 L354.7,227.9 L357.8,229.7 L386.2,223.5 L415.9,223.5 L416.6,224.4 L415.0,225.3 L414.6,228.8 L416.8,233.2 L431.8,243.8 L433.6,249.9 L433.3,255.2 L434.2,256.1 L425.1,264.9 L420.8,266.6 L421.5,256.1 L419.7,248.1 L418.6,248.1 L409.9,260.5 L391.1,271.0 L381.3,282.5 L382.8,274.5 L394.5,256.1 L377.0,260.5 L377.7,249.9 L375.2,243.8 L361.6,235.8 L317.2,236.7 L329.7,224.4 L341.7,217.4 L370.3,205.9 L373.0,199.8 L373.0,195.4 L371.9,191.9 L367.2,185.7 L360.3,183.1 L380.8,171.6 L384.4,162.8 L383.5,155.8 L375.0,147.9 L360.7,144.4 L323.6,146.1 L283.9,157.5 L261.5,170.7 L265.1,172.5 L321.9,164.6 L313.4,169.9 L304.2,182.2 L295.5,201.5 L289.5,220.0 L288.1,227.9 L278.1,228.8 L284.3,214.7 L287.9,199.8 L287.9,192.7 L284.3,183.1 L274.7,177.8 L238.3,182.2 L256.2,167.2 L283.9,152.3 L311.8,143.5 L336.4,140.8 Z M331.0,191.9 L338.8,195.4 L341.1,198.9 L341.1,201.5 L336.8,212.1 L323.9,213.0 L330.8,192.7 Z';
export const RAVENS_DECAL_WHITE_PATH =
  'M468.0,202.4 L501.2,209.4 L521.8,219.1 L539.9,234.1 L544.8,242.0 L547.3,253.4 L537.7,245.5 L525.1,240.2 L480.5,229.7 L425.7,224.4 L424.4,227.9 L428.0,233.2 L438.7,240.2 L439.6,239.4 L438.0,235.0 L439.6,233.2 L449.2,233.2 L507.7,242.0 L537.9,251.7 L521.4,255.2 L445.6,253.4 L438.5,246.4 L433.8,255.2 L434.0,249.9 L432.0,242.9 L415.0,229.7 L415.0,226.2 L417.0,222.6 L385.1,222.6 L354.9,228.8 L372.1,220.9 L391.6,216.5 L436.2,217.4 L422.2,211.2 L392.5,208.6 L399.8,206.8 L434.0,207.7 L470.0,217.4 L460.6,208.6 L474.0,209.4 L468.2,202.4 Z M337.7,145.2 L374.6,148.8 L381.3,153.1 L384.0,158.4 L384.2,161.9 L379.0,172.5 L360.1,182.2 L369.9,189.2 L372.3,194.5 L372.6,199.8 L368.8,205.9 L366.5,205.9 L368.8,201.5 L368.5,193.6 L362.7,186.6 L331.0,183.1 L338.6,167.2 L338.6,163.7 L325.2,167.2 L315.6,174.3 L302.6,196.2 L295.3,216.5 L293.7,224.4 L331.7,223.5 L288.1,227.0 L296.2,200.6 L303.8,183.9 L314.3,169.9 L323.6,162.8 L261.8,171.6 L293.5,154.9 L337.5,146.1 Z M329.0,186.6 L347.3,187.5 L351.8,192.7 L352.0,198.9 L348.2,208.6 L341.5,214.7 L317.2,217.4 L325.0,194.5 L328.8,187.5 Z M421.9,186.6 L427.5,187.5 L420.8,190.1 L419.7,195.4 L421.3,198.9 L417.9,197.1 L416.6,191.9 L421.7,187.5 Z';
export const RAVENS_DECAL_EYE_PATH =
  'M419.7,184.8 L428.2,185.7 L432.0,191.9 L426.4,188.3 L427.7,187.5 L426.4,185.7 L419.9,186.6 L416.4,191.9 L417.9,198.0 L421.7,199.8 L419.9,192.7 L424.4,189.2 L421.5,191.0 L420.6,194.5 L423.3,199.8 L427.3,200.6 L419.5,200.6 L414.3,194.5 L415.0,189.2 L419.5,185.7 Z';
