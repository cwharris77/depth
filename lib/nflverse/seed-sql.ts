// Serializes nflverse-sourced rows into committed Postgres seed scripts (supabase/seed-
// nflverse.sql, supabase/seed-roster-history.sql) so a local `supabase db reset`
// restores nflverse data without re-running the live ingest (scripts/ingest-nflverse.mts
// and scripts/ingest-nflverse-rosters.mts SEED_OUT modes call these). Column lists
// mirror the live upserts in those scripts — keep them in sync.
//
// player_stats FKs to `players` (ESPN-keyed), which SEED_OUT mode never queries (no DB
// touched, matching ingest-espn.mts's seed mode) — callers must pre-filter rows to ids
// this seed can see, via extractPlayerIds() below, parsed from the already-committed
// ESPN seed (supabase/seed.sql). roster_history has no such FK (nflverse-keyed by
// gsis_id, 20260801031305_add_roster_history.sql) and needs no filtering.
import { insertStatement } from '../seed-sql';
import type { PlayerStatsInsert } from './transform';
import type { ScheduleInsert, GameInsert } from './games';
import type { RosterHistoryInsert } from './roster-history';
import type { FormationTally } from './participation';
import type { DefenseFormationTally } from './defense-participation';

export type UnitFormationTally =
  (FormationTally & { unit: 'offense' }) | (DefenseFormationTally & { unit: 'defense' });

// Pulls every player id out of the committed ESPN seed's `insert into players (id, ...)
// values` block. Not a general SQL parser — seed.sql's players insert is always this
// module's sibling insertStatement() output (single-quoted, ''-escaped string
// literals), never arbitrary SQL, so this only has to understand that one fixed shape.
// Returns an empty set (never throws) if the block isn't found, so a caller that hasn't
// run gen:espn-seed yet gets "everything skipped" rather than a crash.
export function extractPlayerIds(seedSql: string): Set<string> {
  const block = seedSql.match(/insert into players \([^)]*\) values\n([\s\S]*?)\non conflict/);
  const ids = new Set<string>();
  if (!block) return ids;
  const rowIdRe = /^\s*\(\s*'((?:[^'\\]|'')*)'/gm;
  let m: RegExpExecArray | null;
  while ((m = rowIdRe.exec(block[1])) !== null) {
    ids.add(m[1].replace(/''/g, "'"));
  }
  return ids;
}

export function buildPlayerStatsSeedSql(rows: PlayerStatsInsert[]): string {
  return insertStatement(
    'player_stats',
    [
      'player_id',
      'season',
      'season_type',
      'games',
      'completions',
      'attempts',
      'passing_yards',
      'passing_tds',
      'passing_interceptions',
      'carries',
      'rushing_yards',
      'rushing_tds',
      'receptions',
      'targets',
      'receiving_yards',
      'receiving_tds',
      'def_tackles_solo',
      'def_sacks',
      'def_interceptions',
      'fg_made',
      'fg_att',
    ],
    rows,
    'player_id,season,season_type'
  );
}

// schedules must precede games — games' composite FKs reference schedules(team_id,
// season), same ordering the live ingest (ingestGames in ingest-nflverse.mts) enforces.
export function buildSchedulesAndGamesSeedSql(
  schedules: ScheduleInsert[],
  games: GameInsert[]
): string {
  const parts = [
    insertStatement('schedules', ['team_id', 'season'], schedules, 'team_id,season'),
    insertStatement(
      'games',
      [
        'game_id',
        'season',
        'game_type',
        'week',
        'gameday',
        'gametime',
        'home_team_id',
        'away_team_id',
        'home_score',
        'away_score',
      ],
      games,
      'game_id'
    ),
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildTeamFormationsSeedSql(tallies: UnitFormationTally[]): string {
  return insertStatement(
    'team_formations',
    ['team_id', 'season', 'unit', 'rank', 'alignment', 'personnel', 'pct'],
    tallies,
    'team_id,season,unit,rank'
  );
}

export function buildRosterHistorySeedSql(rows: RosterHistoryInsert[]): string {
  return insertStatement(
    'roster_history',
    [
      'season',
      'team_id',
      'gsis_id',
      'espn_id',
      'name',
      'number',
      'position',
      'college',
      'height',
      'weight',
      'headshot_url',
      'depth_rank',
      'player_order',
    ],
    rows,
    'season,team_id,gsis_id'
  );
}
