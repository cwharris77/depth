import type { Position } from '../types';
import { classifyDepthChartCode, depthChartUnit } from './positions';

// Converts nflverse's two historical depth-chart schemas into the app's position
// vocabulary. Unlike roster_<season>.csv, depth charts carry a real field slot; the
// final regular-season snapshot is therefore the source of truth for historical side
// labels. This stays pure so ingest and the one-time backfill use precisely
// the same selection rule.
//
// Only a row that names a field position sets one: a role such as nickel back or
// returner, or a reviewed code with no canonical position, leaves the player on whatever
// else he is charted at, or on his roster position. `unmappedCodes` counts rows per `unit:code` that no table
// knows (or `formation:code` when the unit itself is unreadable), so a code nflverse
// starts publishing is reported instead of vanishing.
export function mapHistoricalDepthChartPositions(
  season: number,
  rows: Record<string, string>[],
  resolveTeamCode: (code: string) => string | null
): { positions: Map<string, Position>; unmappedCodes: Record<string, number> } {
  const positions = new Map<string, { order: number; position: Position }>();
  const unmapped = new Map<string, number>();
  for (const row of rows) {
    const legacy = season <= 2024;
    if (legacy && row.game_type !== 'REG') continue;
    const code = (legacy ? row.depth_position : row.pos_abb)?.trim() ?? '';
    const label = (legacy ? row.formation : row.pos_grp)?.trim() ?? '';
    const unit = depthChartUnit(label, legacy);
    const classified = unit ? classifyDepthChartCode(unit, code) : { kind: 'unmapped' as const };
    if (classified.kind === 'unmapped') {
      const reported = `${unit ?? label}:${code}`;
      unmapped.set(reported, (unmapped.get(reported) ?? 0) + 1);
    }
    if (classified.kind !== 'position') continue;
    const teamId = resolveTeamCode((legacy ? row.club_code : row.team)?.trim() ?? '');
    const gsisId = row.gsis_id?.trim();
    if (!teamId || !gsisId) continue;
    const order = legacy ? Number(row.week) : Date.parse(row.dt ?? '');
    if (!Number.isFinite(order)) continue;
    const key = `${teamId}|${gsisId}`;
    const existing = positions.get(key);
    if (!existing || order >= existing.order) {
      positions.set(key, { order, position: classified.position });
    }
  }
  return {
    positions: new Map([...positions].map(([key, value]) => [key, value.position])),
    unmappedCodes: Object.fromEntries([...unmapped].sort(([a], [b]) => a.localeCompare(b))),
  };
}
