// Cleveland's construction geometry — the stripe-stack bounds and sleeve x-ranges, and the
// construction color literal only. The composable parts definition that consumes them lives in
// ./browns.parts.ts; the former flat BROWNS_UNIFORMS was deleted in the migration that proved
// parts render byte-identically (see parts-parity.test.ts for the one-time gate).

// White is a literal on the home kit, not a token. Cleveland's ESPN feed pairs brown with orange,
// so `toTeamColors` gives the home kit accent === secondary === orange and no white token exists.
export const BROWNS_WHITE = '#FFFFFF';

// The sleeve stripe stack: five alternating bands at the very end of each sleeve. Reference y
// 163/167/173/177/183/187 maps to the boundaries below; the away figure carries the identical
// stack 510px lower with brown in white's place. Extended outward to x=30 for a flush clip.
export const BROWNS_STRIPE_BOUNDS = [461, 473, 491, 503, 521, 533];
export const BROWNS_SLEEVE_X_LEFT = [30, 89];
export const BROWNS_SLEEVE_X_RIGHT = [499, 558];
