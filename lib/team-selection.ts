import type { Unit } from './types';

// Pure query-param helpers for the `/team/[id]` selection state (selected player + active
// unit tab), mirroring how lib/compare.ts's parseCompareParams treats `?a=&b=&pos=` as
// untrusted input that degrades rather than throws (AGENTS.md invariant 6). Kept separate
// from components/DepthChartField.tsx so the URL <-> state mapping is unit-testable
// without mounting the client tree.

const UNITS: readonly Unit[] = ['offense', 'defense', 'special'];

export function isUnit(value: string | null | undefined): value is Unit {
  return !!value && (UNITS as readonly string[]).includes(value);
}

// Builds the `/team/[id]` URL for a given selection. `unit` is omitted at its default
// ('offense') and `player` is omitted when nothing is selected, so the bare team URL
// (no selection) stays clean rather than always carrying `?unit=offense`.
export function buildTeamSelectionUrl(
  pathname: string,
  selection: { unit: Unit; playerId: string | null }
): string {
  const params = new URLSearchParams();
  if (selection.unit !== 'offense') params.set('unit', selection.unit);
  if (selection.playerId) params.set('player', selection.playerId);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
