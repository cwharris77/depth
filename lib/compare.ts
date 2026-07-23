import type { Position } from './types';

// Pure query-param validation for the two-team compare view (docs/superpowers/specs/
// 2026-07-07-compare-view-design.md). Kept separate from app/compare/page.tsx so it's
// unit-testable without a server component. `?a=&b=&pos=` are untrusted query params,
// not route segments — an unknown team id or bad position degrades to "unpicked"/the
// default position rather than a throw or a 404 (AGENTS.md invariant 6).

// Position chip row, in display order (Decisions table "Position selector"). Excludes
// KR/PR/LS: those are editorial special-teams slots, not depth groups, so they don't
// belong in a per-position depth comparison.
export const COMPARE_POSITIONS: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'LT',
  'LG',
  'C',
  'RG',
  'RT',
  'DE',
  'DT',
  'LB',
  'CB',
  'S',
  'K',
  'P',
];

function isComparePosition(value: string): value is Position {
  return (COMPARE_POSITIONS as string[]).includes(value);
}

export interface CompareParams {
  a?: string;
  b?: string;
  pos: Position;
}

// Resolves raw `?a=&b=&pos=` strings against the known team ids and the compare
// position list. Unknown/missing team ids resolve to undefined (treated as unpicked);
// an invalid/missing position defaults to QB.
export function parseCompareParams(
  raw: { a?: string; b?: string; pos?: string },
  validTeamIds: readonly string[]
): CompareParams {
  const ids = new Set(validTeamIds);
  const a = raw.a && ids.has(raw.a) ? raw.a : undefined;
  const b = raw.b && ids.has(raw.b) ? raw.b : undefined;
  const pos = raw.pos && isComparePosition(raw.pos) ? raw.pos : 'QB';
  return { a, b, pos };
}
