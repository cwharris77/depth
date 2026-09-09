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
  'M415.4,154.2 L442.8,167.5 L491.4,179.9 L602.6,189.0 L341.7,189.9 L331.6,198.2 L329.2,208.1 L293.2,269.5 L210.9,271.1 L216.4,260.4 L261.0,259.5 L301.8,188.2 L425.6,186.5 L428.7,178.3 L415.4,160.0 L415.4,155.0 Z M531.4,207.3 L604.2,208.1 L598.7,215.6 L556.4,215.6 L550.9,218.9 L553.3,226.4 L579.1,233.8 L585.4,239.6 L569.0,268.7 L478.1,270.3 L485.9,260.4 L535.3,261.2 L543.1,257.0 L541.5,251.2 L528.2,248.7 L514.9,240.5 L530.6,208.1 Z M348.0,207.3 L413.8,208.1 L410.7,215.6 L382.5,216.4 L375.4,224.7 L374.7,231.3 L380.9,234.6 L397.4,233.0 L398.2,236.3 L391.9,242.1 L370.0,242.9 L361.3,251.2 L361.3,257.9 L365.2,261.2 L405.2,262.8 L397.4,271.1 L315.9,271.1 L315.9,264.5 L347.2,208.1 Z M443.6,207.3 L513.3,208.1 L511.8,214.7 L489.0,216.4 L458.5,269.5 L422.4,271.1 L421.7,263.7 L446.7,223.0 L444.4,216.4 L429.5,216.4 L427.9,210.6 L442.8,208.1 Z';

// The two sleeve bands, floating mid-sleeve rather than running to the hem.
export const JETS_BAND_TOP = [464, 490];
export const JETS_BAND_LOW = [516, 539];
export const JETS_SLEEVE_X_LEFT = [30, 89];
export const JETS_SLEEVE_X_RIGHT = [499, 558];

// The deep V-collar, closing far below the generic chevron.
export const JETS_COLLAR_PATH = 'M196,389 L294,519 L402,389';
export const JETS_COLLAR_WIDTH = 24;
