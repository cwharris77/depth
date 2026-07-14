// Serializes resolved TeamRosters into a Postgres seed script (supabase/seed.sql) so a
// local `supabase db reset` restores the ESPN-ingested data without re-running the live
// ingest (scripts/ingest-espn.mts SEED_OUT mode calls this). Column lists mirror
// writeTeam()/writeTeamStats() in that script — keep them in sync; this is the offline
// twin of those upserts. Every statement is `on conflict … do nothing` and safe to
// re-run, except `teams`: 20260707190000_seed_teams.sql pre-seeds a bare identity row
// per team for FK purposes, so teams uses `do update set` to overwrite that stub with
// the real ESPN data instead of silently no-oping.
import { toDepthChartRows } from './transform';
import type { Coach } from './transform';
import type { TeamRoster, TeamStats } from '../types';

type Val = string | number | boolean | null | undefined;

// SQL literal for a single value. Strings are single-quote-escaped; null/undefined ->
// NULL. Untrusted ESPN text (names with apostrophes) must never break the script.
export function sqlValue(v: Val): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${v.replace(/'/g, "''")}'`;
}

// One multi-row INSERT for a table. By default ON CONFLICT DO NOTHING. Pass
// `updateColumns` when a bare identity row may already exist at the conflict target
// (e.g. teams, pre-seeded by 20260707190000_seed_teams.sql for FK purposes) so this
// seed's richer ESPN data overwrites the stub instead of silently no-oping. Empty
// rows -> ''.
export function insertStatement(
  table: string,
  columns: string[],
  rows: Record<string, Val>[],
  conflict: string,
  updateColumns?: string[]
): string {
  if (rows.length === 0) return '';
  const values = rows
    .map((r) => `  (${columns.map((c) => sqlValue(r[c])).join(', ')})`)
    .join(',\n');
  const action =
    updateColumns && updateColumns.length > 0
      ? `do update set ${updateColumns.map((c) => `${c} = excluded.${c}`).join(', ')}`
      : 'do nothing';
  return `insert into ${table} (${columns.join(', ')}) values\n${values}\non conflict (${conflict}) ${action};\n`;
}

export interface SeedEntry {
  roster: TeamRoster;
  coach: Coach | null;
  stats: TeamStats[];
}

// Build the full seed script from resolved rosters. FK order: teams -> players ->
// depth_chart_entries + special_teams_slots -> team_stats. updated_at is omitted so the
// column default (now()) fills it and regenerated seeds don't churn the diff with
// timestamps.
export function buildSeedSql(entries: SeedEntry[]): string {
  const teams: Record<string, Val>[] = [];
  const players: Record<string, Val>[] = [];
  const depth: Record<string, Val>[] = [];
  const special: Record<string, Val>[] = [];
  const teamStats: Record<string, Val>[] = [];

  for (const { roster, coach, stats } of entries) {
    const { team, players: roosterPlayers, specialTeams } = roster;
    teams.push({
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
    });

    for (const p of roosterPlayers) {
      players.push({
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
      });
    }

    for (const row of toDepthChartRows(roosterPlayers)) {
      depth.push({
        team_id: team.id,
        position: row.position,
        depth_rank: row.depthRank,
        player_id: row.playerId,
      });
    }

    for (const s of specialTeams) {
      special.push({
        id: `${team.id}-${s.id}`,
        team_id: team.id,
        label: s.label,
        player_id: s.playerId,
        x: s.x,
        y: s.y,
      });
    }

    for (const s of stats) {
      teamStats.push({
        team_id: team.id,
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
      });
    }
  }

  const parts = [
    '-- Generated by `npm run gen:espn-seed` (scripts/ingest-espn.mts SEED_OUT mode).',
    '-- ESPN roster snapshot for local `supabase db reset`. Do not hand-edit; regenerate.',
    '',
    insertStatement(
      'teams',
      [
        'id',
        'espn_id',
        'abbrev',
        'city',
        'name',
        'conference',
        'division',
        'color_primary',
        'color_secondary',
        'color_accent',
        'ui_accent',
        'on_accent',
        'logo_url',
        'logo_dark_url',
        'coach_name',
        'coach_espn_id',
        'coach_experience',
      ],
      teams,
      'id',
      [
        'espn_id',
        'abbrev',
        'city',
        'name',
        'conference',
        'division',
        'color_primary',
        'color_secondary',
        'color_accent',
        'ui_accent',
        'on_accent',
        'logo_url',
        'logo_dark_url',
        'coach_name',
        'coach_espn_id',
        'coach_experience',
      ]
    ),
    insertStatement(
      'players',
      [
        'id',
        'team_id',
        'name',
        'number',
        'position',
        'status',
        'age',
        'college',
        'experience',
        'height',
        'weight',
        'bio',
        'photo_url',
      ],
      players,
      'id'
    ),
    insertStatement(
      'depth_chart_entries',
      ['team_id', 'position', 'depth_rank', 'player_id'],
      depth,
      'team_id,position,depth_rank'
    ),
    insertStatement(
      'special_teams_slots',
      ['id', 'team_id', 'label', 'player_id', 'x', 'y'],
      special,
      'id'
    ),
    insertStatement(
      'team_stats',
      [
        'team_id',
        'season',
        'overall_wins',
        'overall_losses',
        'overall_ties',
        'win_percent',
        'home_wins',
        'home_losses',
        'road_wins',
        'road_losses',
        'division_wins',
        'division_losses',
        'conference_wins',
        'conference_losses',
        'points_for',
        'points_against',
        'point_differential',
        'streak',
        'playoff_seed',
      ],
      teamStats,
      'team_id,season'
    ),
  ];

  return parts.filter(Boolean).join('\n') + '\n';
}
