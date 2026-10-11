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
 *   npm run events:replay-fixture -- --team seahawks --fixture-id run-123
 *   npm run events:replay-fixture -- --cleanup --fixture-id run-123
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appendFileSync } from 'node:fs';
import { writeTeamEvents } from '@/lib/events/write-team-events';
import type { TeamObservation } from '@/lib/events/types';
import {
  assertFixtureHost,
  fixtureEventKeys,
  EVERYTHING_FIXTURE_TEAM,
} from '@/lib/events/fixture-replay';
import type { Database } from '@/lib/database.types';
import { writeStatEvents } from '@/lib/events/write-stat-events';
import { buildRecordFiles, type RecordGameRow } from '@/lib/stat-files/records';

// No real season: the weekly source starts in 1999.
const FIXTURE_SEASON = 1900;
const FIXTURE_WEEK = 1;
const FIXTURE_ID = /^[a-z0-9-]+$/;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fixtureId(): string {
  const value = arg('--fixture-id');
  if (!value || !FIXTURE_ID.test(value)) {
    throw new Error('--fixture-id must contain lowercase letters, digits, and hyphens');
  }
  return value;
}

function fixtureKeySuffix(id: string): string {
  return `:${id}`;
}

function writeOutput(name: string, value: string): void {
  const output = arg('--github-output');
  if (output) appendFileSync(output, `${name}=${value}\n`);
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

async function assertFixtureTeam(
  supabase: SupabaseClient<Database>,
  fixtureTeam: string
): Promise<void> {
  const { data, error } = await supabase
    .from('teams')
    .select('city, name, abbrev, espn_id')
    .eq('id', fixtureTeam)
    .maybeSingle();
  if (error) throw new Error(`fixture team read: ${error.message}`);
  if (
    data &&
    (data.city !== 'Fixture' ||
      data.name !== 'Everything replay' ||
      data.abbrev !== 'EFX' ||
      data.espn_id !== null)
  )
    throw new Error('fixture team identity is not owned by this replay');
}
async function replaySnapshots(
  supabase: SupabaseClient<Database>,
  fixtureTeam: string
): Promise<void> {
  await assertFixtureTeam(supabase, fixtureTeam);
  const { error } = await supabase.from('teams').upsert({
    id: fixtureTeam,
    city: 'Fixture',
    name: 'Everything replay',
    abbrev: 'EFX',
    espn_id: null,
    conference: 'NFC',
    division: 'West',
  });
  if (error) throw new Error(`fixture team write: ${error.message}`);
  const a = {
    position: 'WR',
    depthRank: 1,
    playerId: 'fixture-snapshot-a',
    playerName: 'Fixture Starter',
  };
  const b = {
    position: 'WR',
    depthRank: 2,
    playerId: 'fixture-snapshot-b',
    playerName: 'Fixture Replay Receiver',
  };
  const c = {
    position: 'WR',
    depthRank: 3,
    playerId: 'fixture-snapshot-c',
    playerName: 'Fixture Backup',
  };
  const observation: TeamObservation = {
    teamId: fixtureTeam,
    teamName: 'Everything replay',
    observedAt: '1900-01-01T15:00:00Z',
    slots: [a, b, c],
    coveredPositions: ['WR'],
    injuries: [
      { playerId: a.playerId, playerName: a.playerName, designations: ['Questionable'] },
      { playerId: b.playerId, playerName: b.playerName, designations: [] },
    ],
  };
  const args = {
    observations: [observation],
    transactions: [],
    teamIdByEspnId: new Map([['fixture', fixtureTeam]]),
    teams: [{ id: fixtureTeam, city: 'Fixture', name: 'Everything replay' }],
    now: observation.observedAt,
  };
  await writeTeamEvents(supabase, args);
  const changed = {
    ...observation,
    observedAt: '1900-01-02T15:00:00Z',
    slots: [a, { ...c, depthRank: 2 }, { ...b, depthRank: 3 }],
    injuries: observation.injuries.map((i) => ({
      ...i,
      designations: i.playerId === a.playerId ? ['Out'] : i.designations,
    })),
  };
  await writeTeamEvents(supabase, { ...args, observations: [changed], now: changed.observedAt });
  const confirmed = { ...changed, observedAt: '1900-01-03T15:00:00Z' };
  await writeTeamEvents(supabase, {
    ...args,
    observations: [confirmed],
    now: confirmed.observedAt,
    transactions: [
      {
        date: '1900-01-03T07:00:00Z',
        team: { id: 'fixture' },
        description:
          'Signed WR Fixture Replay Receiver to the practice squad. Waived WR Fixture Replay Receiver from the practice squad.',
      },
    ],
  });
  const { data: events, error: eventsError } = await supabase
    .from('team_events')
    .select('id, event_type, tier, source, headline, dedupe_key')
    .eq('team_id', fixtureTeam)
    .order('dedupe_key');
  if (eventsError) throw new Error(`snapshot fixture read: ${eventsError.message}`);
  const expected = ['cut', 'depth_change', 'depth_change', 'injury_change', 'signing'];
  if (JSON.stringify((events ?? []).map((e) => e.event_type).sort()) !== JSON.stringify(expected))
    throw new Error('snapshot replay did not store exactly the expected event families');
  console.log(`snapshot fixture stored: ${JSON.stringify(events)}`);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  assertFixtureHost(url);
  const kind = arg('--kind') ?? 'historic';
  if (kind !== 'historic' && kind !== 'everything')
    throw new Error('kind must be historic or everything');
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const id = fixtureId();
  const keySuffix = fixtureKeySuffix(id);
  const fixtureTeam = `${EVERYTHING_FIXTURE_TEAM}-${id}`;

  if (process.argv.includes('--cleanup')) {
    const { data, error } = await supabase
      .from('team_events')
      .delete()
      .like('dedupe_key', `%${keySuffix}`)
      .select('id');
    if (error) throw new Error(`team_events delete: ${error.message}`);
    await assertFixtureTeam(supabase, fixtureTeam);
    const removed = await supabase.from('teams').delete().eq('id', fixtureTeam);
    if (removed.error) throw new Error(`snapshot fixture cleanup: ${removed.error.message}`);
    console.log(
      `fixture replay: removed ${data?.length ?? 0} stat events and the owned snapshot fixture team`
    );
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
  const current = [row(player.id, FIXTURE_SEASON, team, kind === 'everything' ? 100 : 215)];
  const rowsBySeason = new Map<number, RecordGameRow[]>([
    [FIXTURE_SEASON - 1, earlier],
    [FIXTURE_SEASON, current],
  ]);

  const written = await writeStatEvents(supabase, {
    built: buildRecordFiles(rowsBySeason, 1),
    rowsBySeason,
    currentSeason: FIXTURE_SEASON,
    now: new Date().toISOString(),
    dedupeKeySuffix: keySuffix,
  });
  console.log(`team events: ${written} detected (fixture replay)`);

  const keys = fixtureEventKeys(team, player.id);
  const dedupeKey = `${kind === 'everything' ? keys.good : keys.historic}${keySuffix}`;
  const { data: stored, error: readError } = await supabase
    .from('team_events')
    .select('id, event_type, headline, tier, source, team_id')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();
  if (readError) throw new Error(`team_events read: ${readError.message}`);
  if (!stored) throw new Error(`the event was not stored under ${dedupeKey}`);
  writeOutput('fixture_event_id', stored.id);
  console.log(`stored: ${JSON.stringify(stored)}`);
  if (kind === 'everything') await replaySnapshots(supabase, fixtureTeam);
}

main().catch((error) => {
  console.error(`fixture replay: ${(error as Error).message}`);
  process.exitCode = 1;
});
