// Fetches ESPN rosters/depthcharts for all 32 teams, transforms them through the
// pure lib/espn/transform pipeline, and upserts into Postgres (Supabase). Run by
// hand (or later, on a schedule -- see docs/espn.md). Never part of `next build`.
//
// Usage: npm run ingest:espn
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (service role
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).
//
// Seed mode: `npm run gen:espn-seed` sets SEED_OUT=supabase/seed.sql, which fetches +
// transforms exactly the same way but writes a committed seed script instead of touching
// the DB (no Supabase creds needed). `supabase db reset` then restores the roster data
// offline, so contributors don't have to run the live ingest after every reset.

import dotenv from 'dotenv';
import { appendFileSync, writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
import { toCoach, toDepthChartRows, toTeamRoster, type Coach } from '../lib/espn/transform';
import { buildSeedSql, type SeedEntry } from '../lib/espn/seed-sql';
import { parseStandings, parseTeamStats, type EspnStandings } from '../lib/espn/standings';
import { reconcileHomeUniforms } from '../lib/uniforms/reconcile-db';
import { TEAMS } from '../lib/teams/index';
import type { EspnDepthcharts, EspnRoster, EspnTeamInfo } from '../lib/espn/types';
import type { TeamRoster, TeamStats } from '../lib/types';
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

// ISO week number. The home-drift guard keys "distinct pull" on season+week, so a manual
// re-run in the same week reuses the same runId and can't count as a second confirmation.
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diffDays = (date.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diffDays - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

async function main() {
  // Seed mode writes a SQL file and never touches the DB, so it needs no Supabase creds.
  const seedOut = process.env.SEED_OUT;
  const supabase: SupabaseClient<Database> | null = seedOut
    ? null
    : createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));

  const startedAt = new Date().toISOString();
  const espnIndex = await espnTeamIndex();
  const standingsJson = await getJson<EspnStandings>(STANDINGS);
  const divisions = parseStandings(standingsJson);

  // Multi-season team stats (docs/superpowers/specs/2026-07-14-multi-season-team-stats-
  // design.md): the unparameterized fetch's own entries tell us the latest season `Y`
  // (embedded per-division, not the top-level document field -- see standings.ts), then
  // two more explicit `?season=` fetches cover the prior two years. All three merge into
  // one ESPN-team-id -> TeamStats[] map.
  const currentSeasonStats = parseTeamStats(standingsJson);
  const latestSeason = [...currentSeasonStats.values()][0]?.season ?? null;
  const priorSeasonsJson =
    latestSeason === null
      ? []
      : await Promise.all(
          [latestSeason - 1, latestSeason - 2].map((y) =>
            getJson<EspnStandings>(`${STANDINGS}&season=${y}`)
          )
        );
  const teamStatsByEspnId = new Map<string, TeamStats[]>();
  for (const seasonMap of [currentSeasonStats, ...priorSeasonsJson.map(parseTeamStats)]) {
    for (const [id, stats] of seasonMap) {
      const existing = teamStatsByEspnId.get(id) ?? [];
      existing.push(stats);
      teamStatsByEspnId.set(id, existing);
    }
  }

  const built: Record<string, TeamRoster> = {};
  const coachByTeamId: Record<string, Coach | null> = {};
  const statsByTeamId: Record<string, TeamStats[]> = {};
  const errors: { team: string; message: string }[] = [];
  let seasonYear: number | null = null;

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
      seasonYear = season;
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
      coachByTeamId[meta.id] = toCoach(espnRoster);
      statsByTeamId[meta.id] = teamStatsByEspnId.get(info.id) ?? [];
      // eslint-disable-next-line no-console
      console.log(`fetched ${meta.id} (${roster2.players.length} players)`);
    } catch (e) {
      errors.push({ team: meta.id, message: (e as Error).message });
    }
    await new Promise((r) => setTimeout(r, 200)); // be polite to the unofficial API
  }

  // Seed mode: dump the freshly-built rosters to SQL and stop — no DB writes, no
  // reconcile, no ingestion_runs row. Same fetch/transform as the live path above.
  if (seedOut) {
    const entries: SeedEntry[] = Object.values(built).map((roster) => ({
      roster,
      coach: coachByTeamId[roster.team.id] ?? null,
      stats: statsByTeamId[roster.team.id] ?? [],
    }));
    writeFileSync(seedOut, buildSeedSql(entries));
    console.log(`\nWrote seed for ${Object.keys(built).length} teams -> ${seedOut}`);
    if (errors.length) {
      console.log('Skips:');
      for (const e of errors) console.log(`  ${e.team}: ${e.message}`);
    }
    return;
  }
  if (!supabase) return; // unreachable (seedOut handled above); narrows the type below

  let teamsWritten = 0;
  for (const roster of Object.values(built)) {
    try {
      await writeTeam(supabase, roster, coachByTeamId[roster.team.id] ?? null);
      await writeTeamStats(supabase, roster.team.id, statsByTeamId[roster.team.id]);
      teamsWritten++;
    } catch (e) {
      errors.push({ team: roster.team.id, message: `write failed: ${(e as Error).message}` });
    }
  }

  // Home-drift reconcile: ESPN just wrote teams.colors; pin/retire home rows on a stable
  // change. Non-fatal — a reconcile failure must not fail the roster ingest.
  if (seasonYear !== null && teamsWritten > 0) {
    const runId = `${seasonYear}-W${isoWeek(new Date())}`;
    try {
      const s = await reconcileHomeUniforms(supabase, { seasonYear, runId });
      console.log(
        `\nHome reconcile (${runId}): ${s.promoted.length} promoted, ${s.staged.length} staged, ` +
          `${s.cleared.length} cleared, ${s.held.length} held, ${s.bootstrapped.length} bootstrapped.`
      );
      for (const a of s.alerts) console.log(`  ALERT: ${a}`);
      if (s.alerts.length && process.env.UNIFORM_ALERT_FILE) {
        const stamp = new Date().toISOString();
        appendFileSync(
          process.env.UNIFORM_ALERT_FILE,
          s.alerts.map((a) => `- ${stamp} ${a}`).join('\n') + '\n'
        );
      }
    } catch (e) {
      console.error(`home reconcile failed (non-fatal): ${(e as Error).message}`);
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

async function writeTeam(
  supabase: SupabaseClient<Database>,
  roster: TeamRoster,
  coach: Coach | null
): Promise<void> {
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
      coach_name: coach?.name ?? null,
      coach_espn_id: coach?.espnId ?? null,
      coach_experience: coach?.experience ?? null,
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

// team_stats is one row per (team, season) -- multi-season stats page,
// docs/superpowers/specs/2026-07-14-multi-season-team-stats-design.md. An empty array
// means this team had no complete entry for any of the three fetched seasons this run
// (bye-week gap, mid-season expansion) -- skip entirely rather than write a partial row;
// whatever rows already exist from a prior run are left untouched. A single season
// missing from `stats` (but others present) simply isn't in the array -- same partial
// skip, now per-row instead of per-team.
async function writeTeamStats(
  supabase: SupabaseClient<Database>,
  teamId: string,
  stats: TeamStats[]
): Promise<void> {
  if (stats.length === 0) return;
  const { error } = await supabase.from('team_stats').upsert(
    stats.map((s) => ({
      team_id: teamId,
      season: s.season,
      overall_wins: s.overallWins,
      overall_losses: s.overallLosses,
      overall_ties: s.overallTies,
      win_percent: s.winPercent,
      home_wins: s.homeWins,
      home_losses: s.homeLosses,
      road_wins: s.roadWins,
      road_losses: s.roadLosses,
      division_wins: s.divisionWins,
      division_losses: s.divisionLosses,
      conference_wins: s.conferenceWins,
      conference_losses: s.conferenceLosses,
      points_for: s.pointsFor,
      points_against: s.pointsAgainst,
      point_differential: s.pointDifferential,
      streak: s.streak,
      playoff_seed: s.playoffSeed,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'team_id,season' }
  );
  if (error) throw new Error(`team_stats upsert: ${error.message}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
