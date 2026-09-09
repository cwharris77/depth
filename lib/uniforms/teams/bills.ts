// Buffalo's construction geometry — the helmet decal/edge paths, sleeve-band paths, collar
// widths and fixed construction colors only. The composable parts definition that consumes them
// lives in ./bills.parts.ts; the former flat BILLS_UNIFORMS was deleted in the migration that
// proved parts render byte-identically (see parts-parity.test.ts for the one-time gate).

// teamcolorcodes supplies Buffalo's navy and red brand hexes. They remain fixed across kits because
// helmet and band construction does not recolor when a kit's runtime primary changes white/blue.
export const BILLS_NAVY = '#00338D';
export const BILLS_RED = '#C60C30';

// The abstract buffalo and diagonal stripe use the helmet's raw x:139-802, y:65-674 coordinates.
// The stripe's unfilled notch intentionally lets the white shell show through.
export const BILLS_HELMET_DECAL_BUFFALO_PATH =
  'M513.3,145.1 L527.0,146.9 L539.0,153.3 L540.6,153.3 L543.0,149.6 L565.5,170.6 L576.7,186.0 L580.7,194.2 L599.2,194.2 L615.3,198.7 L620.9,202.4 L627.3,212.4 L628.9,219.7 L628.9,234.2 L623.3,273.3 L617.7,289.7 L604.8,307.9 L598.4,327.0 L592.8,337.0 L587.2,339.7 L576.7,340.6 L572.7,348.8 L559.9,366.1 L558.3,362.4 L556.7,363.3 L541.4,378.8 L543.8,351.5 L539.0,345.1 L528.6,344.2 L498.1,346.1 L494.1,358.8 L487.7,369.7 L481.2,376.1 L473.2,380.6 L440.3,386.1 L420.3,385.2 L399.4,396.1 L406.6,371.5 L417.8,367.0 L419.5,365.2 L418.6,360.6 L429.1,357.9 L437.1,353.3 L441.9,348.8 L441.1,347.0 L383.3,348.8 L379.3,353.3 L359.3,350.6 L338.4,350.6 L304.7,357.0 L281.4,367.9 L263.8,381.5 L246.1,400.6 L230.9,421.5 L213.2,436.1 L208.4,443.4 L198.8,475.2 L185.1,454.3 L190.7,440.6 L189.9,433.4 L198.0,427.0 L205.2,417.9 L210.0,408.8 L210.8,401.5 L234.9,381.5 L250.9,363.3 L258.2,352.4 L264.6,336.1 L266.2,335.1 L574.3,282.4 L577.5,282.4 L576.7,293.3 L581.5,300.6 L591.2,299.7 L592.0,298.8 L586.4,291.5 L587.2,286.0 L591.2,281.5 L588.8,275.1 L589.6,266.0 L595.2,254.2 L610.4,237.9 L609.6,236.9 L294.3,266.0 L303.1,257.9 L328.8,239.7 L356.1,224.2 L372.9,216.9 L373.7,216.0 L370.5,213.3 L377.7,209.7 L379.3,205.1 L402.6,188.7 L426.7,175.1 L457.2,162.4 L482.8,156.9 L482.8,149.6 L511.7,147.8 L513.3,146.0 Z M326.4,360.6 L335.2,360.6 L261.4,427.9 L245.3,467.9 L231.7,446.1 L239.7,434.3 L238.9,429.7 L252.5,415.2 L255.7,402.4 L267.0,389.7 L281.4,377.9 L304.7,366.1 L325.6,361.5 Z M501.3,352.4 L514.9,352.4 L516.5,368.8 L515.7,382.4 L511.7,390.6 L506.9,396.1 L498.9,400.6 L485.3,405.2 L467.6,408.8 L454.0,408.8 L436.3,417.9 L441.9,393.3 L443.5,391.5 L470.8,388.8 L486.9,382.4 L498.1,367.9 L501.3,353.3 Z';
export const BILLS_HELMET_DECAL_STRIPE_PATH =
  'M574.3,246.0 L579.9,246.0 L573.5,253.3 L569.5,262.4 L570.3,270.6 L574.3,276.0 L572.7,277.0 L179.5,343.3 L176.3,342.4 L206.0,283.3 L218.8,280.6 L573.5,246.9 Z';

// Back-edge piping also stays in raw helmet space. The wider navy outer stroke must paint before
// the narrower red inset.
export const BILLS_HELMET_EDGE_STRIPE_OUTER_PATH =
  'M221.1,146.0 L206.2,164.8 L191.4,183.7 L176.9,202.5 L165.2,221.3 L154.5,240.2 L147.2,259.0 L147.8,277.8 L153.8,296.7 L154.2,315.5 L157.0,334.3 L158.6,353.2 L163.3,372.0 L164.9,390.8 L170.3,409.7 L172.8,428.5 L177.8,447.4 L183.2,466.2';
export const BILLS_HELMET_EDGE_STRIPE_INNER_PATH =
  'M212.9,259.6 L209.4,272.2 L206.6,284.7 L199.0,297.3 L192.7,309.9 L187.9,322.4 L186.4,335.0 L187.9,347.5 L191.1,360.1 L195.8,372.6 L200.6,385.2';
export const BILLS_HELMET_EDGE_STRIPE_OUTER_WIDTH = 16;
export const BILLS_HELMET_EDGE_STRIPE_INNER_WIDTH = 9;

// The GUD construction reference shows red/white/navy as explicit bands. These paths use the
// outer viewBox, and each right path explicitly mirrors its left across x=294.
export const BILLS_SLEEVE_RED_LEFT =
  'M44,432 L140,432 L140,439 L44,439 Z M44,472 L140,472 L140,479 L44,479 Z';
export const BILLS_SLEEVE_RED_RIGHT =
  'M448,432 L544,432 L544,439 L448,439 Z M448,472 L544,472 L544,479 L448,479 Z';
export const BILLS_SLEEVE_WHITE_LEFT =
  'M44,439 L140,439 L140,446 L44,446 Z M44,479 L140,479 L140,486 L44,486 Z';
export const BILLS_SLEEVE_WHITE_RIGHT =
  'M448,439 L544,439 L544,446 L448,446 Z M448,479 L544,479 L544,486 L448,486 Z';
export const BILLS_SLEEVE_NAVY_LEFT =
  'M44,446 L140,446 L140,453 L44,453 Z M44,486 L140,486 L140,493 L44,493 Z';
export const BILLS_SLEEVE_NAVY_RIGHT =
  'M448,446 L544,446 L544,453 L448,453 Z M448,486 L544,486 L544,493 L448,493 Z';

// Concentric collar strokes share one chevron: widest white first, red next, narrow navy on top.
export const BILLS_COLLAR_WIDTHS = { white: 26, red: 18, navy: 9 };

// Official 2025 Rivalries product shots show two adjacent silver helmet tones and no red. These
// fixed approximations are reference-bound because the runtime Bills palette has no silver tokens.
export const BILLS_ICE_SILVER = '#9CA0A4';
export const BILLS_ICE_SILVER_LIGHT = '#D6D8DA';
