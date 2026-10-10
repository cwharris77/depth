/**
 * Writes one synthetic historic-week event through the real stat-event write, to prove
 * that path end to end. Refuses to run against anything but a local stack or the
 * staging project.
 *
 * The event is built from invented record rows in a season no real data uses, for one
 * real player on the chosen team, so its dedupe key can never collide with a real one
 * and `--cleanup` can remove exactly what this script wrote.
 *
 * Usage:
 *   npm run events:replay-fixture -- --team seahawks
 *   npm run events:replay-fixture -- --cleanup
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { writeStatEvents } from '@/lib/events/write-stat-events';
import { buildRecordFiles, type RecordGameRow } from '@/lib/stat-files/records';

// Hosts this script may write to. Production is deliberately absent.
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', 'djwrecczgudktgsooxti.supabase.co']);

// No real season: the weekly source starts in 1999.
const FIXTURE_SEASON = 1900;
const FIXTURE_WEEK = 1;
const KEY_PREFIX = `historic_week:rushing_yards:${FIXTURE_SEASON}:`;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function row(playerId: string, season: number, team: string, yards: number): RecordGameRow {
  return {
    player_id: playerId,
    season,
    week: FIXTURE_WEEK,
    team,
    game_id: `${season}_${FIXTURE_WEEK}_${playerId}`,
    stats: { rushing_yards: yards },
  };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(`refusing to write fixture events to ${host}`);
  }
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

  if (process.argv.includes('--cleanup')) {
    const { data, error } = await supabase
      .from('team_events')
      .delete()
      .like('dedupe_key', `${KEY_PREFIX}%`)
      .select('id');
    if (error) throw new Error(`team_events delete: ${error.message}`);
    console.log(`fixture replay: removed ${data?.length ?? 0} events`);
    return;
  }

  const team = arg('--team') ?? 'seahawks';
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, name')
    .eq('team_id', team)
    .order('id')
    .limit(1)
    .maybeSingle();
  if (playerError) throw new Error(`players read: ${playerError.message}`);
  if (!player) throw new Error(`no players for team ${team}`);

  // Eleven earlier games from 300 down to 200 yards, then one game at 215: exactly ten
  // performances are at or above it, the edge of the historic cutoff. Its season total
  // is well short of the earlier single-season best, so no record chase rides along.
  const earlier = Array.from({ length: 11 }, (_, i) =>
    row(`fixture-old-${i}`, FIXTURE_SEASON - 1, team, 300 - i * 10)
  );
  const current = [row(player.id, FIXTURE_SEASON, team, 215)];
  const rowsBySeason = new Map<number, RecordGameRow[]>([
    [FIXTURE_SEASON - 1, earlier],
    [FIXTURE_SEASON, current],
  ]);

  const written = await writeStatEvents(supabase, {
    built: buildRecordFiles(rowsBySeason, 1),
    rowsBySeason,
    currentSeason: FIXTURE_SEASON,
    now: new Date().toISOString(),
  });
  console.log(`team events: ${written} detected (fixture replay)`);

  const dedupeKey = `${KEY_PREFIX}${FIXTURE_WEEK}:${player.id}`;
  const { data: stored, error: readError } = await supabase
    .from('team_events')
    .select('headline, tier, source, team_id')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();
  if (readError) throw new Error(`team_events read: ${readError.message}`);
  if (!stored) throw new Error(`the event was not stored under ${dedupeKey}`);
  console.log(`stored: ${JSON.stringify(stored)}`);
}

main().catch((error) => {
  console.error(`fixture replay: ${(error as Error).message}`);
  process.exitCode = 1;
});
