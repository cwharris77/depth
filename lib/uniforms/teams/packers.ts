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

// Traced as the mark's WHITE region only. That region's boundary is the oval minus the glyph, so
// painting a slightly larger ellipse beneath it in green yields both the oval's green rim and the
// green glyph in one pass — no second trace of the letterform, whose ~2px stroke shreds into
// dashes at this source resolution. The white path must render fill-rule evenodd.
export const PACKERS_DECAL_OVAL_PATH =
  'M296.0,288.1 A125.2,77.9 0 1,0 546.3,288.1 A125.2,77.9 0 1,0 296.0,288.1 Z';
export const PACKERS_DECAL_FIELD_PATH =
  'M406.8,215.6 L437.6,215.6 L446.7,218.4 L466.3,219.1 L474.7,224.7 L486.6,226.1 L492.9,231.7 L499.9,233.1 L506.2,238.7 L512.5,240.1 L516.0,246.4 L520.2,247.1 L522.3,252.0 L527.9,254.8 L529.3,261.1 L525.8,262.5 L519.5,260.4 L491.5,260.4 L486.6,262.5 L482.4,258.3 L477.5,256.9 L474.7,251.3 L469.8,249.9 L465.6,243.6 L456.5,242.2 L447.4,235.9 L432.7,235.9 L417.3,233.1 L387.2,236.6 L380.9,242.2 L371.8,243.6 L367.6,249.2 L362.7,250.6 L359.2,256.9 L354.3,258.3 L352.2,265.3 L346.6,272.3 L347.3,300.3 L351.5,302.4 L354.3,310.8 L364.1,321.3 L374.6,324.8 L378.8,330.4 L389.3,331.1 L409.6,337.4 L425.7,337.4 L433.4,336.0 L443.2,331.1 L455.1,330.4 L459.3,325.5 L467.0,323.4 L471.2,317.1 L476.1,315.7 L482.4,306.6 L482.4,302.4 L479.6,299.6 L404.0,299.6 L401.2,296.1 L401.2,292.6 L405.4,287.0 L538.4,287.0 L539.8,294.0 L535.6,300.3 L534.2,312.2 L519.5,327.6 L516.0,329.0 L513.2,333.9 L509.0,334.6 L505.5,340.2 L496.4,341.6 L489.4,347.9 L480.3,348.6 L468.4,354.9 L446.0,356.3 L432.0,360.5 L408.2,360.5 L397.0,356.3 L373.9,354.9 L362.7,348.6 L350.1,347.2 L345.2,341.6 L337.5,340.9 L332.6,334.6 L329.1,333.9 L315.1,320.6 L312.3,314.3 L308.1,312.2 L306.7,303.1 L302.5,297.5 L302.5,278.6 L307.4,272.3 L308.8,262.5 L313.7,259.0 L315.8,254.1 L320.7,252.0 L322.8,247.1 L328.4,244.3 L330.5,240.1 L336.1,239.4 L343.1,233.1 L350.8,231.7 L357.1,226.1 L367.6,225.4 L377.4,219.1 L391.4,219.1 L406.8,216.3 Z';

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
