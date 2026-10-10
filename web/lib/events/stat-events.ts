// League record files + the live season's rows -> record chases and historic single
// games. Pure: no fetch, no DB.
//
// Everything here inherits the record files' scope: regular season only, since the first
// season the weekly source covers. `fromSeason` travels with every moment so the copy can
// state that scope.

import {
  RECORD_STATS,
  type RecordGameRow,
  type RecordStat,
  type RecordsFile,
} from '@/lib/stat-files/records';
import { historicWeekCopy, recordChaseCopy } from './copy';
import type { TeamEvent } from './types';

/** A single game is historic when at most this many performances are at or above it. */
export const HISTORIC_WEEK_MAX_PERFORMANCES = 10;

/** A season total is chasing the mark once it is within this share of it. */
export const RECORD_CHASE_MARGIN = 0.1;

interface MomentBase {
  stat: RecordStat;
  playerId: string;
  teamId: string;
  season: number;
  value: number;
  fromSeason: number;
}

export type StatMoment =
  | (MomentBase & { kind: 'historic_week'; week: number; rank: number })
  | (MomentBase & { kind: 'record_chase'; record: number; broken: boolean });

export function findStatMoments(args: {
  currentSeason: number;
  records: ReadonlyMap<RecordStat, RecordsFile>;
  /** The live season's record rows. */
  currentRows: readonly RecordGameRow[];
}): StatMoment[] {
  const { currentSeason, records } = args;
  const rows = args.currentRows.filter((row) => row.season === currentSeason);
  if (rows.length === 0) return [];
  // Only the newest week is news. An older game was reported, or missed, when it was new.
  const latestWeek = rows.reduce((max, row) => Math.max(max, row.week), 0);
  const moments: StatMoment[] = [];

  for (const stat of RECORD_STATS) {
    const file = records.get(stat);
    if (!file) continue;
    const fromSeason = file.coverage.from_season;

    // Ties share a rank, so rank alone would call a line dozens of players share
    // "4th-most". Counting performances at or above the value does not.
    const games = file.single_game.top;
    for (const entry of games) {
      if (entry.season !== currentSeason || entry.week !== latestWeek || !entry.team) continue;
      const atOrAbove = games.filter((other) => other.value >= entry.value).length;
      if (atOrAbove > HISTORIC_WEEK_MAX_PERFORMANCES) continue;
      moments.push({
        kind: 'historic_week',
        stat,
        playerId: entry.player_id,
        teamId: entry.team,
        season: currentSeason,
        week: latestWeek,
        value: entry.value,
        rank: entry.rank,
        fromSeason,
      });
    }

    const earlier = file.single_season.top.filter((entry) => entry.season < currentSeason);
    if (earlier.length === 0) continue;
    const record = earlier.reduce((max, entry) => Math.max(max, entry.value), 0);

    // One total per player and team, matching how a season mark is counted.
    const totals = new Map<string, { playerId: string; teamId: string; value: number }>();
    for (const row of rows) {
      const value = row.stats[stat];
      if (!row.team || value === undefined) continue;
      const key = `${row.player_id}\u0000${row.team}`;
      const total = totals.get(key);
      if (total) total.value += value;
      else totals.set(key, { playerId: row.player_id, teamId: row.team, value });
    }
    for (const total of totals.values()) {
      if (total.value < record * (1 - RECORD_CHASE_MARGIN)) continue;
      moments.push({
        kind: 'record_chase',
        stat,
        playerId: total.playerId,
        teamId: total.teamId,
        season: currentSeason,
        value: total.value,
        record,
        broken: total.value > record,
        fromSeason,
      });
    }
  }
  return moments;
}

export function statMomentEvents(
  moments: readonly StatMoment[],
  args: { playerNames: ReadonlyMap<string, string>; now: string }
): TeamEvent[] {
  const events: TeamEvent[] = [];
  for (const moment of moments) {
    const playerName = args.playerNames.get(moment.playerId);
    if (!playerName) continue;
    const shared = {
      tier: 'big_moments' as const,
      teamId: moment.teamId,
      playerId: moment.playerId,
      source: 'nflverse_stats' as const,
      occurredAt: args.now,
    };
    if (moment.kind === 'historic_week') {
      const copy = historicWeekCopy({ ...moment, playerName });
      events.push({
        ...shared,
        dedupeKey: `historic_week:${moment.stat}:${moment.season}:${moment.week}:${moment.playerId}`,
        type: 'historic_week',
        headline: copy.headline,
        detail: copy.detail,
        payload: {
          stat: moment.stat,
          value: moment.value,
          rank: moment.rank,
          season: moment.season,
          week: moment.week,
          from_season: moment.fromSeason,
          player_name: playerName,
        },
      });
    } else {
      const copy = recordChaseCopy({ ...moment, playerName });
      // One key while approaching and another once broken, so each is reported once per
      // season however many runs see it.
      const phase = moment.broken ? 'broken' : 'approach';
      events.push({
        ...shared,
        dedupeKey: `record_chase:${moment.stat}:${moment.season}:${moment.playerId}:${moment.teamId}:${phase}`,
        type: 'record_chase',
        headline: copy.headline,
        detail: copy.detail,
        payload: {
          stat: moment.stat,
          value: moment.value,
          record: moment.record,
          broken: moment.broken,
          season: moment.season,
          from_season: moment.fromSeason,
          player_name: playerName,
        },
      });
    }
  }
  return events;
}
