// New York's construction geometry — the wordmark decal path, the sleeve-band bounds, and the
// collar constants only. The composable parts definition that consumes them lives in ./jets.parts.ts;
// the former flat JETS_UNIFORMS was deleted in the migration that proved parts render
// byte-identically (see parts-parity.test.ts for the one-time gate).
//
// One construction throughout: two bands at the sleeve separated by a body-colored gap, and a deep
// V-collar that closes well below the generic chevron. No helmet stripe, no pant stripe.

// Provenance: contour trace of the club's standalone wordmark SVG — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:New York Jets logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// The wordmark: one layer and four subpaths — the four letterforms with the jet sweeping out of the
// J, all white. The letters are PLAIN UNIONS, never evenodd holes: the counters are shell color, so
// stacking unions reproduces them for free.
export const JETS_DECAL_PATH =
  'M401.3,154.2 L402.5,154.2 L408.3,158.0 L414.5,161.7 L422.3,165.8 L428.7,168.9 L432.3,170.2 L434.5,171.3 L442.0,174.0 L452.0,177.2 L462.4,179.8 L477.1,182.6 L494.2,184.8 L507.1,185.9 L529.5,188.2 L535.6,188.6 L541.2,189.3 L559.5,190.9 L562.1,191.4 L578.1,192.5 L587.7,193.6 L594.9,195.2 L598.1,196.2 L602.6,198.0 L604.7,199.2 L604.9,199.4 L604.9,199.5 L339.9,199.7 L335.7,206.7 L333.2,211.0 L329.7,216.7 L328.2,219.6 L326.8,221.6 L324.3,226.0 L316.0,239.8 L315.3,241.2 L311.9,246.8 L306.3,256.5 L302.0,263.5 L299.2,268.5 L298.8,268.5 L298.4,269.3 L296.8,270.8 L294.7,271.9 L292.7,272.5 L210.9,272.5 L211.3,271.6 L219.9,257.1 L260.5,256.9 L262.4,256.3 L263.7,255.2 L264.3,254.5 L269.8,245.2 L272.5,240.8 L273.9,238.0 L275.3,236.0 L277.4,232.2 L286.3,217.5 L291.2,209.0 L294.7,203.3 L295.6,201.5 L299.0,196.0 L300.2,193.8 L300.8,193.1 L425.5,192.9 L425.6,192.7 L425.4,192.5 L423.0,188.5 L418.8,181.9 L417.7,180.4 L410.2,168.4 L406.9,163.5 L405.7,161.3 L404.0,158.6 L402.9,157.1 L401.3,154.3 Z M526.1,209.9 L599.0,209.9 L595.4,216.3 L591.6,222.6 L591.2,223.1 L542.4,223.3 L548.3,225.7 L554.1,227.9 L556.1,228.8 L558.4,229.5 L569.6,233.9 L575.7,236.2 L577.1,236.9 L578.1,237.7 L578.5,238.0 L579.4,239.7 L579.6,240.1 L579.6,242.6 L578.8,244.2 L576.4,248.3 L575.6,249.4 L574.4,251.9 L571.2,256.8 L570.0,259.3 L568.4,261.7 L564.6,268.4 L563.0,270.7 L562.1,271.6 L560.4,272.5 L468.1,272.5 L469.1,270.6 L473.6,263.2 L475.9,259.1 L477.3,257.1 L525.2,257.0 L536.9,256.8 L534.1,255.7 L531.8,254.9 L529.3,253.8 L513.1,247.7 L508.9,246.0 L507.2,244.5 L506.3,242.7 L506.3,239.8 L506.7,239.0 L508.4,235.9 L517.9,220.1 L520.0,216.3 L522.8,211.8 L524.1,210.7 L526.0,210.0 Z M347.0,209.9 L416.7,209.9 L415.7,212.0 L414.0,214.7 L409.1,223.1 L382.2,223.3 L380.3,226.2 L377.2,231.7 L376.3,233.2 L376.3,233.4 L400.0,233.6 L399.4,234.9 L393.9,244.3 L392.5,246.5 L368.2,246.5 L367.7,247.8 L366.1,250.3 L364.7,253.0 L363.5,254.8 L362.3,257.0 L407.5,257.1 L406.9,258.4 L398.7,272.4 L398.5,272.5 L395.2,272.6 L310.2,272.7 L310.2,271.9 L317.4,260.0 L322.4,251.3 L323.4,250.0 L324.4,247.9 L326.2,245.2 L329.6,239.0 L335.6,229.2 L337.4,226.0 L341.4,219.5 L342.1,218.1 L346.9,210.0 Z M427.4,209.9 L513.1,209.9 L512.7,211.1 L511.9,212.2 L509.8,216.0 L505.5,223.1 L484.0,223.3 L482.4,225.9 L481.6,227.4 L481.0,228.3 L473.5,241.1 L469.7,247.2 L462.5,259.8 L454.8,272.5 L411.9,272.5 L412.3,271.6 L418.0,262.1 L419.9,258.7 L421.1,257.0 L422.3,254.5 L423.4,252.8 L425.6,248.9 L427.6,245.8 L429.5,242.4 L430.7,240.7 L431.9,238.5 L433.4,236.2 L434.9,233.2 L436.0,231.5 L440.9,223.2 L419.7,223.1 L420.3,221.9 L427.4,210.0 Z';

// The two sleeve bands, floating mid-sleeve rather than running to the hem.
export const JETS_BAND_TOP = [464, 490];
export const JETS_BAND_LOW = [516, 539];
export const JETS_SLEEVE_X_LEFT = [30, 89];
export const JETS_SLEEVE_X_RIGHT = [499, 558];

// The deep V-collar, closing far below the generic chevron.
export const JETS_COLLAR_PATH = 'M196,389 L294,519 L402,389';
export const JETS_COLLAR_WIDTH = 24;
