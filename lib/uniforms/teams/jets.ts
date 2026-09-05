// New York's construction geometry — the wordmark decal path, the sleeve-band bounds, and the
// collar constants only. The composable parts definition that consumes them lives in ./jets.parts.ts;
// the former flat JETS_UNIFORMS was deleted in the migration that proved parts render
// byte-identically (see parts-parity.test.ts for the one-time gate).
//
// One construction throughout: two bands at the sleeve separated by a body-colored gap, and a deep
// V-collar that closes well below the generic chevron. No helmet stripe, no pant stripe.

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:New York Jets logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// The wordmark: one layer and four subpaths — the four letterforms with the jet sweeping out of the
// J, all white. The letters are PLAIN UNIONS, never evenodd holes: the counters are shell color, so
// stacking unions reproduces them for free.
export const JETS_DECAL_PATH =
  'M348.5,210.7 L415.5,211.9 L411.1,219.4 L383.6,220.1 L376.1,228.9 L376.1,233.9 L381.1,236.4 L398.6,235.1 L399.2,238.3 L392.3,244.6 L371.1,245.2 L362.3,253.4 L362.3,258.4 L366.0,261.5 L404.8,260.9 L405.5,264.7 L397.3,272.8 L315.4,271.6 L316.6,264.0 L347.9,211.3 Z M409.8,154.2 L429.2,166.7 L464.9,179.3 L502.4,185.5 L537.4,186.2 L603.7,193.7 L342.9,195.0 L332.3,203.8 L330.4,211.9 L294.1,270.3 L210.9,272.2 L217.8,260.9 L261.6,259.6 L289.7,213.8 L291.0,206.9 L302.2,192.5 L425.5,191.2 L428.6,183.7 L409.2,154.8 Z M531.8,210.7 L605.0,212.5 L598.7,219.4 L557.4,219.4 L551.8,222.6 L553.1,228.2 L581.2,236.4 L586.2,242.0 L566.8,272.2 L479.3,272.8 L479.3,265.9 L485.5,260.9 L535.5,261.5 L541.8,258.4 L540.6,252.7 L528.7,250.8 L514.9,242.7 L531.2,211.3 Z M442.4,210.7 L514.3,211.3 L514.9,213.8 L511.2,219.4 L488.0,221.3 L459.2,270.3 L453.6,272.8 L422.3,272.2 L421.7,264.0 L438.6,238.9 L440.5,231.4 L446.1,227.0 L444.9,220.7 L429.2,220.1 L427.3,215.7 L431.1,211.3 L441.7,211.3 Z';

// The two sleeve bands, floating mid-sleeve rather than running to the hem.
export const JETS_BAND_TOP = [464, 490];
export const JETS_BAND_LOW = [516, 539];
export const JETS_SLEEVE_X_LEFT = [30, 89];
export const JETS_SLEEVE_X_RIGHT = [499, 558];

// The deep V-collar, closing far below the generic chevron.
export const JETS_COLLAR_PATH = 'M196,389 L294,519 L402,389';
export const JETS_COLLAR_WIDTH = 24;
