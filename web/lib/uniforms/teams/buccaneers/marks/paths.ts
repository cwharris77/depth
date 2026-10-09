// Tampa Bay's sleeve and collar geometry in mannequin space.

// The sleeve cuff is a single solid band at the hem, extended flush for the clip.
export const BUCCANEERS_CUFF_LEFT = 'M30,545 H146 V578 H30 Z';
export const BUCCANEERS_CUFF_RIGHT = 'M558,545 H442 V578 H558 Z';

// The creamsicle's three-band cuff is authored contiguous: band edges, top to bottom, across each
// sleeve's outer and inner x.
export const BUCCANEERS_CREAM_BOUNDS = [528, 539, 559, 578];
export const BUCCANEERS_SLEEVE_X_LEFT = [30, 146];
export const BUCCANEERS_SLEEVE_X_RIGHT = [442, 558];
