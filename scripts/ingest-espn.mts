// Fetches ESPN rosters/depthcharts for all 32 teams, transforms them through the
// pure lib/espn/transform pipeline, and upserts into Postgres (Supabase). Run by
// hand (or later, on a schedule -- see docs/espn.md). Never part of `next build`.
//
// Usage: npm run ingest:espn
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (service role
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
import { toDepthChartRows, toTeamRoster } from '../lib/espn/transform';
import { parseStandings, type EspnStandings } from '../lib/espn/standings';
import { TEAMS } from '../lib/teams/index';
import type { EspnDepthcharts, EspnRoster, EspnTeamInfo } from '../lib/espn/types';
import type { TeamRoster } from '../lib/types';
import type { Database } from '../lib/database.types';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
// Conference/division for every team, in one call — sourced from ESPN, not hand-curated.
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3';

// Our registry uses a couple of abbreviations that differ from ESPN's.
const ABBREV_ALIAS: Record<string, string> = { WAS: 'WSH' };

// ESPN's unofficial API blips intermittently (a team's roster can 404 on one call and
// return 200 the next), which would otherwise skip that team for the whole run. Retry a
// few times with backoff so a single flaky response doesn't drop a team.
async function getJson<T>(url: string, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function espnTeamIndex(): Promise<Map<string, EspnTeamInfo>> {
  const data = await getJson<{ sports: [{ leagues: [{ teams: { team: EspnTeamInfo }[] }] }] }>(
    `${SITE}/teams`
  );
  const map = new Map<string, EspnTeamInfo>();
  for (const { team } of data.sports[0].leagues[0].teams) {
    map.set(team.abbreviation.toUpperCase(), team);
  }
  return map;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient(supabaseUrl, serviceRoleKey);

  const startedAt = new Date().toISOString();
  const espnIndex = await espnTeamIndex();
  const divisions = parseStandings(await getJson<EspnStandings>(STANDINGS));
  const built: Record<string, TeamRoster> = {};
  const errors: { team: string; message: string }[] = [];

  for (const roster of Object.values(TEAMS)) {
    const seed = roster.team;

    const abbrev = ABBREV_ALIAS[seed.abbrev.toUpperCase()] ?? seed.abbrev.toUpperCase();
    const info = espnIndex.get(abbrev);
    if (!info) {
      errors.push({ team: seed.id, message: `no ESPN team for abbrev ${seed.abbrev}` });
      continue;
    }
    // Conference/division come from ESPN's standings (by team id), not the registry.
    const espnDivision = divisions.get(info.id);
    if (!espnDivision) {
      errors.push({ team: seed.id, message: `no ESPN standings entry for id ${info.id}` });
      continue;
    }
    const meta = { ...seed, ...espnDivision };
    try {
      const abbr = info.abbreviation.toLowerCase();
      const espnRoster = await getJson<EspnRoster>(`${SITE}/teams/${abbr}/roster`);
      const season = espnRoster.season.year;
      const depthcharts = await getJson<EspnDepthcharts>(
        `${CORE}/seasons/${season}/teams/${info.id}/depthcharts`
      );
      const roster2 = toTeamRoster({ meta, roster: espnRoster, depthcharts, teamInfo: info });
      if (roster2.players.length < 15) {
        errors.push({
          team: meta.id,
          message: `only ${roster2.players.length} players, skipping`,
        });
        continue;
      }
      built[meta.id] = roster2;
      // eslint-disable-next-line no-console
      console.log(`fetched ${meta.id} (${roster2.players.length} players)`);
    } catch (e) {
      errors.push({ team: meta.id, message: (e as Error).message });
    }
    await new Promise((r) => setTimeout(r, 200)); // be polite to the unofficial API
  }

  let teamsWritten = 0;
  for (const roster of Object.values(built)) {
    try {
      await writeTeam(supabase, roster);
      teamsWritten++;
    } catch (e) {
      errors.push({ team: roster.team.id, message: `write failed: ${(e as Error).message}` });
    }
  }

  const finishedAt = new Date().toISOString();
  const status = errors.length === 0 ? 'success' : teamsWritten > 0 ? 'partial' : 'failure';

  const { error: runError } = await supabase.from('ingestion_runs').insert({
    source: 'espn',
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    teams_written: teamsWritten,
    errors: errors.length ? errors : null,
  });
  if (runError) throw new Error(`failed to record ingestion_runs: ${runError.message}`);

  console.log(`\nWrote ${teamsWritten} teams. Status: ${status}`);
  if (errors.length) {
    console.log(`Errors/skips:`);
    for (const e of errors) console.log(`  ${e.team}: ${e.message}`);
  }
  if (status === 'failure') process.exit(1);
  // In scheduled runs (STRICT set) a partial run is a half-stale DB, so fail loud
  // enough to turn the workflow red. Hand-runs stay lenient and exit 0 on partial.
  if (status === 'partial' && process.env.STRICT) {
    console.error('STRICT: partial run treated as failure (some teams did not write)');
    process.exit(1);
  }
}

async function writeTeam(supabase: SupabaseClient<Database>, roster: TeamRoster): Promise<void> {
  const { team, players, specialTeams } = roster;

  const { error: teamError } = await supabase.from('teams').upsert(
    {
      id: team.id,
      espn_id: null,
      abbrev: team.abbrev,
      city: team.city,
      name: team.name,
      conference: team.conference,
      division: team.division,
      color_primary: team.colors.primary,
      color_secondary: team.colors.secondary,
      color_accent: team.colors.accent,
      ui_accent: team.colors.uiAccent,
      on_accent: team.colors.onAccent,
      logo_url: team.logo ?? null,
      logo_dark_url: team.logoDark ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (teamError) throw new Error(`teams upsert: ${teamError.message}`);

  const { error: playersError } = await supabase.from('players').upsert(
    players.map((p) => ({
      id: p.id,
      team_id: team.id,
      name: p.name,
      number: p.number,
      position: p.position,
      status: p.status,
      age: p.age,
      college: p.college,
      experience: p.experience,
      height: p.height,
      weight: p.weight,
      bio: p.bio,
      photo_url: p.photoUrl ?? null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' }
  );
  if (playersError) throw new Error(`players upsert: ${playersError.message}`);

  // depth_chart_entries: one row per (team, position, depthRank). Clear this
  // team's existing entries first so a player who lost their slot doesn't linger.
  const { error: deleteDepthError } = await supabase
    .from('depth_chart_entries')
    .delete()
    .eq('team_id', team.id);
  if (deleteDepthError) throw new Error(`depth_chart_entries delete: ${deleteDepthError.message}`);

  const depthRows = toDepthChartRows(players).map((row) => ({
    team_id: team.id,
    position: row.position,
    depth_rank: row.depthRank,
    player_id: row.playerId,
    updated_at: new Date().toISOString(),
  }));
  if (depthRows.length) {
    const { error: depthError } = await supabase
      .from('depth_chart_entries')
      .upsert(depthRows, { onConflict: 'team_id,position,depth_rank' });
    if (depthError) throw new Error(`depth_chart_entries upsert: ${depthError.message}`);
  }

  const { error: stError } = await supabase.from('special_teams_slots').upsert(
    specialTeams.map((s) => ({
      id: `${team.id}-${s.id}`,
      team_id: team.id,
      label: s.label,
      player_id: s.playerId,
      x: s.x,
      y: s.y,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' }
  );
  if (stError) throw new Error(`special_teams_slots upsert: ${stError.message}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
