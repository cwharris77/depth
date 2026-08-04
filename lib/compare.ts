import type { Player, Position } from './types';

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

// The "deepest room" teaser (2026-07-28 reunification spec) needs one comparable
// position, not the full position list — picks whichever position has the most
// combined depth across both sides (max(a, b) per position, tie → earliest position
// in `positions` order). Pure and parallel-array-based (index i of playersA/playersB
// corresponds to positions[i]) so callers precompute once via
// COMPARE_POSITIONS.map(getPlayersByPosition) and reuse the same arrays for both this
// and the currently-selected chip's table — no re-fetching per position.
export function getDeepestPosition(
  playersA: Player[][],
  playersB: Player[][],
  positions: Position[]
): Position | undefined {
  let best: { position: Position; depth: number } | undefined;
  positions.forEach((position, i) => {
    const depth = Math.max(playersA[i]?.length ?? 0, playersB[i]?.length ?? 0);
    if (depth > 0 && (!best || depth > best.depth)) {
      best = { position, depth };
    }
  });
  return best?.position;
}

// Builds the small preview object CompareView renders as the Matchup tab's
// discoverability row — never a whole roster, just the deepest position's rank-1
// players and both sides' counts (AGENTS.md invariant 5: server resolves, client
// receives only what it needs).
export function buildCompareTeaser(
  playersA: Player[][],
  playersB: Player[][],
  positions: Position[]
): CompareTeaser | undefined {
  const position = getDeepestPosition(playersA, playersB, positions);
  if (!position) return undefined;
  const i = positions.indexOf(position);
  return {
    position,
    countA: playersA[i]?.length ?? 0,
    countB: playersB[i]?.length ?? 0,
    topA: playersA[i]?.[0],
    topB: playersB[i]?.[0],
  };
}

export interface CompareTeaser {
  position: Position;
  countA: number;
  countB: number;
  topA?: Player;
  topB?: Player;
}

// Builds the `/compare` query string. Shared by app/compare/page.tsx (server, to
// redirect a shared link's `pos` onto its normalized value — see parseCompareParams
// above) and CompareView.tsx (client, for router.replace on picker interactions) so
// the two never drift on param names/shape.
export function buildComparePath(
  a: string | undefined,
  b: string | undefined,
  pos: Position | undefined,
  scheduleTeamId: string | undefined
): string {
  const params = new URLSearchParams();
  if (a) params.set('a', a);
  if (b) params.set('b', b);
  if (pos) params.set('pos', pos);
  if (scheduleTeamId) {
    params.set('from', 'schedule');
    params.set('scheduleTeam', scheduleTeamId);
  }
  return `/compare?${params.toString()}`;
}
