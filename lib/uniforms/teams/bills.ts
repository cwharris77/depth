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
  'M542.2,156.0 L547.8,167.0 L545.6,208.8 L536.2,225.1 L528.9,250.5 L513.4,259.6 L509.3,270.0 L497.0,282.2 L492.9,281.6 L493.9,270.9 L488.8,264.7 L458.8,264.3 L447.5,272.5 L446.2,283.8 L438.0,294.2 L385.9,308.3 L379.3,313.6 L376.1,310.8 L380.5,300.1 L404.5,283.8 L402.9,276.6 L356.2,283.2 L350.2,288.5 L311.1,289.8 L294.3,295.7 L272.9,308.3 L245.7,335.9 L238.5,351.0 L220.8,367.6 L214.5,393.7 L210.0,394.6 L204.0,384.9 L205.6,369.8 L215.4,359.8 L219.8,344.4 L247.3,315.2 L255.5,294.5 L266.9,287.6 L474.3,229.2 L481.2,224.2 L495.8,222.9 L503.3,217.2 L509.3,217.6 L514.7,228.9 L525.8,227.6 L521.0,219.1 L523.9,209.1 L520.4,201.9 L532.7,183.3 L530.2,176.1 L279.2,232.0 L301.9,211.6 L326.8,197.2 L363.5,162.0 L421.6,130.0 L444.9,123.1 L470.8,123.7 L506.2,150.7 L530.2,149.1 Z';
export const BILLS_HELMET_DECAL_STRIPE_PATH =
  'M503.6,192.8 L501.8,197.8 L503.3,206.6 L493.5,213.2 L479.3,214.4 L471.4,219.8 L457.9,220.7 L450.9,225.7 L436.4,227.0 L428.5,232.3 L416.2,232.9 L407.7,238.3 L393.5,239.5 L385.3,244.9 L372.0,245.8 L365.1,251.2 L350.8,252.1 L344.2,257.1 L329.7,258.4 L322.4,263.4 L308.2,264.7 L301.0,269.7 L286.8,270.9 L279.2,276.0 L265.3,277.2 L258.0,282.2 L247.3,283.5 L237.2,288.5 L223.9,290.4 L215.1,295.1 L203.1,296.4 L193.3,301.7 L185.4,301.7 L185.4,298.2 L190.1,294.2 L191.7,285.1 L196.8,277.8 L198.7,267.8 L208.1,257.4 L216.4,254.9 L232.8,253.4 L242.9,248.6 L257.7,247.7 L271.9,242.4 L286.8,242.0 L298.1,236.7 L316.1,235.5 L325.9,230.4 L343.6,229.2 L354.6,223.8 L371.7,222.9 L381.2,217.9 L399.1,216.6 L410.2,211.3 L427.2,210.3 L436.7,205.0 L455.0,204.1 L463.6,198.7 L480.6,198.1 L491.3,192.8 Z';

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
