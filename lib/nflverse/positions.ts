import type { Position } from '../types';

// Maps nflverse's roster_<season>.csv position vocabulary to ours (mirrors
// lib/espn/positions.ts's approach for the ESPN vocabulary). nflverse collapses
// offensive tackles and guards into one code per pair (`T`/`OT`, `G`/`OG`) with no
// left/right side in the data -- those remain generic `OT`/`G`; only the separately
// sourced historical depth chart may establish a side (DEP-145). Every other code maps
// straight through; an unrecognized code is
// `null` -- the caller skips the row and counts it, never guesses (AGENTS.md invariant 6).
export type RosterPosition = Position;

const DIRECT: Record<string, Position> = {
  qb: 'QB',
  rb: 'RB',
  fb: 'RB',
  wr: 'WR',
  te: 'TE',
  c: 'C',
  de: 'DE',
  edge: 'DE',
  dt: 'DT',
  nt: 'DT',
  olb: 'LB',
  ilb: 'LB',
  mlb: 'LB',
  lb: 'LB',
  cb: 'CB',
  fs: 'S',
  ss: 'S',
  db: 'S',
  s: 'S',
  k: 'K',
  p: 'P',
  ls: 'LS',
  kr: 'KR',
  pr: 'PR',
};

export function mapRosterPosition(code: string): RosterPosition | null {
  const key = code.trim().toLowerCase();
  if (!key) return null;
  if (key === 't' || key === 'ot') return 'OT';
  if (key === 'g' || key === 'og') return 'G';
  return DIRECT[key] ?? null;
}
