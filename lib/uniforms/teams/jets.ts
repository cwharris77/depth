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
  'M554.4,154.2 L577.8,154.2 L589.8,156.5 L599.0,161.7 L603.2,167.7 L604.1,170.7 L605.0,175.2 L605.0,182.7 L603.2,193.2 L570.0,193.2 L570.9,188.0 L570.0,182.0 L564.0,177.5 L557.6,178.2 L553.9,181.2 L552.1,185.0 L552.1,190.2 L556.2,194.7 L577.4,203.0 L583.4,206.7 L588.0,212.0 L590.3,220.3 L590.3,228.5 L588.9,237.5 L583.8,251.0 L579.2,258.5 L572.3,265.3 L565.4,269.0 L549.3,272.8 L518.4,272.0 L505.1,266.8 L500.5,262.3 L498.6,258.5 L497.3,252.5 L497.3,242.8 L499.6,232.3 L533.6,232.3 L532.3,238.3 L532.7,244.3 L535.5,248.0 L540.1,249.5 L547.5,248.0 L550.7,243.5 L551.6,236.8 L547.9,230.8 L528.1,222.5 L517.5,215.8 L514.3,210.5 L513.4,206.0 L513.4,196.2 L514.3,190.2 L518.9,177.5 L528.6,164.0 L540.1,157.2 L553.9,155.0 Z M336.1,157.2 L419.0,157.2 L410.3,184.2 L367.4,184.2 L366.5,185.7 L362.4,197.7 L362.8,200.0 L405.2,200.7 L396.9,226.3 L353.6,226.3 L349.0,238.3 L348.1,241.3 L348.6,242.8 L389.1,242.8 L379.9,246.5 L370.7,252.5 L359.1,263.0 L353.6,269.8 L299.3,269.8 L336.1,158.0 Z M285.5,157.2 L327.8,157.2 L307.6,220.3 L297.0,247.3 L289.2,259.3 L282.3,265.3 L275.4,269.0 L261.1,272.8 L240.4,272.8 L224.7,268.3 L215.5,260.0 L213.2,255.5 L211.4,248.8 L210.9,238.3 L212.7,224.8 L221.0,199.2 L256.5,199.2 L246.4,230.8 L245.9,240.5 L247.7,244.3 L250.5,245.8 L255.1,244.3 L256.9,242.0 L262.9,227.8 L285.0,158.0 Z M428.2,157.2 L517.1,157.2 L508.3,184.2 L487.1,184.2 L485.8,186.5 L460.4,264.5 L459.1,266.0 L449.8,256.3 L441.1,249.5 L424.5,242.0 L442.9,185.7 L442.0,184.2 L419.5,184.2 L427.7,158.0 Z';

// The two sleeve bands, floating mid-sleeve rather than running to the hem.
export const JETS_BAND_TOP = [464, 490];
export const JETS_BAND_LOW = [516, 539];
export const JETS_SLEEVE_X_LEFT = [30, 89];
export const JETS_SLEEVE_X_RIGHT = [499, 558];

// The deep V-collar, closing far below the generic chevron.
export const JETS_COLLAR_PATH = 'M196,389 L294,519 L402,389';
export const JETS_COLLAR_WIDTH = 24;
