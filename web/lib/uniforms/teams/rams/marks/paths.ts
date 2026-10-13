// Los Angeles' raw path data. Sleeve and leg paths are in the mannequin's 588-wide space; the horn
// stays in raw helmet coordinates (x:139-802, y:65-674). Right paths mirror the left across the
// centerline x=294 (mirroredX = 588 - x).

// The horn, contour-traced and emitted by scripts/uniform-draw/rams_horn.py. Re-run that script
// rather than hand-editing this string. The linework is mirrored because its source drawing faces
// the helmet left.
//
// Topology: two 8-connected components and no enclosed hole, because the spiral's tip laps back
// over its own body and the shell shows through the gap. Two subpaths, one fill, no fill rule.
export const RAMS_DECAL_HORN_PATH =
  'M404.0,167.6 L383.6,167.6 L347.0,173.8 L319.3,184.4 L294.8,198.7 L254.9,236.0 L225.6,284.8 L215.8,311.5 L209.3,342.6 L209.3,399.5 L215.8,430.6 L224.8,455.4 L253.3,504.3 L277.7,530.1 L301.4,547.8 L328.2,561.2 L339.6,552.3 L351.0,553.2 L360.0,562.1 L362.4,570.9 L366.5,572.7 L416.2,573.6 L452.8,563.8 L452.8,552.3 L427.6,552.3 L397.5,546.1 L368.9,532.7 L346.1,515.9 L325.0,492.8 L309.5,468.8 L299.7,446.6 L290.8,411.0 L290.8,361.3 L295.7,338.2 L310.3,302.6 L326.6,277.7 L343.7,259.1 L362.4,244.0 L385.2,231.5 L408.0,223.5 L430.8,220.0 L452.0,220.0 L481.3,225.3 L503.3,234.2 L531.0,252.0 L562.0,285.7 L538.3,243.1 L517.2,219.1 L495.2,200.4 L468.3,184.4 L441.4,173.8 L404.8,168.4 Z M471.6,102.7 L414.6,105.4 L371.4,117.8 L325.8,142.7 L284.3,180.0 L330.7,156.0 L373.8,146.2 L421.1,147.1 L472.4,162.2 L499.2,177.3 L525.3,197.8 L550.6,225.3 L570.9,256.4 L592.1,308.8 L597.8,337.3 L599.4,371.9 L687.4,372.8 L687.4,327.5 L676.0,276.0 L654.0,226.2 L628.7,188.9 L598.6,157.8 L565.2,133.8 L516.4,111.6 L472.4,103.6 Z';

// The 2020 capped-sleeve horn is a narrow curved band with a separate outer split.
export const RAMS_CAPPED_HORN_BAND_LEFT =
  'M103,400 C119,418 130,446 132,480 C135,517 134,552 136,568 L136,589 L88,589 C89,535 89,497 87,466 C85,441 80,424 74,412 C84,407 94,403 103,400 Z';
export const RAMS_CAPPED_HORN_BAND_RIGHT =
  'M485,400 C469,418 458,446 456,480 C453,517 454,552 452,568 L452,589 L500,589 C499,535 499,497 501,466 C503,441 508,424 514,412 C504,407 494,403 485,400 Z';
export const RAMS_CAPPED_HORN_SPLIT_LEFT = 'M67,416 C72,433 77,459 80,486 C73,470 65,448 58,421 Z';
export const RAMS_CAPPED_HORN_SPLIT_RIGHT =
  'M521,416 C516,433 511,459 508,486 C515,470 523,448 530,421 Z';
export const RAMS_AWAY_HORN_SPLIT_LEFT = 'M103,400 C119,430 135,475 136,568 L30,568 L30,425 Z';
export const RAMS_AWAY_HORN_SPLIT_RIGHT = 'M485,400 C469,430 453,475 452,568 L558,568 L558,425 Z';

// The front of Midnight Mode shows a tapered inner horn and a blue outer sleeve. The curl
// wraps around the rear of the sleeve, leaving only a short yellow tip visible at the front edge.
export const RAMS_RIVALRIES_HORN_FRONT_LEFT =
  'M93,402 C104,400 114,398 125,397 C119,440 115,486 111,532 C110,542 108,553 104,558 C100,559 97,553 96,544 C91,497 85,449 75,410 Z M30,549 C43,547 53,541 65,531 C56,543 44,551 30,557 Z';
export const RAMS_RIVALRIES_HORN_FRONT_RIGHT =
  'M495,402 C484,400 474,398 463,397 C469,440 473,486 477,532 C478,542 480,553 484,558 C488,559 491,553 492,544 C497,497 503,449 513,410 Z M558,549 C545,547 535,541 523,531 C532,543 544,551 558,557 Z';
export const RAMS_RIVALRIES_BLUE_PANEL_LEFT =
  'M75,410 C85,449 91,497 96,544 C82,538 68,530 54,521 L30,552 L30,442 C45,429 60,418 75,410 Z';
export const RAMS_RIVALRIES_BLUE_PANEL_RIGHT =
  'M513,410 C503,449 497,497 492,544 C506,538 520,530 534,521 L558,552 L558,442 C543,429 528,418 513,410 Z';

// The pant leg stripe: an outer keyline and an inboard band, together the 16-unit stripe of the
// mannequin's leg, both stopping at the hem so the socks stay clear.
export const RAMS_STRIPE_KEYLINE_LEFT = 'M118,807 H123 V1196 H118 Z';
export const RAMS_STRIPE_KEYLINE_RIGHT = 'M465,807 H470 V1196 H465 Z';
export const RAMS_STRIPE_BAND_LEFT = 'M123,807 H134 V1196 H123 Z';
export const RAMS_STRIPE_BAND_RIGHT = 'M454,807 H465 V1196 H454 Z';
