import type { Unit } from '@/lib/types';

// Pure query-param helpers for the `/team/[id]` selection state (selected player + active
// unit tab), mirroring how lib/utils/compare.ts's parseCompareParams treats `?a=&b=&pos=` as
// untrusted input that degrades rather than throws (AGENTS.md invariant 6). Kept separate
// from components/DepthChartField.tsx so the URL <-> state mapping is unit-testable
// without mounting the client tree.

const UNITS: readonly Unit[] = ['offense', 'defense', 'special'];

export function isUnit(value: string | null | undefined): value is Unit {
  return !!value && (UNITS as readonly string[]).includes(value);
}

// Builds the `/team/[id]` URL for a given selection. `unit` is omitted at its default
// ('offense') and `player` is omitted when nothing is selected, so the bare team URL
// (no selection) stays clean rather than always carrying `?unit=offense`. `season` is
// carried through every rebuild (unlike `player`/`unit`, it isn't reset by selecting a
// player or switching units) since Phase D1's `?season=` link is meant to stay shareable
// through ordinary field interaction, not just survive a page load
// (../obsidian/Projects/depth/specs/2026-07-07-phase-d-history-and-boards-design.md).
export function buildTeamSelectionUrl(
  pathname: string,
  selection: { unit: Unit; playerId: string | null; season?: number | null }
): string {
  const params = new URLSearchParams();
  if (selection.unit !== 'offense') params.set('unit', selection.unit);
  if (selection.playerId) params.set('player', selection.playerId);
  if (selection.season !== null && selection.season !== undefined) {
    params.set('season', String(selection.season));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
