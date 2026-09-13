// Generates the Layer-1 source-table schema for the nflverse stat surface
// (vault spec 2026-09-11-nflverse-full-stat-surface-design, ticket DEP-541).
//
//   npm run gen:nflverse-raw-tables
//
// Fetches each source's real release header, classifies every column into text /
// numeric / boolean (lists and identity fields stay text for the raw layer), and writes
// `lib/nflverse/raw-tables.generated.ts`. It also prints the `create table` DDL to
// stdout — paste that into a `supabase migration new` file (never hand-write the
// filename; an invented timestamp desyncs the Supabase git integration).
//
// This keeps the typed schema honest: the source frame is the schema authority, so an
// upstream column addition is a regeneration + a reviewable diff, not a guess.
import { writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'https://github.com/nflverse/nflverse-data/releases/download';

export interface RawColumn {
  name: string;
  type: 'text' | 'numeric' | 'boolean';
}
export interface PlayerRawSpec {
  table: string;
  source: string;
  grain: 'season' | 'week';
  idColumn: string;
  idKind: 'gsis' | 'pfr' | 'espn';
  /** CSV column holding the week (default 'week'); QBR week uses 'game_week'. */
  weekColumn?: string;
  partition?: string;
  /**
   * Fixed `season_type` for a source whose file labels season **coverage** rather than
   * grain. `stats_player_regpost_<season>.csv` holds one row per player-season tagged
   * `REG` (no postseason berth), `REG+POST` (berth), or `POST` (postseason-only); no
   * player has both REG and REG+POST, so the file's `season_type` must not read as a
   * grain or a `REG` filter drops every playoff participant. The table's declared grain
   * is REG+POST, so the transform overrides the source value with this constant.
   */
  seasonType?: string;
  columns: RawColumn[];
}
export interface PlayRawSpec {
  table: string;
  source: string;
  grain: 'play';
  keyColumns: string[];
  columns: RawColumn[];
}

// Identity / free-text columns. Everything not listed and not boolean is numeric.
const TEXT = new Set([
  'player_name',
  'player_display_name',
  'player_first_name',
  'player_last_name',
  'player_short_name',
  'player_position',
  'position',
  'position_group',
  'headshot_url',
  'headshot_href',
  'name_short',
  'name_first',
  'name_last',
  'name_display',
  'game_id',
  'pfr_game_id',
  'nflverse_game_id',
  'nflverse_play_id',
  'ftn_game_id',
  'team',
  'team_abbr',
  'team_abb',
  'opponent',
  'opponent_team',
  'opponent_team',
  'opp_id',
  'opp_abb',
  'opp_team',
  'opp_name',
  'recent_team',
  'season_type',
  'week_text',
  'starting_hash',
  'qb_location',
  'date_pulled',
]);
const isBool = (name: string) =>
  name.startsWith('is_') || name === 'qualified' || name === 'read_thrown';
const isText = (name: string) =>
  TEXT.has(name) || name.endsWith('_list') || name.endsWith('_distance');

function classify(name: string): RawColumn['type'] {
  if (isBool(name)) return 'boolean';
  if (isText(name)) return 'text';
  return 'numeric';
}

async function header(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = url.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  const firstLine = text.slice(0, text.indexOf('\n'));
  return firstLine
    .trim()
    .split(',')
    .map((c) => c.trim());
}

interface SourceConfig {
  table: string;
  source: string;
  grain: 'season' | 'week' | 'play';
  idColumn?: string;
  idKind?: PlayerRawSpec['idKind'];
  weekColumn?: string;
  partition?: string;
  /** See PlayerRawSpec.seasonType. */
  seasonType?: string;
  keyColumns?: string[];
  urls: string[];
}

// Ownership: these become our identity columns, so the source's own copies are dropped
// (the raw value is preserved as source_player_id).
const OWNED = new Set([
  'player_id',
  'pfr_player_id',
  'player_gsis_id',
  'season',
  'week',
  'season_type',
]);

const SOURCES: SourceConfig[] = [
  {
    table: 'nflverse_player_season',
    source: 'nflverse-player-season',
    grain: 'season',
    idColumn: 'player_id',
    idKind: 'gsis',
    // The regpost file's own season_type is a coverage flag (REG / REG+POST / POST), not a
    // grain -- one row per player-season. Pin it to the table's declared REG+POST grain so
    // a reader filtering REG can't silently drop every playoff participant (DEP-558).
    seasonType: 'REG+POST',
    urls: [`${BASE}/stats_player/stats_player_regpost_2024.csv`],
  },
  {
    table: 'nflverse_player_week',
    source: 'nflverse-player-week',
    grain: 'week',
    idColumn: 'player_id',
    idKind: 'gsis',
    urls: [`${BASE}/stats_player/stats_player_week_2024.csv`],
  },
  {
    table: 'pfr_player_week',
    source: 'pfr-player-week',
    grain: 'week',
    idColumn: 'pfr_player_id',
    idKind: 'pfr',
    partition: 'stat_category',
    urls: ['pass', 'def', 'rush', 'rec'].map(
      (t) => `${BASE}/pfr_advstats/advstats_week_${t}_2024.csv`
    ),
  },
  {
    table: 'ngs_player_week',
    source: 'ngs-player-week',
    grain: 'week',
    idColumn: 'player_gsis_id',
    idKind: 'gsis',
    partition: 'stat_category',
    urls: ['passing', 'rushing', 'receiving'].map(
      (t) => `${BASE}/nextgen_stats/ngs_2024_${t}.csv.gz`
    ),
  },
  {
    table: 'espn_qbr_week',
    source: 'espn-qbr-week',
    grain: 'week',
    idColumn: 'player_id',
    idKind: 'espn',
    weekColumn: 'game_week',
    urls: [`${BASE}/espn_data/qbr_week_level.csv`],
  },
  {
    table: 'espn_qbr_season',
    source: 'espn-qbr-season',
    grain: 'season',
    idColumn: 'player_id',
    idKind: 'espn',
    urls: [`${BASE}/espn_data/qbr_season_level.csv`],
  },
  {
    table: 'ftn_play',
    source: 'ftn-play',
    grain: 'play',
    keyColumns: ['ftn_game_id', 'ftn_play_id'],
    urls: [`${BASE}/ftn_charting/ftn_charting_2024.csv`],
  },
];

function identitySql(cfg: SourceConfig): { cols: string[]; pk: string } {
  if (cfg.grain === 'play') {
    const keyColumns = cfg.keyColumns ?? [];
    return {
      cols: ['updated_at timestamptz not null default now()'],
      pk: `primary key (${keyColumns.join(', ')})`,
    };
  }
  const cols = [
    'source_player_id text not null',
    'player_id text',
    'season smallint not null',
    `season_type text not null default '${cfg.seasonType ?? 'REG'}'`,
  ];
  const pkParts = ['source_player_id', 'season', 'season_type'];
  if (cfg.grain === 'week') {
    cols.push('week smallint not null');
    pkParts.push('week');
  }
  if (cfg.partition) {
    cols.push(`${cfg.partition} text not null`);
    pkParts.push(cfg.partition);
  }
  cols.push('updated_at timestamptz not null default now()');
  return { cols, pk: `primary key (${pkParts.join(', ')})` };
}

async function main() {
  const playerSpecs: PlayerRawSpec[] = [];
  const playSpecs: PlayRawSpec[] = [];
  const ddl: string[] = [];

  for (const cfg of SOURCES) {
    const headers = await Promise.all(cfg.urls.map(header));
    const seen = new Set<string>();
    const columns: RawColumn[] = [];
    for (const cols of headers) {
      for (const name of cols) {
        const owned =
          cfg.grain !== 'play' &&
          (OWNED.has(name) || name === cfg.idColumn || name === cfg.partition);
        if (owned || seen.has(name)) continue;
        seen.add(name);
        columns.push({ name, type: classify(name) });
      }
    }

    const { cols: idCols, pk } = identitySql(cfg);
    const colLines = columns.map((c) => `  ${c.name} ${c.type}`).join(',\n');
    ddl.push(
      `create table ${cfg.table} (\n  ${idCols.join(',\n  ')},\n${colLines},\n  ${pk}\n);\n` +
        (cfg.grain !== 'play'
          ? `create index ${cfg.table}_player_id_idx on ${cfg.table}(player_id);\n`
          : '') +
        `grant select, insert, update, delete on ${cfg.table} to anon, authenticated, service_role;\n` +
        `alter table ${cfg.table} enable row level security;\n` +
        `create policy "public read" on ${cfg.table} for select to anon, authenticated using (true);\n`
    );

    if (cfg.grain === 'play') {
      playSpecs.push({
        table: cfg.table,
        source: cfg.source,
        grain: 'play',
        keyColumns: cfg.keyColumns ?? [],
        columns,
      });
    } else {
      const { idColumn, idKind } = cfg;
      if (!idColumn || !idKind) throw new Error(`${cfg.table}: missing idColumn/idKind`);
      playerSpecs.push({
        table: cfg.table,
        source: cfg.source,
        grain: cfg.grain,
        idColumn,
        idKind,
        ...(cfg.weekColumn ? { weekColumn: cfg.weekColumn } : {}),
        ...(cfg.partition ? { partition: cfg.partition } : {}),
        ...(cfg.seasonType ? { seasonType: cfg.seasonType } : {}),
        columns,
      });
    }
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const out =
    '// GENERATED — do not edit by hand. Run `npm run gen:nflverse-raw-tables`.\n' +
    'export type RawColumnType = "text" | "numeric" | "boolean";\n' +
    'export interface RawColumn { name: string; type: RawColumnType }\n' +
    'export interface PlayerRawSpec { table: string; source: string; grain: "season" | "week"; idColumn: string; idKind: "gsis" | "pfr" | "espn"; weekColumn?: string; partition?: string; seasonType?: string; columns: RawColumn[] }\n' +
    'export interface PlayRawSpec { table: string; source: string; grain: "play"; keyColumns: string[]; columns: RawColumn[] }\n\n' +
    `export const playerRawTables: PlayerRawSpec[] = ${JSON.stringify(playerSpecs, null, 2)};\n\n` +
    `export const playRawTables: PlayRawSpec[] = ${JSON.stringify(playSpecs, null, 2)};\n`;
  writeFileSync(join(root, 'lib/nflverse/raw-tables.generated.ts'), out);

  process.stdout.write(
    '\n----SQL (paste into a `supabase migration new` file)----\n' + ddl.join('\n')
  );
  process.stderr.write(
    `\nwrote lib/nflverse/raw-tables.generated.ts (${playerSpecs.length} player, ${playSpecs.length} play)\n`
  );
}

void main();
