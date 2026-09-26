import type { Position } from '../types';

// Maps nflverse's roster_<season>.csv position vocabulary to ours (mirrors
// lib/espn/positions.ts's approach for the ESPN vocabulary). A code with an exact
// canonical equivalent keeps it (`FB`, `NT`, `FS`, `SS`), and a coarse code stays coarse
// rather than being widened into a specific one. nflverse collapses offensive tackles
// and guards into one code per pair (`T`/`OT`, `G`/`OG`) with no left/right side in the
// data -- those remain generic `OT`/`G`; only the separately sourced historical depth
// chart may establish a side. `OLB`/`ILB`/`MLB` and `EDGE` have no unsided canonical
// value, so they map to `LB` and `DE`. A generic `DB` stays `DB` rather than being
// widened into a corner or safety. An unrecognized code is `null` -- the caller
// drops the row with a reason, never guesses.
export type RosterPosition = Position;

const DIRECT: Record<string, Position> = {
  qb: 'QB',
  rb: 'RB',
  fb: 'FB',
  wr: 'WR',
  te: 'TE',
  c: 'C',
  de: 'DE',
  edge: 'DE',
  dt: 'DT',
  nt: 'NT',
  olb: 'LB',
  ilb: 'LB',
  mlb: 'LB',
  lb: 'LB',
  cb: 'CB',
  fs: 'FS',
  ss: 'SS',
  db: 'DB',
  s: 'S',
  saf: 'S',
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
