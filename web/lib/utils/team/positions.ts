import type { Position } from '@/lib/types';

// Human-readable name for each roster position code. Typed as a total
// Record<Position, string> so adding a Position to the union without a name here
// is a compile error. Used where the two-letter code alone is ambiguous to casual
// fans (the player card, dot accessibility labels).
export const POSITION_FULL_NAMES: Record<Position, string> = {
  QB: 'Quarterback',
  RB: 'Running Back',
  FB: 'Fullback',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  LT: 'Left Tackle',
  LG: 'Left Guard',
  C: 'Center',
  RG: 'Right Guard',
  RT: 'Right Tackle',
  OT: 'Offensive Tackle',
  G: 'Guard',
  DE: 'Defensive End',
  LDE: 'Left Defensive End',
  RDE: 'Right Defensive End',
  DT: 'Defensive Tackle',
  NT: 'Nose Tackle',
  LB: 'Linebacker',
  WLB: 'Weakside Linebacker',
  LILB: 'Left Inside Linebacker',
  RILB: 'Right Inside Linebacker',
  SLB: 'Strongside Linebacker',
  CB: 'Cornerback',
  LCB: 'Left Cornerback',
  RCB: 'Right Cornerback',
  NB: 'Nickel Back',
  S: 'Safety',
  SS: 'Strong Safety',
  FS: 'Free Safety',
  K: 'Kicker',
  P: 'Punter',
  LS: 'Long Snapper',
  KR: 'Kick Returner',
  PR: 'Punt Returner',
};

export function positionFullName(position: Position): string {
  return POSITION_FULL_NAMES[position];
}
