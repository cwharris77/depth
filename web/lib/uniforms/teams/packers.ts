// Green Bay's construction geometry — the G decal, sleeve/pant stripe and helmet-stripe paths,
// and the construction color constants only. The composable parts definition that consumes them
// lives in ./packers.parts.ts; the former flat PACKERS_UNIFORMS was deleted in the migration that
// proved parts render byte-identically (see parts-parity.test.ts for the one-time gate).

// Fixed construction colors. Green Bay's kits recolor their body but not their marks: the gold
// shell and the green/white stripe set stay put whether the jersey is green, white or navy. GUD
// renders the brand pair as #FCCD01/#004001 against the official #FFB612/#203731, so these follow
// the official values and only the throwback's bronze is sampled from the composite.
export const PACKERS_GOLD = '#FFB612';
export const PACKERS_GREEN = '#203731';
// The 1923 kit's leather shell and bronze-gold numerals have no token on that kit's palette.
export const PACKERS_1923_LEATHER = '#7B4A2A';

// The sleeve stripe set: gold / white / gold, banded across the outer half of each sleeve. The
// reference stacks them at y=475-491, 491-509 and 509-531 in mannequin space.
export const PACKERS_SLEEVE_GOLD_UPPER_LEFT = 'M32,475 L104,475 L104,491 L32,491 Z';
export const PACKERS_SLEEVE_GOLD_UPPER_RIGHT = 'M484,475 L556,475 L556,491 L484,491 Z';
export const PACKERS_SLEEVE_WHITE_LEFT = 'M32,491 L104,491 L104,509 L32,509 Z';
export const PACKERS_SLEEVE_WHITE_RIGHT = 'M484,491 L556,491 L556,509 L484,509 Z';
export const PACKERS_SLEEVE_GOLD_LOWER_LEFT = 'M32,509 L104,509 L104,531 L32,531 Z';
export const PACKERS_SLEEVE_GOLD_LOWER_RIGHT = 'M484,509 L556,509 L556,531 L484,531 Z';

// Gold pants carry a green stripe with a white stripe inset over it, reading green/white/green.
export const PACKERS_PANTS_GREEN_LEFT = 'M112,807 H140 V1462 H112 Z';
export const PACKERS_PANTS_GREEN_RIGHT = 'M448,807 H476 V1462 H448 Z';
export const PACKERS_PANTS_WHITE_LEFT = 'M122,807 H130 V1462 H122 Z';
export const PACKERS_PANTS_WHITE_RIGHT = 'M458,807 H466 V1462 H458 Z';

// The helmet's green/white/green center stripe, hugging the crown silhouette from the back quarter
// to the front — all a side view can show of a center stripe. Raw helmet coordinates.
export const PACKERS_HELMET_STRIPE_PATH =
  'M236,127 L252,115 L302,91 L334,79 L374,69 L402,65 L455,65 L509,73 L547,85 L593,109 L631,137 L619,155 L585,129 L544,107 L507,95 L455,87 L402,87 L376,91 L337,101 L306,113 L258,137 L244,150 Z';
// The white centre is inset from BOTH edges of the green band — roughly a third of its thickness —
// so the stripe reads green/white/green. Matching the outer band's width here made the white
// swallow it whole and the stripe vanished against the gold shell.
export const PACKERS_HELMET_STRIPE_INNER_PATH =
  'M243,133 L255,122 L304,98 L336,86 L375,76 L402,72 L455,72 L509,80 L547,92 L592,116 L627,144 L620,150 L586,124 L545,100 L508,88 L455,80 L402,80 L376,84 L338,94 L307,106 L259,130 L246,141 Z';

// Concentric collar: widest gold first, white over it, narrow gold on top — same painting order as
// the Bills' three-band collar.
export const PACKERS_COLLAR_WIDTHS = { gold: 26, white: 16, goldInner: 7 };
