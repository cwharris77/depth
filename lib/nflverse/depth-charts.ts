import { mapDepthchartPosition } from '../espn/positions';
import type { Position } from '../types';

// Converts nflverse's two historical depth-chart schemas into the app's position
// vocabulary. Unlike roster_<season>.csv, depth charts carry a real field slot; the
// final regular-season snapshot is therefore the source of truth for historical side
// labels (DEP-145). This stays pure so ingest and the one-time backfill use precisely
// the same selection rule.
export function mapHistoricalDepthChartPositions(
  season: number,
  rows: Record<string, string>[],
  resolveTeamCode: (code: string) => string | null
): Map<string, Position> {
  const positions = new Map<string, { order: number; position: Position }>();
  for (const row of rows) {
    const legacy = season <= 2024;
    if (legacy && row.game_type !== 'REG') continue;
    const teamId = resolveTeamCode((legacy ? row.club_code : row.team)?.trim() ?? '');
    const gsisId = row.gsis_id?.trim();
    const code = legacy ? row.depth_position : row.pos_abb;
    const position = code ? mapDepthchartPosition(code) : null;
    if (!teamId || !gsisId || !position) continue;
    const order = legacy ? Number(row.week) : Date.parse(row.dt ?? '');
    if (!Number.isFinite(order)) continue;
    const key = `${teamId}|${gsisId}`;
    const existing = positions.get(key);
    if (!existing || order >= existing.order) positions.set(key, { order, position });
  }
  return new Map([...positions].map(([key, value]) => [key, value.position]));
}
