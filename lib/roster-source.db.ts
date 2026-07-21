import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { RosterSource, TeamMeta, TeamStatsPage, UniformListing } from './roster-source';
import { type LeaderEntry, rosterLeaders } from './roster-leaders';
import { resolveSchedule } from './schedule';
import { nflSeasonState } from './nfl-season';
import { type PlayerHit, positionGroupPositions, rankByNameMatch } from './search';
import type {
  Game,
  Player,
  PlayerSeasonStats,
  RosterLeaders,
  PlayerStatus,
  Position,
  SpecialSlot,
  Team,
  TeamColors,
  TeamRoster,
  TeamSchedule,
  TeamScheduleGame,
  TeamStats,
  Uniform,
  UniformKind,
} from './types';

// Postgres-backed RosterSource (roadmap: ESPN ingestion -> DB -> app). Reads
// teams/players/depth_chart_entries/special_teams_slots and assembles the same
// TeamRoster shape the app already renders.

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars (see .env.local.example)');
  }
  return createClient<Database>(url, key);
}

type Tables = Database['public']['Tables'];
const TEAM_SELECT =
  'id, abbrev, city, name, conference, division, color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url';

type TeamRow = Pick<
  Tables['teams']['Row'],
  | 'id'
  | 'abbrev'
  | 'city'
  | 'name'
  | 'conference'
  | 'division'
  | 'color_primary'
  | 'color_secondary'
  | 'color_accent'
  | 'ui_accent'
  | 'on_accent'
  | 'logo_url'
  | 'logo_dark_url'
>;
type PlayerRow = Pick<
  Tables['players']['Row'],
  | 'id'
  | 'team_id'
  | 'name'
  | 'number'
  | 'position'
  | 'status'
  | 'age'
  | 'college'
  | 'experience'
  | 'height'
  | 'weight'
  | 'bio'
  | 'photo_url'
>;
type DepthChartRow = Pick<
  Tables['depth_chart_entries']['Row'],
  'team_id' | 'position' | 'depth_rank' | 'player_id'
>;
type SpecialSlotRow = Pick<
  Tables['special_teams_slots']['Row'],
  'team_id' | 'label' | 'player_id' | 'x' | 'y'
>;
type UniformRow = Pick<
  Tables['uniforms']['Row'],
  | 'id'
  | 'team_id'
  | 'kind'
  | 'name'
  | 'year_start'
  | 'year_end'
  | 'is_current'
  | 'color_primary'
  | 'color_secondary'
  | 'color_accent'
  | 'ui_accent'
  | 'on_accent'
  | 'image_path'
>;
const UNIFORM_SELECT =
  'id, team_id, kind, name, year_start, year_end, is_current, color_primary, color_secondary, color_accent, ui_accent, on_accent, image_path';

type TeamStatsRow = Pick<
  Tables['team_stats']['Row'],
  | 'season'
  | 'overall_wins'
  | 'overall_losses'
  | 'overall_ties'
  | 'win_percent'
  | 'home_wins'
  | 'home_losses'
  | 'road_wins'
  | 'road_losses'
  | 'division_wins'
  | 'division_losses'
  | 'conference_wins'
  | 'conference_losses'
  | 'points_for'
  | 'points_against'
  | 'point_differential'
  | 'streak'
  | 'playoff_seed'
>;
const TEAM_STATS_SELECT =
  'season, overall_wins, overall_losses, overall_ties, win_percent, home_wins, home_losses, road_wins, road_losses, division_wins, division_losses, conference_wins, conference_losses, points_for, points_against, point_differential, streak, playoff_seed';

type TeamCoachSeasonRow = Pick<
  Tables['team_coach_seasons']['Row'],
  'season' | 'coach_name' | 'coach_experience'
>;
const TEAM_COACH_SEASONS_SELECT = 'season, coach_name, coach_experience';

// A present team_stats row always came from a complete parseTeamStats result (invariant
// 6 — writeTeamStats skips the upsert on a partial entry), so every column should be
// non-null in practice; the `?? 0`/`?? ''` fallbacks only guard the nullable-by-schema
// type, not a real expected case. `coachBySeason` is a separate hand-curated table
// (docs/superpowers/specs/2026-07-14-season-scoped-head-coach-design.md) — a season with
// no curated row (not yet backfilled) simply has no coach, same "degrade, don't fake"
// rule as every other optional field here.
function toTeamStats(row: TeamStatsRow, coachBySeason: Map<number, TeamCoachSeasonRow>): TeamStats {
  const coachRow = coachBySeason.get(row.season);
  return {
    season: row.season,
    coach: coachRow
      ? { name: coachRow.coach_name, experience: coachRow.coach_experience }
      : undefined,
    overallWins: row.overall_wins ?? 0,
    overallLosses: row.overall_losses ?? 0,
    overallTies: row.overall_ties ?? 0,
    winPercent: row.win_percent ?? 0,
    homeWins: row.home_wins ?? 0,
    homeLosses: row.home_losses ?? 0,
    roadWins: row.road_wins ?? 0,
    roadLosses: row.road_losses ?? 0,
    divisionWins: row.division_wins ?? 0,
    divisionLosses: row.division_losses ?? 0,
    conferenceWins: row.conference_wins ?? 0,
    conferenceLosses: row.conference_losses ?? 0,
    pointsFor: row.points_for ?? 0,
    pointsAgainst: row.points_against ?? 0,
    pointDifferential: row.point_differential ?? 0,
    streak: row.streak ?? '',
    playoffSeed: row.playoff_seed ?? 0,
  };
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    city: row.city,
    name: row.name,
    abbrev: row.abbrev,
    conference: row.conference as Team['conference'],
    division: row.division as Team['division'],
    colors: {
      primary: row.color_primary ?? '#333333',
      secondary: row.color_secondary ?? '#666666',
      accent: row.color_accent ?? row.color_secondary ?? '#666666',
      uiAccent: row.ui_accent ?? '#4CC3FF',
      onAccent: row.on_accent ?? '#0a0e1a',
    },
    logo: row.logo_url ?? undefined,
    logoDark: row.logo_dark_url ?? undefined,
  };
}

function toPlayer(row: PlayerRow, depthRank: 1 | 2 | 3): Player {
  return {
    id: row.id,
    name: row.name,
    number: row.number ?? 0,
    position: row.position as Position,
    depthRank,
    status: (row.status ?? 'backup') as PlayerStatus,
    age: row.age ?? 0,
    college: row.college ?? '—',
    experience: row.experience ?? 0,
    height: row.height ?? '—',
    weight: row.weight ?? 0,
    bio: row.bio ?? '',
    photoUrl: row.photo_url ?? undefined,
  };
}

function uniformColors(row: UniformRow): TeamColors {
  return {
    primary: row.color_primary,
    secondary: row.color_secondary,
    accent: row.color_accent,
    uiAccent: row.ui_accent,
    onAccent: row.on_accent,
  };
}

function toUniform(row: UniformRow): Uniform {
  return {
    id: row.id,
    teamId: row.team_id,
    kind: row.kind as UniformKind,
    name: row.name,
    yearStart: row.year_start,
    yearEnd: row.year_end,
    isCurrent: row.is_current,
    colors: uniformColors(row),
    imagePath: row.image_path ?? undefined,
  };
}

// The current home row is the source of truth for a team's default look (PR-B pins it, and
// teams.colors can lag it by a pull or diverge during a hold). Overlay it onto team.colors
// so the OG image, team grid, and field all agree.
function withHomeColors(team: Team, rows: UniformRow[]): Team {
  const home = rows.find((u) => u.kind === 'home' && u.is_current);
  return home ? { ...team, colors: uniformColors(home) } : team;
}

// Order a team's kits for the selector: the current home first, then the other active kits
// (away/color-rush/active throwbacks) by name, then retired kits newest-first (year_end
// desc), with id as a stable tie-break so multiple retired homes never reorder run to run.
// Exported for unit tests (the ordering is the read layer's one piece of real logic).
export function orderUniforms(rows: UniformRow[]): Uniform[] {
  const uniforms = rows.map(toUniform);
  return uniforms.sort((a, b) => {
    const aHome = a.kind === 'home' && a.isCurrent;
    const bHome = b.kind === 'home' && b.isCurrent;
    if (aHome !== bHome) return aHome ? -1 : 1;
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.isCurrent) return a.name.localeCompare(b.name);
    const byYear = (b.yearEnd ?? Infinity) - (a.yearEnd ?? Infinity);
    return byYear !== 0 ? byYear : a.id.localeCompare(b.id);
  });
}

async function fetchTeamRoster(teamId: string): Promise<TeamRoster | undefined> {
  const client = supabase();

  // All four reads key off teamId, so fire them together — the teams row is not a
  // prerequisite for the others (an unknown id just yields empty batches, handled below).
  // Avoids the extra build-time round-trip the old sequential teams-then-batch shape cost.
  const [
    { data: teamRow, error: teamError },
    { data: depthRows, error: depthError },
    { data: stRows, error: stError },
    { data: uniformRows, error: uniformError },
  ] = await Promise.all([
    client.from('teams').select(TEAM_SELECT).eq('id', teamId).maybeSingle<TeamRow>(),
    client
      .from('depth_chart_entries')
      .select('team_id, position, depth_rank, player_id')
      .eq('team_id', teamId)
      .returns<DepthChartRow[]>(),
    client
      .from('special_teams_slots')
      .select('team_id, label, player_id, x, y')
      .eq('team_id', teamId)
      .returns<SpecialSlotRow[]>(),
    client.from('uniforms').select(UNIFORM_SELECT).eq('team_id', teamId).returns<UniformRow[]>(),
  ]);
  if (teamError) throw new Error(`teams query failed: ${teamError.message}`);
  if (depthError) throw new Error(`depth_chart_entries query failed: ${depthError.message}`);
  if (stError) throw new Error(`special_teams_slots query failed: ${stError.message}`);
  if (uniformError) throw new Error(`uniforms query failed: ${uniformError.message}`);
  if (!teamRow) return undefined;

  // Special-teams player ids can reference a player who has no depth_chart_entries
  // row -- e.g. a returner who's a low-rank WR outside the top-3-per-position cap
  // (see lib/espn/transform.ts's toTeamRoster fallback). Pull those in too, or
  // specialTeams would point at a playerId absent from the assembled `players`.
  const stPlayerIds = (stRows ?? []).map((r) => r.player_id).filter((id): id is string => !!id);
  const playerIds = Array.from(
    new Set([...(depthRows ?? []).map((r) => r.player_id), ...stPlayerIds])
  );
  let playerRows: PlayerRow[] = [];
  if (playerIds.length) {
    const { data, error } = await client
      .from('players')
      .select(
        'id, team_id, name, number, position, status, age, college, experience, height, weight, bio, photo_url'
      )
      .in('id', playerIds)
      .returns<PlayerRow[]>();
    if (error) throw new Error(`players query failed: ${error.message}`);
    playerRows = data ?? [];
  }
  const playersById = new Map(playerRows.map((p) => [p.id, p]));

  const players: Player[] = [];
  const addedPlayerIds = new Set<string>();
  for (const row of depthRows ?? []) {
    const playerRow = playersById.get(row.player_id);
    if (!playerRow) continue; // dangling reference → skip, never crash
    const rank = row.depth_rank as 1 | 2 | 3;
    players.push(toPlayer(playerRow, rank));
    addedPlayerIds.add(row.player_id);
  }
  // Special-teams-only players (no depth_chart_entries row): included at a nominal
  // depthRank of 3 (bench/reserve placeholder), matching the ingestion-side transform.
  for (const id of stPlayerIds) {
    if (addedPlayerIds.has(id)) continue;
    const playerRow = playersById.get(id);
    if (!playerRow) continue;
    players.push(toPlayer(playerRow, 3));
    addedPlayerIds.add(id);
  }

  const specialTeams: SpecialSlot[] = (stRows ?? []).map((row, i) => ({
    id: `${row.team_id}-st-${i}`,
    playerId: row.player_id,
    x: row.x === null ? 50 : Number(row.x),
    y: row.y === null ? 50 : Number(row.y),
    label: row.label,
  }));

  const rows = uniformRows ?? [];
  const team = withHomeColors(toTeam(teamRow), rows);
  return {
    team,
    players,
    specialTeams,
    uniforms: orderUniforms(rows),
  };
}

type TeamStatsPageTeamRow = TeamRow & {
  coach_name: string | null;
  coach_experience: number | null;
};
const TEAM_STATS_PAGE_TEAM_SELECT = `${TEAM_SELECT}, coach_name, coach_experience`;

async function fetchTeamStatsPage(teamId: string): Promise<TeamStatsPage | undefined> {
  const client = supabase();

  const [
    { data: teamRow, error: teamError },
    { data: statsRows, error: statsError },
    { data: coachRows, error: coachError },
  ] = await Promise.all([
    client
      .from('teams')
      .select(TEAM_STATS_PAGE_TEAM_SELECT)
      .eq('id', teamId)
      .maybeSingle<TeamStatsPageTeamRow>(),
    client
      .from('team_stats')
      .select(TEAM_STATS_SELECT)
      .eq('team_id', teamId)
      .order('season', { ascending: false })
      .returns<TeamStatsRow[]>(),
    client
      .from('team_coach_seasons')
      .select(TEAM_COACH_SEASONS_SELECT)
      .eq('team_id', teamId)
      .returns<TeamCoachSeasonRow[]>(),
  ]);
  if (teamError) throw new Error(`teams query failed: ${teamError.message}`);
  if (statsError) throw new Error(`team_stats query failed: ${statsError.message}`);
  if (coachError) throw new Error(`team_coach_seasons query failed: ${coachError.message}`);
  if (!teamRow) return undefined;

  const { upcomingSeason, isOffseason } = nflSeasonState();
  const coachBySeason = new Map((coachRows ?? []).map((row) => [row.season, row]));
  return {
    team: toTeam(teamRow),
    // `coach_experience === 0` is ESPN's live signal for "hired, but hasn't coached a
    // season for this team yet" — see TeamStatsPage.incomingCoach doc comment.
    incomingCoach:
      teamRow.coach_name && teamRow.coach_experience === 0
        ? { name: teamRow.coach_name }
        : undefined,
    // Show an upcoming-season chip for every team during the off-season, not just
    // new-coach teams (Stats & Analytics P2).
    upcomingSeason: isOffseason ? upcomingSeason : undefined,
    seasons: (statsRows ?? []).map((row) => toTeamStats(row, coachBySeason)),
  };
}

type PlayerSearchRow = Pick<
  Tables['players']['Row'],
  'id' | 'name' | 'number' | 'position' | 'photo_url' | 'college'
> & {
  teams: Pick<Tables['teams']['Row'], 'id' | 'city' | 'name' | 'abbrev'> | null;
};
const PLAYER_SEARCH_SELECT =
  'id, name, number, position, photo_url, college, teams(id, city, name, abbrev)';

function toPlayerHit(row: PlayerSearchRow): PlayerHit | null {
  // A dangling team_id (shouldn't happen, FK-enforced) would leave the embedded
  // relation null — skip rather than surface a hit with no team to jump to.
  if (!row.teams) return null;
  return {
    id: row.id,
    name: row.name,
    number: row.number ?? 0,
    position: row.position as Position,
    photoUrl: row.photo_url ?? undefined,
    college: row.college ?? undefined,
    team: row.teams,
  };
}

// Searches every ingested team's players, not just one roster — backs the nav's
// player-search mode so it can surface a hit on any of the 32 teams. Runs each
// match kind (name substring, college substring, exact position, exact number) as a
// separate query rather than building one OR'd filter string, so user input never
// gets interpolated into PostgREST filter syntax. `players_name_trgm_idx` (pg_trgm
// GIN) keeps the name ILIKE fast as the table grows past the current ~2,000 rows.
export async function searchAllPlayers(query: string, limit = 8): Promise<PlayerHit[]> {
  const q = query.trim();
  if (!q) return [];
  const client = supabase();

  const asNumber = Number(q);
  const isNumberQuery = Number.isInteger(asNumber);

  const queries = [
    client
      .from('players')
      .select(PLAYER_SEARCH_SELECT)
      .ilike('name', `%${q}%`)
      .limit(limit)
      .returns<PlayerSearchRow[]>(),
    client
      .from('players')
      .select(PLAYER_SEARCH_SELECT)
      .ilike('college', `%${q}%`)
      .limit(limit)
      .returns<PlayerSearchRow[]>(),
    client
      .from('players')
      .select(PLAYER_SEARCH_SELECT)
      .ilike('position', q)
      .limit(limit)
      .returns<PlayerSearchRow[]>(),
  ];
  if (isNumberQuery) {
    queries.push(
      client
        .from('players')
        .select(PLAYER_SEARCH_SELECT)
        .eq('number', asNumber)
        .limit(limit)
        .returns<PlayerSearchRow[]>()
    );
  }
  // Colloquial group queries ("OL", "secondary", "defense") fan out to the group's
  // member positions so a fan doesn't have to know each two-letter code.
  const group = positionGroupPositions(q);
  if (group) {
    queries.push(
      client
        .from('players')
        .select(PLAYER_SEARCH_SELECT)
        .in('position', group)
        .limit(limit)
        .returns<PlayerSearchRow[]>()
    );
  }

  const results = await Promise.all(queries);
  for (const { error } of results) {
    if (error) throw new Error(`players search failed: ${error.message}`);
  }

  const byId = new Map<string, PlayerHit>();
  for (const { data } of results) {
    for (const row of data ?? []) {
      const hit = toPlayerHit(row);
      if (hit) byId.set(hit.id, hit);
    }
  }

  return rankByNameMatch([...byId.values()], q).slice(0, limit);
}

type PlayerStatsRow = Pick<
  Tables['player_stats']['Row'],
  | 'season'
  | 'season_type'
  | 'games'
  | 'completions'
  | 'attempts'
  | 'passing_yards'
  | 'passing_tds'
  | 'passing_interceptions'
  | 'carries'
  | 'rushing_yards'
  | 'rushing_tds'
  | 'receptions'
  | 'targets'
  | 'receiving_yards'
  | 'receiving_tds'
  | 'def_tackles_solo'
  | 'def_sacks'
  | 'def_interceptions'
  | 'fg_made'
  | 'fg_att'
>;
const PLAYER_STATS_SELECT =
  'season, season_type, games, completions, attempts, passing_yards, passing_tds, passing_interceptions, carries, rushing_yards, rushing_tds, receptions, targets, receiving_yards, receiving_tds, def_tackles_solo, def_sacks, def_interceptions, fg_made, fg_att';

function toPlayerSeasonStats(row: PlayerStatsRow): PlayerSeasonStats {
  return {
    season: row.season,
    seasonType: row.season_type as PlayerSeasonStats['seasonType'],
    games: row.games,
    completions: row.completions,
    attempts: row.attempts,
    passingYards: row.passing_yards,
    passingTds: row.passing_tds,
    passingInterceptions: row.passing_interceptions,
    carries: row.carries,
    rushingYards: row.rushing_yards,
    rushingTds: row.rushing_tds,
    receptions: row.receptions,
    targets: row.targets,
    receivingYards: row.receiving_yards,
    receivingTds: row.receiving_tds,
    defTacklesSolo: row.def_tackles_solo,
    defSacks: row.def_sacks,
    defInterceptions: row.def_interceptions,
    fgMade: row.fg_made,
    fgAtt: row.fg_att,
  };
}

// Lazy per-player read (locked decision: the field view never needs stats, so this
// isn't part of fetchTeamRoster's batch) -- backs app/api/players/[id]/stats/route.ts,
// fetched client-side only when a PlayerCard opens. REG only in v1 (season_type filter
// mirrors the ingest, which only ever writes REG rows today).
export async function getPlayerStats(playerId: string): Promise<PlayerSeasonStats[]> {
  const client = supabase();
  const { data, error } = await client
    .from('player_stats')
    .select(PLAYER_STATS_SELECT)
    .eq('player_id', playerId)
    .eq('season_type', 'REG')
    .order('season', { ascending: false })
    .returns<PlayerStatsRow[]>();
  if (error) throw new Error(`player_stats query failed: ${error.message}`);
  return (data ?? []).map(toPlayerSeasonStats);
}

type GameRow = Pick<
  Tables['games']['Row'],
  | 'game_id'
  | 'season'
  | 'game_type'
  | 'week'
  | 'gameday'
  | 'gametime'
  | 'home_team_id'
  | 'away_team_id'
  | 'home_score'
  | 'away_score'
>;
const GAME_SELECT =
  'game_id, season, game_type, week, gameday, gametime, home_team_id, away_team_id, home_score, away_score';

function toGame(row: GameRow): Game {
  return {
    gameId: row.game_id,
    season: row.season,
    gameType: row.game_type,
    week: row.week,
    gameday: row.gameday,
    gametime: row.gametime,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
  };
}

// All 32 teams' metadata (home-kit colors overlaid, like listTeams) keyed by id — for
// resolving a schedule's opponent ids into the colored chip the UI renders. One query for
// the small team table, not a per-opponent fetch.
async function fetchTeamMetaMap(): Promise<Map<string, Team>> {
  const [rows, homeRows] = await Promise.all([fetchAllTeamMeta(), fetchCurrentHomeRows()]);
  const homeByTeam = new Map(homeRows.map((r) => [r.team_id, r]));
  return new Map(
    rows.map((r) => {
      const home = homeByTeam.get(r.id);
      return [r.id, withHomeColors(toTeam(r), home ? [home] : [])];
    })
  );
}

// A game names two teams, so "this team's games" is two eq queries (home, away) merged —
// never an `.or()` string with the id interpolated in (invariant 8). Home/away sets are
// disjoint, so no dedup is needed.
async function fetchTeamGames(teamId: string, season: number): Promise<Game[]> {
  const client = supabase();
  const [home, away] = await Promise.all([
    client
      .from('games')
      .select(GAME_SELECT)
      .eq('home_team_id', teamId)
      .eq('season', season)
      .returns<GameRow[]>(),
    client
      .from('games')
      .select(GAME_SELECT)
      .eq('away_team_id', teamId)
      .eq('season', season)
      .returns<GameRow[]>(),
  ]);
  if (home.error) throw new Error(`games query failed: ${home.error.message}`);
  if (away.error) throw new Error(`games query failed: ${away.error.message}`);
  return [...(home.data ?? []), ...(away.data ?? [])].map(toGame);
}

// The newest season with a game for this team; drives the default schedule view. Two eq
// queries (home, away), each ordered desc limit 1, max of the two.
async function latestSeasonForTeam(teamId: string): Promise<number | null> {
  const client = supabase();
  const [home, away] = await Promise.all([
    client
      .from('games')
      .select('season')
      .eq('home_team_id', teamId)
      .order('season', { ascending: false })
      .limit(1)
      .returns<Pick<GameRow, 'season'>[]>(),
    client
      .from('games')
      .select('season')
      .eq('away_team_id', teamId)
      .order('season', { ascending: false })
      .limit(1)
      .returns<Pick<GameRow, 'season'>[]>(),
  ]);
  if (home.error) throw new Error(`games query failed: ${home.error.message}`);
  if (away.error) throw new Error(`games query failed: ${away.error.message}`);
  const seasons = [...(home.data ?? []), ...(away.data ?? [])].map((r) => r.season);
  return seasons.length ? Math.max(...seasons) : null;
}

function toScheduleGame(
  resolved: ReturnType<typeof resolveSchedule>[number],
  teamsById: Map<string, Team>
): TeamScheduleGame {
  const opp = resolved.opponentTeamId ? teamsById.get(resolved.opponentTeamId) : undefined;
  return {
    week: resolved.week,
    gameType: resolved.gameType,
    isBye: resolved.isBye,
    date: resolved.date,
    isHome: resolved.isHome,
    // A dangling opponent id (shouldn't happen, FK-enforced) resolves to null rather than
    // surfacing a half-built chip — same skip-don't-throw posture as everywhere else here.
    opponent: opp ? { id: opp.id, abbrev: opp.abbrev, colors: opp.colors } : null,
    teamScore: resolved.teamScore,
    oppScore: resolved.oppScore,
    result: resolved.result,
  };
}

// A team's regular-season schedule for one season (default: its latest), resolved from
// this team's perspective with opponents enriched for the UI. Standalone read (not on
// RosterSource, like getPlayerStats) — the field view never needs it. Degrades to null on
// an unknown team, a season with no games, or any query error
// (docs/superpowers/specs/2026-07-17-team-schedule-design.md).
export async function getTeamSchedule(
  teamId: string,
  season?: number
): Promise<TeamSchedule | null> {
  try {
    const resolvedSeason = season ?? (await latestSeasonForTeam(teamId));
    if (resolvedSeason === null) return null;
    const [games, teamsById] = await Promise.all([
      fetchTeamGames(teamId, resolvedSeason),
      fetchTeamMetaMap(),
    ]);
    const resolved = resolveSchedule(games, teamId);
    if (resolved.length === 0) return null;
    return { season: resolvedSeason, games: resolved.map((r) => toScheduleGame(r, teamsById)) };
  } catch {
    return null;
  }
}

// player_stats keyed by player only, so we need the player_id to attribute each row to a
// name; PLAYER_STATS_SELECT (single-player read above) omits it.
type RosterLeaderStatsRow = PlayerStatsRow & Pick<Tables['player_stats']['Row'], 'player_id'>;
const ROSTER_LEADER_STATS_SELECT = `player_id, ${PLAYER_STATS_SELECT}`;

// Team passing/rushing/receiving leaders for one season on the stats page (design spec
// 5a), re-derived per season tab (Stats & Analytics P1 — leaders must track the season
// switcher, not just the roster's newest season). Two typed queries — the team's players
// (for id -> name) and their REG rows for that season — merged in memory, so no user
// input touches PostgREST filter syntax (invariant 8). The field view never needs this,
// so like getPlayerStats it's a standalone read, not part of RosterSource. Returns null
// for an unknown team, a season with no ingested stats, or on any query error (degrade,
// don't throw — the page renders without the block, same as getTeamStats' try/catch).
export async function getRosterLeaders(
  teamId: string,
  season: number
): Promise<RosterLeaders | null> {
  try {
    const client = supabase();
    const { data: playerRows, error: playerError } = await client
      .from('players')
      .select('id, name')
      .eq('team_id', teamId)
      .returns<Pick<Tables['players']['Row'], 'id' | 'name'>[]>();
    if (playerError) throw new Error(`players query failed: ${playerError.message}`);
    const players = playerRows ?? [];
    if (players.length === 0) return null;

    const { data: statRows, error: statsError } = await client
      .from('player_stats')
      .select(ROSTER_LEADER_STATS_SELECT)
      .in(
        'player_id',
        players.map((p) => p.id)
      )
      .eq('season_type', 'REG')
      .eq('season', season)
      .returns<RosterLeaderStatsRow[]>();
    if (statsError) throw new Error(`player_stats query failed: ${statsError.message}`);

    const nameById = new Map(players.map((p) => [p.id, p.name]));
    const entries: LeaderEntry[] = (statRows ?? []).map((row) => ({
      playerId: row.player_id,
      name: nameById.get(row.player_id) ?? '',
      stats: toPlayerSeasonStats(row),
    }));
    return rosterLeaders(entries);
  } catch {
    return null;
  }
}

// The team's next unplayed game (the stats page's NEXT GAME card) — the earliest non-bye
// game with no result yet in its latest season, or null once the season is complete.
// Reuses getTeamSchedule so the two pages share one resolution path.
export async function getNextGame(teamId: string): Promise<TeamScheduleGame | null> {
  const schedule = await getTeamSchedule(teamId);
  if (!schedule) return null;
  return schedule.games.find((g) => !g.isBye && g.result === null) ?? null;
}

async function fetchAllTeamMeta(): Promise<TeamRow[]> {
  const client = supabase();
  const { data, error } = await client.from('teams').select(TEAM_SELECT).returns<TeamRow[]>();
  if (error) throw new Error(`teams query failed: ${error.message}`);
  return data ?? [];
}

async function fetchAllUniformRows(): Promise<UniformRow[]> {
  const client = supabase();
  const { data, error } = await client
    .from('uniforms')
    .select(UNIFORM_SELECT)
    .order('team_id', { ascending: true })
    .order('is_current', { ascending: false })
    .returns<UniformRow[]>();
  if (error) throw new Error(`uniforms query failed: ${error.message}`);
  return data ?? [];
}

async function fetchCurrentHomeRows(): Promise<UniformRow[]> {
  const client = supabase();
  const { data, error } = await client
    .from('uniforms')
    .select(UNIFORM_SELECT)
    .eq('kind', 'home')
    .eq('is_current', true)
    .returns<UniformRow[]>();
  if (error) throw new Error(`home uniforms query failed: ${error.message}`);
  return data ?? [];
}

export const dbRosterSource: RosterSource = {
  async listTeams(): Promise<TeamMeta[]> {
    const [rows, homeRows] = await Promise.all([fetchAllTeamMeta(), fetchCurrentHomeRows()]);
    const homeByTeam = new Map(homeRows.map((r) => [r.team_id, r]));
    const metas = rows.map((r) => {
      const home = homeByTeam.get(r.id);
      return withHomeColors(toTeam(r), home ? [home] : []);
    });
    return metas.sort((a, b) => a.id.localeCompare(b.id));
  },
  async getTeam(id: string): Promise<TeamRoster | undefined> {
    try {
      const roster = await fetchTeamRoster(id);
      if (roster) return roster;
    } catch {
      // DB unavailable/misconfigured → fall through to undefined below.
    }
    // Not in the DB (not yet ingested, or unknown id) → undefined -> 404.
    return undefined;
  },
  async getTeamStats(id: string): Promise<TeamStatsPage | undefined> {
    try {
      return await fetchTeamStatsPage(id);
    } catch {
      return undefined;
    }
  },
  async listUniforms(): Promise<UniformListing[]> {
    const [teamRows, uniformRows] = await Promise.all([fetchAllTeamMeta(), fetchAllUniformRows()]);
    const teamsById = new Map(teamRows.map((r) => [r.id, toTeam(r)]));
    // flatMap + [] skips a kit whose team row is missing (dangling ref, invariant 6).
    return uniformRows.flatMap((row) => {
      const team = teamsById.get(row.team_id);
      if (!team) return [];
      return [
        {
          teamId: team.id,
          teamName: `${team.city} ${team.name}`,
          conference: team.conference,
          division: team.division,
          id: row.id,
          kind: row.kind as UniformKind,
          name: row.name,
          colors: uniformColors(row),
          yearStart: row.year_start,
          yearEnd: row.year_end,
          isCurrent: row.is_current,
          imagePath: row.image_path ?? undefined,
        },
      ];
    });
  },
};
