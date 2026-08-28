import type { Position } from '../types';

// Maps nflverse's roster_<season>.csv position vocabulary to ours (mirrors
// lib/espn/positions.ts's approach for the ESPN vocabulary). nflverse collapses
// offensive tackles and guards into one code per pair (`T`/`OT`, `G`/`OG`) with no
// left/right side in the data -- those resolve to a pseudo-position here and get a
// real side assigned by lib/nflverse/depth-heuristic.ts's usage-order alternation
// (../obsidian/Projects/depth/specs/2026-07-07-phase-d-history-and-boards-design.md, locked
// decision table). Every other code maps straight through; an unrecognized code is
// `null` -- the caller skips the row and counts it, never guesses (AGENTS.md invariant 6).
export type RosterPosition = Position | 'OL_TACKLE' | 'OL_GUARD';

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

const OL_TACKLE_CODES = new Set(['t', 'ot']);
const OL_GUARD_CODES = new Set(['g', 'og']);

export function mapRosterPosition(code: string): RosterPosition | null {
  const key = code.trim().toLowerCase();
  if (!key) return null;
  if (OL_TACKLE_CODES.has(key)) return 'OL_TACKLE';
  if (OL_GUARD_CODES.has(key)) return 'OL_GUARD';
  return DIRECT[key] ?? null;
}

// Left/right assignment for the collapsed OL codes: alternate by usage-rank order
// within the team's tackle/guard group (rank 1 -> left, rank 2 -> right, rank 3 ->
// left, ...) so the field's five OL slots fill instead of stacking every tackle at
// LT. `rankIndex` is 0-based (0 = highest usage).
export function resolveOlSide(position: RosterPosition, rankIndex: number): Position {
  if (position === 'OL_TACKLE') return rankIndex % 2 === 0 ? 'LT' : 'RT';
  if (position === 'OL_GUARD') return rankIndex % 2 === 0 ? 'LG' : 'RG';
  return position;
}
