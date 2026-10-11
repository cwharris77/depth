import { RECORD_STATS, type RecordStat, type RecordGameRow } from '@/lib/stat-files/records';
import type { StatMoment } from './stat-events';
import type { TeamEvent } from './types';
import { goodWeekCopy } from './copy';

export const GOOD_WEEK_THRESHOLDS: Record<RecordStat, number> = {
  passing_tds: 3,
  passing_yards: 300,
  receiving_tds: 2,
  receiving_yards: 100,
  rushing_tds: 2,
  rushing_yards: 100,
};
export function goodWeekEvents(args: {
  currentSeason: number;
  currentRows: readonly RecordGameRow[];
  historicMoments: readonly StatMoment[];
  playerNames: ReadonlyMap<string, string>;
  now: string;
}): TeamEvent[] {
  const rows = args.currentRows.filter(
    (r) => r.season === args.currentSeason && Number.isSafeInteger(r.week) && r.week > 0
  );
  const latestWeek = rows.reduce((max, r) => Math.max(max, r.week), 0);
  const events: TeamEvent[] = [];
  const seen = new Set<string>();
  for (const row of rows.filter((r) => r.week === latestWeek)) {
    const identity = `${row.season}:${row.week}:${row.team}:${row.player_id}`;
    if (seen.has(identity)) throw new Error(`Duplicate game row: ${identity}`);
    seen.add(identity);
    const playerName = args.playerNames.get(row.player_id);
    if (!row.team || !playerName) continue;
    if (
      args.historicMoments.some(
        (m) =>
          m.kind === 'historic_week' &&
          m.playerId === row.player_id &&
          m.teamId === row.team &&
          m.season === row.season &&
          m.week === row.week
      )
    )
      continue;
    const stats: Partial<Record<RecordStat, number>> = {};
    for (const stat of RECORD_STATS) {
      const value = row.stats[stat];
      if (value !== undefined && Number.isFinite(value) && value >= GOOD_WEEK_THRESHOLDS[stat])
        stats[stat] = value;
    }
    if (Object.keys(stats).length === 0) continue;
    const copy = goodWeekCopy({ playerName, week: row.week, stats });
    events.push({
      dedupeKey: `good_week:${identity}`,
      type: 'good_week',
      tier: 'everything',
      teamId: row.team,
      playerId: row.player_id,
      ...copy,
      payload: {
        season: row.season,
        week: row.week,
        player_name: playerName,
        ...stats,
        ...(row.game_id ? { game_id: row.game_id } : {}),
      },
      source: 'nflverse_stats',
      occurredAt: args.now,
    });
  }
  return events;
}
