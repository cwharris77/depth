// Record chases and historic games from a finished record build, written to
// `team_events`. Shared by the stat-files build and the fixture replay so both exercise
// the same read, the same detector and the same upsert.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { RecordGameRow, RecordOutputs } from '@/lib/stat-files/records';
import { findStatMoments, statMomentEvents } from './stat-events';
import { goodWeekEvents, GOOD_WEEK_THRESHOLDS } from './good-weeks';
import { RECORD_STATS } from '@/lib/stat-files/records';
import { toTeamEventRow } from './types';

export async function writeStatEvents(
  supabase: SupabaseClient<Database>,
  args: {
    built: RecordOutputs;
    rowsBySeason: ReadonlyMap<number, readonly RecordGameRow[]>;
    currentSeason: number;
    now: string;
    dedupeKeySuffix?: string;
  }
): Promise<number> {
  const moments = findStatMoments({
    currentSeason: args.currentSeason,
    records: args.built.records,
    currentRows: args.rowsBySeason.get(args.currentSeason) ?? [],
  });
  const currentRows = args.rowsBySeason.get(args.currentSeason) ?? [];
  const latestWeek = currentRows
    .filter(
      (row) => row.season === args.currentSeason && Number.isSafeInteger(row.week) && row.week > 0
    )
    .reduce((max, row) => Math.max(max, row.week), 0);
  // A missing comparator cannot prove that a qualifying game is non-historic.
  const goodRows = currentRows.filter(
    (row) =>
      row.season === args.currentSeason &&
      row.week === latestWeek &&
      RECORD_STATS.every((stat) => {
        const value = row.stats[stat];
        return (
          value === undefined ||
          !Number.isFinite(value) ||
          value < GOOD_WEEK_THRESHOLDS[stat] ||
          args.built.records.has(stat)
        );
      })
  );
  const goodCandidates = goodRows.filter(
    (row) =>
      row.season === args.currentSeason &&
      row.week === latestWeek &&
      row.team &&
      RECORD_STATS.some(
        (stat) =>
          Number.isFinite(row.stats[stat]) && (row.stats[stat] ?? 0) >= GOOD_WEEK_THRESHOLDS[stat]
      )
  );
  for (const row of goodRows) {
    if (
      !row.team &&
      RECORD_STATS.some(
        (stat) =>
          Number.isFinite(row.stats[stat]) && (row.stats[stat] ?? 0) >= GOOD_WEEK_THRESHOLDS[stat]
      )
    )
      console.warn(`team events: missing source team: ${row.player_id}/${row.season}/${row.week}`);
  }
  const ids = [
    ...new Set([
      ...moments.map((moment) => moment.playerId),
      ...goodCandidates.map((row) => row.player_id),
    ]),
  ];
  if (ids.length === 0) return 0;
  const { data, error: namesError } = await supabase
    .from('players')
    .select('id, name')
    .in('id', ids);
  if (namesError) throw new Error(`players read: ${namesError.message}`);

  const playerNames = new Map((data ?? []).map((player) => [player.id, player.name]));
  const missing = ids.filter((id) => !playerNames.has(id));
  if (missing.length) console.warn(`team events: missing player names: ${missing.join(', ')}`);
  const events = [
    ...statMomentEvents(moments, { playerNames, now: args.now }),
    ...goodWeekEvents({
      currentSeason: args.currentSeason,
      currentRows: goodRows,
      historicMoments: moments,
      playerNames,
      now: args.now,
    }),
  ];
  if (events.length === 0) return 0;
  const rows = events.map((event) => ({
    ...toTeamEventRow(event),
    dedupe_key: `${event.dedupeKey}${args.dedupeKeySuffix ?? ''}`,
  }));
  const { error } = await supabase
    .from('team_events')
    .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
  if (error) throw new Error(`team_events upsert: ${error.message}`);
  return events.length;
}
