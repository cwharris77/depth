// Miami's construction geometry — the two decal sets, the sleeve wedge/slash/collar and 1972
// band paths, and the construction color literal only. The composable parts definition that
// consumes them lives in ./dolphins.parts.ts; the former flat DOLPHINS_UNIFORMS was deleted in the
// migration that proved parts render byte-identically (see parts-parity.test.ts for the one-time
// gate).
//
// The four kits are NOT one construction: home/away carry no sleeve trim; the 1972 throwback
// carries a five-band sleeve set and a teal crown stripe; Rivalries carries a teal wedge with an
// orange slash plus an orange collar V. All four wear a helmet crown stripe (shared geometry from
// ./shared.ts).

// White is a literal on the home kit only. Its palette is teal over orange with accent ===
// secondary (ESPN supplies only two colors), so no token resolves to its white shell, white pants
// or white numeral face.
export const DOLPHINS_WHITE = '#FFFFFF';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Miami Dolphins logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// TWO marks: the current kits wear a teal dolphin inside an orange sunburst; the throwback wears a
// teal dolphin breaking through a solid orange ring. The "M" on the throwback dolphin's helmet is
// dropped (about 2px in the reference).
export const DOLPHINS_DECAL_SUNBURST_PATH =
  'M418.0,120.9 L428.6,141.0 L384.8,146.6 L344.2,178.6 L332.3,206.9 L331.7,238.3 L326.0,239.5 L314.8,223.8 L324.8,218.8 L326.6,210.0 L310.4,198.1 L328.5,196.2 L336.7,181.1 L344.8,177.4 L328.5,154.1 L352.9,161.1 L359.2,154.1 L371.1,151.0 L371.1,123.4 L388.6,139.7 L394.8,140.3 L397.3,130.9 L403.6,135.3 L412.3,133.4 L417.3,121.5 Z M466.8,127.8 L466.1,148.5 L473.6,152.9 L481.1,147.9 L479.9,163.6 L493.0,169.2 L482.4,169.8 L451.1,147.9 L466.1,128.4 Z M441.7,133.4 L444.2,144.7 L431.1,141.6 L441.1,134.1 Z M506.8,238.9 L523.7,249.6 L506.8,258.4 L512.4,271.5 L495.5,273.4 L494.3,281.0 L506.8,296.7 L484.9,289.8 L479.9,296.7 L480.5,308.6 L464.9,304.2 L458.0,313.6 L461.8,335.0 L444.2,316.7 L438.6,318.6 L437.4,327.4 L426.1,321.8 L416.7,335.6 L411.1,319.3 L395.5,324.3 L386.1,314.9 L363.6,333.1 L367.9,307.3 L361.1,302.3 L352.3,304.8 L352.3,292.9 L347.9,289.1 L329.2,289.1 L334.8,284.1 L351.0,285.4 L382.3,308.6 L407.3,316.1 L433.6,314.9 L463.6,303.6 L481.1,287.2 L494.9,270.3 L506.2,239.5 Z';
export const DOLPHINS_DECAL_DOLPHIN_PATH =
  'M489.9,172.4 L526.8,178.6 L537.4,184.9 L567.5,187.4 L490.5,202.5 L456.8,223.8 L471.1,211.9 L466.8,207.5 L437.4,235.8 L441.7,239.5 L448.6,232.6 L437.4,242.7 L442.4,247.7 L449.9,242.0 L444.2,248.3 L433.6,242.7 L397.3,268.4 L407.3,271.5 L381.1,279.1 L371.1,277.2 L393.6,273.4 L377.3,266.5 L387.3,265.3 L396.1,250.2 L391.1,246.4 L380.4,252.1 L388.6,246.4 L399.8,247.1 L398.6,239.5 L373.6,246.4 L372.3,250.2 L377.9,252.1 L363.6,257.7 L306.6,258.4 L292.2,263.4 L267.2,246.4 L257.2,245.2 L236.0,232.6 L220.9,207.5 L224.7,205.0 L259.1,229.5 L271.0,228.2 L287.2,233.9 L287.9,238.3 L277.9,242.7 L281.6,247.7 L309.1,250.8 L331.0,247.1 L377.3,221.3 L381.7,210.0 L371.1,201.9 L358.6,200.6 L367.3,193.1 L414.2,197.5 L454.9,179.3 L489.3,173.0 Z M487.4,245.2 L473.6,264.6 L474.9,257.7 L463.0,266.5 L463.0,271.5 L468.0,270.3 L461.1,277.2 L448.0,282.2 L458.0,263.4 L455.5,257.7 L450.5,257.7 L486.8,245.8 Z M305.4,265.9 L324.1,270.9 L376.1,267.2 L325.4,273.4 L332.9,277.8 L304.8,270.9 L304.8,266.5 Z';
export const DOLPHINS_TB_DECAL_RING_PATH =
  'M392.3,111.5 L413.0,121.5 L438.0,115.2 L455.5,134.1 L480.5,135.3 L484.3,154.1 L507.4,170.5 L507.4,194.3 L521.8,211.9 L513.0,230.1 L513.7,246.4 L519.3,257.1 L500.5,274.1 L498.0,286.6 L501.2,294.8 L479.9,302.3 L470.5,311.1 L464.3,327.4 L452.4,324.3 L438.6,326.8 L423.6,340.6 L399.8,331.2 L377.3,339.3 L363.6,321.8 L351.0,314.2 L354.8,308.0 L387.9,322.4 L427.4,322.4 L457.4,309.8 L488.0,280.3 L502.4,248.3 L502.4,205.6 L489.3,173.6 L462.4,146.0 L437.4,133.4 L401.1,129.7 L362.3,140.3 L332.9,165.4 L312.9,204.4 L312.9,247.7 L325.4,274.1 L324.1,289.8 L306.0,281.6 L307.9,259.0 L294.7,241.4 L302.3,225.1 L301.6,206.3 L295.4,198.1 L313.5,181.1 L316.0,156.7 L339.2,147.2 L352.9,124.6 L373.6,127.8 L391.7,112.1 Z M429.2,184.9 L432.4,186.8 L429.2,200.0 L413.0,191.2 L416.1,185.5 L423.0,193.7 L428.6,185.5 Z';
export const DOLPHINS_TB_DECAL_DOLPHIN_PATH =
  'M448.0,189.9 L472.4,210.0 L470.5,220.1 L474.9,228.2 L435.5,238.3 L429.2,243.9 L425.5,274.7 L418.6,281.6 L404.2,260.9 L399.8,275.9 L384.2,294.8 L377.3,292.3 L377.9,285.4 L384.2,281.6 L382.3,276.6 L368.6,286.0 L344.8,315.5 L337.3,343.1 L341.7,354.4 L366.1,360.7 L368.6,367.0 L336.0,371.4 L323.5,390.2 L317.3,390.8 L315.4,377.6 L331.0,353.2 L326.6,289.8 L341.0,243.3 L339.8,235.1 L329.2,232.6 L326.6,224.5 L339.8,216.3 L366.1,215.0 L396.7,195.6 L407.3,213.2 L421.7,218.2 L404.8,221.3 L384.8,233.9 L355.4,262.8 L345.4,288.5 L347.9,297.9 L363.6,282.2 L361.7,274.1 L366.7,267.2 L393.6,243.9 L396.7,235.8 L402.3,237.0 L400.5,245.2 L404.8,246.4 L418.0,229.5 L436.7,228.2 L441.1,223.2 L454.9,230.1 L464.9,225.7 L452.4,218.8 L458.6,212.5 L456.1,208.8 L434.2,218.2 L447.4,199.3 L447.4,190.6 Z';

// The 1972 five-band sleeve set, floating mid-sleeve rather than running to the hem.
export const DOLPHINS_TB_STRIPE_BOUNDS = [458, 471, 486, 509, 526, 536];
export const DOLPHINS_SLEEVE_X_LEFT = [30, 92];
export const DOLPHINS_SLEEVE_X_RIGHT = [496, 558];

// The Rivalries sleeve wedge — teal runs from a point and widens until the sleeve seam cuts it.
export const DOLPHINS_WEDGE_LEFT = 'M30,496 L92,545 L30,545 Z';
export const DOLPHINS_WEDGE_RIGHT = 'M558,496 L496,545 L558,545 Z';
export const DOLPHINS_SLASH_LEFT = 'M30,507 L55,519';
export const DOLPHINS_SLASH_RIGHT = 'M558,507 L533,519';
export const DOLPHINS_SLASH_WIDTH = 7;

// The Rivalries collar V.
export const DOLPHINS_COLLAR_PATH = 'M208,415 L294,455 L380,415';
export const DOLPHINS_COLLAR_WIDTH = 10;
