// Fetches ESPN rosters/depthcharts, coaches, and multi-season team stats for all 32
// teams, transforms them through the pure lib/espn/transform (+ standings) pipeline,
// and upserts into Postgres (Supabase). Run by hand (or on a schedule -- see
// docs/espn.md). Never part of `next build`.
//
// Usage: npm run ingest:espn
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY in the environment (secret key
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).
//
// Seed mode: `npm run gen:espn-seed` sets SEED_OUT=supabase/seed.sql, which fetches +
// transforms exactly the same way but writes a committed seed script instead of touching
// the DB (no Supabase creds needed). `supabase db reset` then restores the roster data
// offline, so contributors don't have to run the live ingest after every reset.

import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';

dotenv.config({ path: '.env.local' });
import { toCoach, toDepthChartRows, toTeamRoster, type Coach } from '@/lib/espn/transform';
import { buildSeedSql, type SeedEntry } from '@/lib/espn/seed-sql';
import {
  parseStandings,
  parseTeamStats,
  ESPN_TEAM_STATS_SEASONS_MIN,
  type EspnStandings,
} from '@/lib/espn/standings';
import { notifyRevalidate } from '@/lib/utils/ingest/notify-revalidate';
import { currentSeasonOf, nflSeasonState } from '@/lib/utils/team/season-state';
import { TEAMS } from '@/lib/teams/index';
import { parseSeasonsArg } from '@/lib/nflverse/seasons-arg';
import type { EspnDepthcharts, EspnRoster, EspnTeamInfo } from '@/lib/espn/types';
import type { TeamRoster, TeamStats } from '@/lib/types';
import type { Database } from '@/lib/database.types';

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

// A full --seasons backfill can be 20+ standings calls (2002-latest); firing them all
// via one Promise.all hits ESPN's unofficial API with that many near-simultaneous
// requests, risking throttling mid-backfill (2026-08-19-espn-full-history-team-stats-
// design.md). Chunk into small concurrent batches instead -- still fast, far gentler.
const STANDINGS_FETCH_CHUNK_SIZE = 4;
async function fetchStandingsInChunks(seasons: number[]): Promise<EspnStandings[]> {
  const results: EspnStandings[] = [];
  for (let i = 0; i < seasons.length; i += STANDINGS_FETCH_CHUNK_SIZE) {
    const chunk = seasons.slice(i, i + STANDINGS_FETCH_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map((y) => getJson<EspnStandings>(`${STANDINGS}&season=${y}`))
    );
    results.push(...chunkResults);
  }
  return results;
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

async function main() {
  // Seed mode writes a SQL file and never touches the DB, so it needs no Supabase creds.
  const seedOut = process.env.SEED_OUT;
  const supabase: SupabaseClient<Database> | null = seedOut
    ? null
    : createClient(getSupabaseUrl(), getSupabaseSecretKey());

  const startedAt = new Date().toISOString();
  const espnIndex = await espnTeamIndex();
  // Standings fetch for conference/division identity -- see parseStandings. The same
  // response once fed team stats too, but which seasons to fetch is no longer ESPN's
  // call: the canonical definition of "current season" is the calendar
  // (lib/utils/team/season-state.ts -- deployed 2026-08-28 after ESPN's standings.season
  // label mislabeled the 2025 standings during the 2026 rollover and the ingest wrote a
  // playoff seed 0 over the Super Bowl champion Seahawks). Each season is now fetched
  // by an explicit `?season=` URL that we choose.
  const standingsJson = await getJson<EspnStandings>(STANDINGS);
  const divisions = parseStandings(standingsJson);

  // The fetch set (docs/superpowers/specs/2026-07-14-multi-season-team-stats-design.md,
  // extended by 2026-08-19-espn-full-history-team-stats-design.md): the daily job
  // fetches current + last season by calendar; a `--seasons` backfill fetches exactly
  // the requested range. All in small chunks (never one giant Promise.all) and merged
  // into one ESPN-team-id -> TeamStats[] map.
  const seasonsArg = parseSeasonsArg(process.argv.slice(2));
  if (seasonsArg !== null) {
    const outOfRange = seasonsArg.filter((s) => s < ESPN_TEAM_STATS_SEASONS_MIN);
    if (outOfRange.length) {
      throw new Error(
        `--seasons includes years before ${ESPN_TEAM_STATS_SEASONS_MIN} (ESPN's verified floor): ${outOfRange.join(', ')}`
      );
    }
  }
  const currentSeason = currentSeasonOf(nflSeasonState());
  const fetchSeasons = seasonsArg !== null ? seasonsArg : [currentSeason, currentSeason - 1];
  const seasonsJson = await fetchStandingsInChunks(fetchSeasons);
  const teamStatsByEspnId = new Map<string, TeamStats[]>();
  // `expectedSeason` per fetch: refuse any response whose echoed `standings.season`
  // isn't the one we asked for (the rollover window can relabel a placeholder block).
  for (const [index, json] of seasonsJson.entries()) {
    const seasonMap = parseTeamStats(json, fetchSeasons[index]);
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
      coachByTeamId[meta.id] = toCoach(espnRoster);
      statsByTeamId[meta.id] = teamStatsByEspnId.get(info.id) ?? [];

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

  if (status === 'success') {
    await notifyRevalidate(['ingest:espn']);
  }

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

  const { error: brandColorsError } = await supabase.from('brand_colors').upsert(
    {
      team_id: team.id,
      color_primary: team.colors.primary,
      color_secondary: team.colors.secondary,
      color_accent: team.colors.accent,
      ui_accent: team.colors.uiAccent,
      on_accent: team.colors.onAccent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'team_id' }
  );
  if (brandColorsError) throw new Error(`brand_colors upsert: ${brandColorsError.message}`);

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
// (bye-week gap, mid-season expansion) -- skip entirely; whatever rows already exist from
// a prior run are left untouched. A single season missing from `stats` (but others
// present) simply isn't in the array -- same skip, per-row instead of per-team.
//
// DEP-146 re-own (Decisions.md 2026-08-14): this writes ONLY `playoff_seed` now. Every
// W-L column moved to nflverse, computed REG-only from game rows
// (lib/nflverse/records.ts), because ESPN's standings endpoint aggregates whatever season
// type is currently live -- through August it reported *preseason* games as the season
// record (DEP-200). Playoff seed has no nflverse equivalent, so it stays here.
//
// The narrow column list is load-bearing, not tidiness: PostgREST's on-conflict update
// only touches columns present in the payload, so writing the record columns here would
// clobber nflverse's REG-only values on the next ESPN run. `parseTeamStats` still parses
// the full stat block -- harmless, and it keeps the required-field guard that decides
// whether ESPN had a usable entry for this team at all.
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
