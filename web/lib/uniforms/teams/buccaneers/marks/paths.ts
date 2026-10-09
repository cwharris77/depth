// Tampa Bay's sleeve and collar geometry in mannequin space.

// The sleeve cuff is a single solid band at the hem, extended flush for the clip.
export const BUCCANEERS_CUFF_LEFT = 'M30,558 H146 V591 H30 Z';
export const BUCCANEERS_CUFF_RIGHT = 'M558,558 H442 V591 H558 Z';

// The creamsicle's three-band cuff is authored contiguous: band edges, top to bottom, across each
// sleeve's outer and inner x.
export const BUCCANEERS_CREAM_BOUNDS = [541, 552, 572, 591];
export const BUCCANEERS_SLEEVE_X_LEFT = [30, 146];
export const BUCCANEERS_SLEEVE_X_RIGHT = [442, 558];
