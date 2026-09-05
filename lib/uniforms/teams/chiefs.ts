// Kansas City's construction geometry — the arrowhead decal and the sleeve-band constants only.
// The composable parts definition that consumes them lives in ./chiefs.parts.ts; the former flat
// CHIEFS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).

// White is a literal on the home kit. Its palette is red over gold with accent === secondary (ESPN
// supplies only two colors), so no token resolves to the pants, the outer sleeve bands or the
// numeral face — resolving any of them from `accent` would paint them gold.
export const CHIEFS_WHITE = '#FFFFFF';

// One path, one color, no fill rule — and that is the whole trick here. The mark is a white
// arrowhead with red letters, and the letters are the same red as the shell they sit on, so tracing
// only the WHITE region gives a single boundary that snakes around the letterforms and lets the
// shell read through them. The Cowboys' star needed two stacked layers and the 49ers' oval needed
// three precisely because their marks are not the shell color. Traced from the helmet bbox
// (x 877-983, y 295-392 in the reference) mapped onto the raw helmet space at ~6.2x.
export const CHIEFS_DECAL_ARROWHEAD_PATH =
  'M325.5,173.2 L329.2,173.2 L333.5,178.8 L357.7,178.8 L361.4,180.0 L365.7,184.3 L391.1,185.0 L397.3,186.8 L401.7,190.6 L420.3,191.8 L424.6,196.8 L436.4,198.0 L441.3,203.0 L449.4,204.9 L453.1,209.2 L463.6,209.8 L468.6,216.0 L473.6,216.7 L478.5,222.2 L484.1,222.9 L489.7,227.8 L495.2,229.1 L499.0,234.1 L503.9,235.9 L506.4,239.7 L512.6,241.5 L516.3,246.5 L520.0,247.1 L523.7,252.7 L527.5,253.9 L529.9,258.9 L533.0,259.5 L533.7,263.9 L528.1,268.2 L526.8,272.0 L522.5,274.5 L518.8,279.4 L512.0,281.3 L507.6,286.9 L501.4,287.5 L497.1,292.5 L492.1,293.7 L486.6,298.7 L482.8,299.9 L477.9,300.6 L477.3,298.1 L480.4,296.2 L485.9,295.6 L494.0,286.9 L494.0,282.5 L492.1,280.7 L488.4,280.0 L484.7,274.5 L471.1,275.1 L466.1,280.7 L454.3,281.3 L443.2,286.9 L418.4,286.3 L412.2,282.5 L406.0,281.3 L406.0,278.8 L439.5,278.8 L443.8,277.6 L445.1,273.8 L449.4,270.7 L449.4,262.6 L443.8,257.7 L438.9,256.4 L438.9,252.7 L458.7,253.3 L463.0,258.9 L469.8,260.2 L472.9,267.6 L474.8,268.9 L480.4,271.3 L485.9,270.7 L489.0,266.4 L494.0,263.3 L494.0,234.7 L488.4,231.0 L476.0,231.0 L472.9,232.2 L454.3,231.0 L438.9,226.0 L438.2,224.1 L439.5,222.9 L442.6,222.2 L446.3,219.1 L447.5,211.7 L442.0,207.3 L437.6,206.1 L405.4,206.7 L401.7,208.0 L398.0,211.7 L396.7,218.5 L391.1,219.8 L386.8,224.7 L379.4,225.4 L376.3,230.3 L373.2,231.6 L368.8,229.7 L369.5,223.5 L373.8,219.8 L375.0,216.0 L374.4,211.1 L372.6,208.6 L368.2,206.7 L332.3,206.7 L326.7,210.4 L323.0,215.4 L323.0,220.4 L329.2,228.5 L329.2,260.2 L323.0,264.5 L323.0,273.8 L325.5,277.6 L365.7,278.2 L370.7,283.8 L373.2,293.1 L375.7,295.6 L380.0,297.4 L383.7,302.4 L393.0,304.3 L398.0,309.2 L448.8,309.2 L459.3,306.8 L464.3,302.4 L474.8,302.4 L474.8,303.7 L470.5,306.1 L464.9,306.8 L458.7,311.7 L449.4,312.4 L442.0,317.3 L430.2,318.0 L424.6,323.5 L405.4,324.2 L395.5,330.4 L381.2,330.4 L373.2,334.7 L357.1,332.9 L352.1,335.4 L321.1,337.2 L320.5,331.0 L324.9,324.8 L324.9,321.1 L321.1,316.1 L320.5,303.7 L318.0,299.9 L290.2,299.3 L280.2,300.6 L276.5,298.7 L277.1,267.0 L281.5,253.9 L281.5,247.1 L279.6,243.4 L281.5,237.2 L281.5,225.4 L277.1,217.9 L278.4,216.0 L301.3,216.0 L305.6,217.3 L308.1,219.8 L311.2,219.8 L319.3,215.4 L326.7,206.7 L326.7,180.6 L324.2,176.3 L325.5,173.8 Z';

// Three bands at the end of each sleeve, measured on the home figure (jersey top y=401, sleeve hem
// y=466, figure center x=921, so scaleY = 191/65 and scaleX = 264/84.5): reference y437-441,
// y443-445 and y447-451, all spanning x840-856, with only a hairline outline between them — so the
// mannequin bands are authored contiguous. The away figure carries the identical set at the same
// offsets from its own jersey top, in red over gold. Extended outward to x=30 for a flush clip.
export const CHIEFS_STRIPE_BOUNDS = [486, 503, 515, 533];
export const CHIEFS_SLEEVE_X_LEFT = [30, 91];
export const CHIEFS_SLEEVE_X_RIGHT = [497, 558];
