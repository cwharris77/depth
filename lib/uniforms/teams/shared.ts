// Construction geometry that is genuinely shared between team modules — not a grab-bag. Anything
// here must be a fact about the mannequin rather than about a team, so that a second team adopting
// it is reuse and not coincidence. Team-specific paths stay in that team's module.

// A band hugging the crown silhouette from the back quarter to the front, which is all a side view
// can show of a helmet center stripe. It thins toward the front to echo the shell's taper. Authored
// in raw helmet coordinates (x:139-802, y:65-674) against the shared mannequin shell, so it lands
// identically for every team; each team supplies only its own color.
export const HELMET_CROWN_STRIPE_PATH =
  'M236,127 L252,115 L302,91 L334,79 L374,69 L402,65 L455,65 L509,73 L547,85 L593,109 L631,137 L625,146 L589,119 L545,96 L508,85 L455,78 L402,79 L375,84 L336,95 L305,108 L257,133 L242,146 Z';
