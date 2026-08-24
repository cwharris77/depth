# Player Recent Snap Participation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest nflverse snap counts into a last-good three-game player participation summary and expose that bounded data through the web and native repository seams.

**Architecture:** A pure TypeScript transform resolves PFR IDs through nflverse's player crosswalk, selects each team's latest three regular-season games, and emits summary rows for one Supabase table. The existing nflverse job upserts complete season snapshots and records diagnostics; web and Swift repositories query current/previous-season rows and map the newest shared ingestion timestamp into equivalent domain responses.

**Tech Stack:** TypeScript 5, Vitest 4, Supabase Postgres/PostgREST, nflverse CSV releases, Swift 6, Supabase Swift, Swift Testing, xcodegen

**Spec:** `../obsidian/Projects/depth/specs/2026-08-23-player-recent-snaps-design.md`

## Global Constraints

- Fetch only the latest available snap-count season and its previous season; use `REG` games only.
- A team window is its latest three unique covered games. Byes consume no slot; early-season windows may contain one or two games.
- Resolve `pfr_player_id` to ESPN ID through `players.csv`; never use name matching.
- Persist summaries only. Raw game rows never enter Supabase, `TeamSnapshot`, `TeamStatsPage`, or a native cache.
- Return the previous season only when no current-season snapshot exists, retaining its season and window metadata.
- Store `source = 'nflverse-pfr'`; return `nflverse / Pro Football Reference`.
- Public clients receive `SELECT` only; service role receives write privileges; RLS permits public reads and no public writes.
- A failed fetch, empty transform, or failed upsert records a failure and leaves last-good rows intact.
- Add no dependency, raw history endpoint, name fallback, composite score, or Compare UI.
- Follow TDD for pure transforms and mappers. Run only the targeted iOS suites named below, per `ios/CLAUDE.md`.

---

### Task 1: Pure identity and snap-window transform

**Files:**

- Modify: `lib/nflverse/crosswalk.ts`
- Modify: `lib/nflverse/crosswalk.test.ts`
- Create: `lib/nflverse/snap-counts.ts`
- Create: `lib/nflverse/snap-counts.test.ts`

**Interfaces:**

- Consumes: `resolveTeamCode(code: string): string | null`
- Produces: `buildPfrCrosswalk(rows: Record<string, string>[]): Map<string, string>`
- Produces: `toRecentSnapSummaries(rows, pfrToEspn, resolveTeam): SnapCountsTransformResult`
- Produces: `RecentSnapSummaryInsert`, the snake-case database/seed row without `updated_at`

- [x] **Step 1: Add failing PFR crosswalk tests**

Add cases beside `buildCrosswalk`:

```ts
describe('buildPfrCrosswalk', () => {
  it('maps pfr_id to espn_id without using names', () => {
    const map = buildPfrCrosswalk([
      { pfr_id: 'MahoPa00', espn_id: '3139477', display_name: 'Patrick Mahomes' },
      { pfr_id: '', espn_id: '4241479', display_name: 'Ignored' },
    ]);
    expect(map).toEqual(new Map([['MahoPa00', '3139477']]));
  });

  it('keeps the first ESPN id for a duplicate PFR id', () => {
    const map = buildPfrCrosswalk([
      { pfr_id: 'MahoPa00', espn_id: 'first' },
      { pfr_id: 'MahoPa00', espn_id: 'second' },
    ]);
    expect(map.get('MahoPa00')).toBe('first');
  });
});
```

- [x] **Step 2: Run the crosswalk test and verify the missing export failure**

Run: `npx vitest run lib/nflverse/crosswalk.test.ts`

Expected: FAIL because `buildPfrCrosswalk` is not exported.

- [x] **Step 3: Implement the PFR crosswalk without changing the GSIS API**

Use one private helper and preserve first-row-wins behavior:

```ts
function buildIdCrosswalk(
  rows: Record<string, string>[],
  sourceColumn: 'gsis_id' | 'pfr_id'
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const sourceId = row[sourceColumn]?.trim();
    const espnId = row.espn_id?.trim();
    if (!sourceId || !espnId || map.has(sourceId)) continue;
    map.set(sourceId, espnId);
  }
  return map;
}

export function buildCrosswalk(rows: Record<string, string>[]): Map<string, string> {
  return buildIdCrosswalk(rows, 'gsis_id');
}

export function buildPfrCrosswalk(rows: Record<string, string>[]): Map<string, string> {
  return buildIdCrosswalk(rows, 'pfr_id');
}
```

- [x] **Step 4: Run the crosswalk test**

Run: `npx vitest run lib/nflverse/crosswalk.test.ts`

Expected: PASS.

- [x] **Step 5: Write failing transform tests**

Use this base row:

```ts
function snapRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    game_id: '2025_01_KC_LAC',
    season: '2025',
    game_type: 'REG',
    week: '1',
    player: 'Patrick Mahomes',
    pfr_player_id: 'MahoPa00',
    team: 'KC',
    offense_snaps: '60',
    offense_pct: '1',
    defense_snaps: '0',
    defense_pct: '0',
    st_snaps: '0',
    st_pct: '0',
    ...overrides,
  };
}
```

Add named cases proving:

- weeks 2, 4, and 5 win over week 1, so a bye does not consume a slot
- one- and two-game seasons produce `games` one and two
- `OAK`, `SD`, `STL`, `LA`, and `LAR` normalize through the injected resolver
- an unresolved PFR ID increments `unresolvedRows` and emits no summary
- a player in two of three games receives a zero in the missing game's percentage average
- blank count plus blank percentage is an inactive zero-valued unit
- positive count plus blank, non-finite, negative, or greater-than-one percentage makes only that unit percentage null
- duplicate `(season, team, game_id, pfr_player_id)` rows are all malformed and never double-counted
- `POST` is filtered; missing identity/game/team/week, invalid numbers, and negative/fractional counts are malformed
- reversing source order produces identical sorted rows and diagnostics

Use this exact main assertion:

```ts
expect(result.rows[0]).toMatchObject({
  team_id: 'chiefs',
  season: 2025,
  player_id: '3139477',
  window_start_week: 2,
  window_end_week: 5,
  window_game_ids: ['2025_02_KC_PHI', '2025_04_BAL_KC', '2025_05_KC_JAX'],
  games: 3,
  offense_snaps: 120,
  offense_pct: 2 / 3,
  source: 'nflverse-pfr',
});
```

- [x] **Step 6: Run the transform test and verify the missing module failure**

Run: `npx vitest run lib/nflverse/snap-counts.test.ts`

Expected: FAIL because `snap-counts.ts` does not exist.

- [x] **Step 7: Implement the transform and exact public types**

Export:

```ts
export interface RecentSnapSummaryInsert {
  team_id: string;
  season: number;
  player_id: string;
  window_start_week: number;
  window_end_week: number;
  window_game_ids: string[];
  games: number;
  offense_snaps: number;
  offense_pct: number | null;
  defense_snaps: number;
  defense_pct: number | null;
  special_teams_snaps: number;
  special_teams_pct: number | null;
  source: 'nflverse-pfr';
}

export interface SnapCountsDiagnostics {
  fetchedRows: number;
  validRows: number;
  malformedRows: number;
  unresolvedRows: number;
  selectedTeams: number;
  selectedGames: number;
  summaries: number;
}

export interface SnapCountsTransformResult {
  rows: RecentSnapSummaryInsert[];
  diagnostics: SnapCountsDiagnostics;
}

export function toRecentSnapSummaries(
  csvRows: Record<string, string>[],
  pfrToEspn: ReadonlyMap<string, string>,
  resolveTeam: (code: string) => string | null
): SnapCountsTransformResult;
```

Implementation order:

1. Validate rows, filtering valid non-`REG` rows without calling them malformed.
2. Detect duplicate source keys before aggregation and reject every duplicate row.
3. Group by `(team_id, season)`, sort unique games by `(week, game_id)`, and take the last three.
4. Build a player/game matrix only from resolved selected-game rows.
5. Add absent player-games as zero. Treat blank count/percentage pairs as inactive zeroes; a positive count with no valid percentage retains its count but nulls that unit aggregate.
6. Average percentages over the full team-game count, not player appearances.
7. Sort output by `season DESC`, `team_id ASC`, `player_id ASC`; order game IDs oldest-to-newest.

- [x] **Step 8: Verify the pure layer**

Run:

```bash
npx vitest run lib/nflverse/crosswalk.test.ts lib/nflverse/snap-counts.test.ts
npx tsc --noEmit
npx prettier --check lib/nflverse/crosswalk.ts lib/nflverse/crosswalk.test.ts lib/nflverse/snap-counts.ts lib/nflverse/snap-counts.test.ts
```

Expected: all commands PASS.

- [x] **Step 9: Commit the pure layer**

```bash
git add lib/nflverse/crosswalk.ts lib/nflverse/crosswalk.test.ts lib/nflverse/snap-counts.ts lib/nflverse/snap-counts.test.ts
git commit -m "feat(nflverse): transform recent snap participation"
```

---

### Task 2: Supabase summary table and generated types

**Files:**

- Create: the path printed by `supabase migration new add_player_recent_snaps`
- Modify: `lib/database.types.ts`
- Modify: `lib/supabase/tables.ts`

**Interfaces:**

- Consumes: `RecentSnapSummaryInsert`
- Produces: `Database['public']['Tables']['player_recent_snaps']`
- Produces: `tables.playerRecentSnaps === 'player_recent_snaps'`

- [x] **Step 1: Verify the pre-migration table is absent**

Run:

```bash
supabase start
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select to_regclass('public.player_recent_snaps');"
```

Expected: `to_regclass` is null.

- [x] **Step 2: Create the migration through the CLI**

Run: `supabase migration new add_player_recent_snaps`

Expected: the CLI prints a new file under `supabase/migrations/`. Use that exact path; do not rename it or invent a timestamp.

- [x] **Step 3: Add the schema and access contract**

Write this SQL into the generated migration:

```sql
create table player_recent_snaps (
  team_id text not null references teams(id) on delete cascade,
  season int not null check (season >= 2012),
  player_id text not null,
  window_start_week int not null check (window_start_week between 1 and 22),
  window_end_week int not null check (window_end_week between window_start_week and 22),
  window_game_ids text[] not null check (cardinality(window_game_ids) between 1 and 3),
  games int not null check (games between 1 and 3 and games = cardinality(window_game_ids)),
  offense_snaps int not null check (offense_snaps >= 0),
  offense_pct double precision check (offense_pct between 0 and 1),
  defense_snaps int not null check (defense_snaps >= 0),
  defense_pct double precision check (defense_pct between 0 and 1),
  special_teams_snaps int not null check (special_teams_snaps >= 0),
  special_teams_pct double precision check (special_teams_pct between 0 and 1),
  source text not null check (source = 'nflverse-pfr'),
  updated_at timestamptz not null default now(),
  primary key (team_id, season, player_id)
);

grant select on player_recent_snaps to anon, authenticated;
grant select, insert, update, delete on player_recent_snaps to service_role;

alter table player_recent_snaps enable row level security;
create policy "public read" on player_recent_snaps
  for select to anon, authenticated using (true);
```

- [x] **Step 4: Apply from scratch and inspect schema security**

Run:

```bash
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select relrowsecurity from pg_class where oid = 'public.player_recent_snaps'::regclass;"
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'player_recent_snaps' order by grantee, privilege_type;"
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select policyname, roles, cmd from pg_policies where schemaname = 'public' and tablename = 'player_recent_snaps';"
```

Expected: RLS true; anon/authenticated only SELECT; service role CRUD; one public-read SELECT policy.

- [x] **Step 5: Verify actor behavior and constraints in rollback-only transactions**

As `service_role`, insert a valid Chiefs row. Switch to `anon`, select it successfully, then confirm an equivalent anon insert fails permission checks. Run separate rollback-only invalid inserts for season 2011, four game IDs, mismatched `games`, negative snaps, percentage 1.1, and an invalid source.

Use this valid row:

```sql
insert into player_recent_snaps (
  team_id, season, player_id, window_start_week, window_end_week,
  window_game_ids, games, offense_snaps, offense_pct,
  defense_snaps, defense_pct, special_teams_snaps, special_teams_pct, source
) values (
  'chiefs', 2025, '3139477', 15, 17,
  array['g15','g16','g17'], 3, 180, 1,
  0, 0, 0, 0, 'nflverse-pfr'
);
```

- [x] **Step 6: Regenerate types and add the typed constant**

Run: `npm run db:types`

Add `playerRecentSnaps: 'player_recent_snaps'` to `lib/supabase/tables.ts`. Its existing `satisfies Record<string, keyof Database['public']['Tables']>` assertion must compile without a cast.

- [x] **Step 7: Verify and commit schema artifacts**

Run:

```bash
npx tsc --noEmit
npx prettier --check lib/database.types.ts lib/supabase/tables.ts
git diff --check
```

Expected: PASS; generated relationships contain only the `team_id` foreign key.

Stage the CLI-generated migration plus the two TypeScript files and commit:

```bash
git add supabase/migrations lib/database.types.ts lib/supabase/tables.ts
git commit -m "feat(supabase): add recent player snap summaries"
```

---

### Task 3: Deterministic seed and last-good ingestion

**Files:**

- Modify: `lib/nflverse/seed-sql.ts`
- Modify: `lib/nflverse/seed-sql.test.ts`
- Create: `lib/nflverse/snap-counts-ingest.ts`
- Create: `lib/nflverse/snap-counts-ingest.test.ts`
- Modify: `scripts/ingest-nflverse.mts`
- Modify: `supabase/seed-nflverse.sql`

**Interfaces:**

- Consumes: `buildPfrCrosswalk`, `toRecentSnapSummaries`, `RecentSnapSummaryInsert`
- Produces: `buildRecentSnapSummariesSeedSql(rows): string`
- Produces: `ingestRecentSnapSeason(options): Promise<SnapSeasonIngestResult>`
- Produces: `ingestion_runs.errors.snap_counts`

- [x] **Step 1: Add failing deterministic seed tests**

```ts
describe('buildRecentSnapSummariesSeedSql', () => {
  it('emits deterministic rows without an ingestion timestamp', () => {
    const sql = buildRecentSnapSummariesSeedSql([recentSnapRow()]);
    expect(sql).toContain('insert into player_recent_snaps');
    expect(sql).toContain('on conflict (team_id,season,player_id) do nothing;');
    expect(sql).not.toContain('updated_at');
    expect(buildRecentSnapSummariesSeedSql([recentSnapRow()])).toBe(sql);
  });

  it('returns empty SQL for no rows', () => {
    expect(buildRecentSnapSummariesSeedSql([])).toBe('');
  });
});
```

- [x] **Step 2: Run the seed test and verify the missing export failure**

Run: `npx vitest run lib/nflverse/seed-sql.test.ts`

Expected: FAIL because the function is not exported.

- [x] **Step 3: Implement the seed serializer**

Call `insertStatement(tables.playerRecentSnaps, columns, rows, 'team_id,season,player_id')` with the Task 1 columns. Omit `updated_at` so Postgres supplies it and the SQL remains deterministic.

- [x] **Step 4: Run the seed test**

Run: `npx vitest run lib/nflverse/seed-sql.test.ts`

Expected: PASS.

- [x] **Step 5: Write failing last-good orchestration tests**

In `snap-counts-ingest.test.ts`, use injected fetch and upsert functions. Add three cases:

```ts
it('does not call the writer when the source fetch fails', async () => {
  const upsert = vi.fn();
  await expect(
    ingestRecentSnapSeason({
      season: 2025,
      fetchCsv: async () => {
        throw new Error('source unavailable');
      },
      pfrToEspn,
      resolveTeam: resolveTeamCode,
      updatedAt: '2026-08-24T12:00:00.000Z',
      upsert,
    })
  ).rejects.toThrow('source unavailable');
  expect(upsert).not.toHaveBeenCalled();
});
```

Also prove an empty/malformed transform rejects without writing and a valid transform calls upsert exactly once with every row carrying the shared `updated_at`. This is the executable last-good guarantee: the helper exposes only an upsert callback and never a delete/replace callback.

Run: `npx vitest run lib/nflverse/snap-counts-ingest.test.ts`

Expected: FAIL because the module does not exist.

- [x] **Step 6: Implement the tested season orchestration helper**

Create this interface in `snap-counts-ingest.ts`:

```ts
export interface SnapSeasonIngestResult {
  rows: RecentSnapSummaryInsert[];
  diagnostics: SnapCountsDiagnostics;
  rowsWritten: number;
}

export async function ingestRecentSnapSeason(options: {
  season: number;
  fetchCsv: () => Promise<string>;
  pfrToEspn: ReadonlyMap<string, string>;
  resolveTeam: (code: string) => string | null;
  updatedAt: string;
  upsert?: (rows: Array<RecentSnapSummaryInsert & { updated_at: string }>) => Promise<void>;
}): Promise<SnapSeasonIngestResult>;
```

The function fetches and parses the full CSV, transforms it, rejects zero summaries, then invokes `upsert` once. It returns `rowsWritten = rows.length` only after a live upsert succeeds; seed mode omits `upsert` and returns zero written rows while retaining `rows` for serialization.

- [x] **Step 7: Add the script-level ingestion coordinator**

In `scripts/ingest-nflverse.mts`, add:

```ts
const SNAP_COUNTS_TAG = 'snap_counts';
const SNAP_COUNTS_PREFIX = 'snap_counts_';

interface RecentSnapsIngestResult {
  rows: RecentSnapSummaryInsert[];
  rowsWritten: number;
  seasons: number[];
  diagnosticsBySeason: Record<number, SnapCountsDiagnostics>;
  failures: { season: number | string; message: string }[];
}
```

Parse `players.csv` once, then build both `buildCrosswalk(playerRows)` and `buildPfrCrosswalk(playerRows)`.

Implement:

```ts
async function ingestRecentSnaps(
  supabase: SupabaseClient<Database> | null,
  pfrCrosswalk: ReadonlyMap<string, string>,
  startedAt: string
): Promise<RecentSnapsIngestResult>;
```

The coordinator must:

1. discover its latest season independently with `latestAvailableSeason(SNAP_COUNTS_TAG, SNAP_COUNTS_PREFIX)`
2. process exactly `[latest, latest - 1]`, ignoring `--seasons`
3. call the tested `ingestRecentSnapSeason` helper once per season
4. supply one Supabase upsert callback using conflict key `team_id,season,player_id`
5. append failures and continue to the other season
6. accumulate transformed rows for seed mode and successful `rowsWritten` for live counts

- [x] **Step 8: Add seed output and run diagnostics**

Add `buildRecentSnapSummariesSeedSql(result.rows)` to the seed parts and add `rowsWritten` to live `totalWritten`. Append failures to the run-wide failures. Record:

```ts
snap_counts: {
  seasons: recentSnapsResult.seasons,
  rows_written: recentSnapsResult.rowsWritten,
  by_season: recentSnapsResult.diagnosticsBySeason,
},
```

Extend the console summary with snap seasons and rows. Keep existing partial/STRICT handling centralized.

- [x] **Step 9: Run focused verification and regenerate the seed**

```bash
npx vitest run lib/nflverse/crosswalk.test.ts lib/nflverse/snap-counts.test.ts lib/nflverse/snap-counts-ingest.test.ts lib/nflverse/seed-sql.test.ts
npm run gen:nflverse-seed
npx tsc --noEmit
npx prettier --check lib/nflverse/seed-sql.ts lib/nflverse/seed-sql.test.ts lib/nflverse/snap-counts-ingest.ts lib/nflverse/snap-counts-ingest.test.ts scripts/ingest-nflverse.mts
```

Expected: PASS; generation logs two snap seasons and writes `player_recent_snaps` SQL.

- [x] **Step 10: Prove deterministic, idempotent seed behavior**

```bash
cp supabase/seed-nflverse.sql /tmp/depth-seed-nflverse-first.sql
npm run gen:nflverse-seed
diff -u /tmp/depth-seed-nflverse-first.sql supabase/seed-nflverse.sql
supabase db reset
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select season, count(*), min(updated_at) = max(updated_at) as shared_timestamp from player_recent_snaps group by season order by season desc;"
```

Expected: empty diff; both resets pass; every season has rows and one timestamp.

- [x] **Step 11: Commit ingestion and seed support**

```bash
git add lib/nflverse/seed-sql.ts lib/nflverse/seed-sql.test.ts lib/nflverse/snap-counts-ingest.ts lib/nflverse/snap-counts-ingest.test.ts scripts/ingest-nflverse.mts supabase/seed-nflverse.sql
git commit -m "feat(nflverse): ingest recent snap summaries"
```

---

### Task 4: Bounded TypeScript repository response

**Files:**

- Modify: `lib/types.ts`
- Modify: `lib/roster-source.ts`
- Create: `lib/utils/compare/recent-participation.ts`
- Create: `lib/utils/compare/recent-participation.test.ts`
- Modify: `lib/roster-source.db.ts`
- Modify: `lib/__tests__/roster-source.db.test.ts`

**Interfaces:**

- Consumes: generated `player_recent_snaps` rows
- Produces: `buildRecentParticipation(rows): RecentParticipation | undefined`
- Produces: `RosterSource.recentParticipation(id): Promise<RecentParticipation | undefined>`

- [x] **Step 1: Define the web domain contract**

Add to `lib/types.ts`:

```ts
export interface ParticipationUnit {
  snaps: number;
  percentage?: number;
}

export interface PlayerRecentParticipation {
  playerId: string;
  offense: ParticipationUnit;
  defense: ParticipationUnit;
  specialTeams: ParticipationUnit;
}

export interface RecentParticipation {
  teamId: string;
  season: number;
  windowStartWeek: number;
  windowEndWeek: number;
  gameIds: string[];
  source: 'nflverse / Pro Football Reference';
  updatedAt: string;
  players: PlayerRecentParticipation[];
}
```

Add `recentParticipation(id: string): Promise<RecentParticipation | undefined>` to `RosterSource`.

- [x] **Step 2: Write failing mapper tests**

Use row fixtures with two seasons and two timestamps. Assert:

- greatest season beats a later timestamp from the previous season
- greatest `updated_at` within that season excludes stale players
- null percentages become omitted properties while zero stays zero
- players sort by `playerId`
- empty rows return undefined
- `nflverse-pfr` becomes `nflverse / Pro Football Reference`
- inconsistent winning-window metadata throws

Main expected object:

```ts
expect(buildRecentParticipation(rows)).toEqual({
  teamId: 'chiefs',
  season: 2025,
  windowStartWeek: 15,
  windowEndWeek: 17,
  gameIds: ['g15', 'g16', 'g17'],
  source: 'nflverse / Pro Football Reference',
  updatedAt: '2026-01-05T12:00:00.000Z',
  players: [
    {
      playerId: '3139477',
      offense: { snaps: 180, percentage: 1 },
      defense: { snaps: 0, percentage: 0 },
      specialTeams: { snaps: 0 },
    },
  ],
});
```

- [x] **Step 3: Run the mapper test and verify the missing module failure**

Run: `npx vitest run lib/utils/compare/recent-participation.test.ts`

Expected: FAIL because the module does not exist.

- [x] **Step 4: Implement the pure mapper**

Export a row interface matching the explicit DB projection. Select greatest season, then greatest parsed timestamp. Preserve the winning timestamp string. Require winning rows to share team/window/source metadata, then sort mapped players by ID.

- [x] **Step 5: Run the mapper test**

Run: `npx vitest run lib/utils/compare/recent-participation.test.ts`

Expected: PASS.

- [x] **Step 6: Add the bounded database read**

In `lib/roster-source.db.ts`, project only:

```text
team_id, season, player_id, window_start_week, window_end_week, window_game_ids,
games, offense_snaps, offense_pct, defense_snaps, defense_pct,
special_teams_snaps, special_teams_pct, source, updated_at
```

Add a cached helper that gets `getNflSeasonState()`, derives current source season as `isOffseason ? upcomingSeason : upcomingSeason - 1`, queries the requested team with `.in('season', [currentSeason, currentSeason - 1])`, applies `cacheTag('ingest:nflverse')`, and calls `buildRecentParticipation`.

Implement `dbRosterSource.recentParticipation` with the same fail-soft boundary as `getTeamStats`: undefined on empty, malformed, unknown, or unavailable data.

- [x] **Step 7: Add the environment-gated live smoke test**

```ts
it('returns a bounded participation summary when snap data is seeded', async () => {
  const summary = await dbRosterSource.recentParticipation('chiefs');
  if (!summary) return;
  expect(summary.teamId).toBe('chiefs');
  expect(summary.gameIds.length).toBeGreaterThanOrEqual(1);
  expect(summary.gameIds.length).toBeLessThanOrEqual(3);
  expect(summary.players.length).toBeGreaterThan(0);
  expect(summary.source).toBe('nflverse / Pro Football Reference');
});
```

- [x] **Step 8: Verify and commit the web slice**

```bash
npx vitest run lib/utils/compare/recent-participation.test.ts lib/__tests__/roster-source.db.test.ts
npx tsc --noEmit
npx prettier --check lib/types.ts lib/roster-source.ts lib/utils/compare/recent-participation.ts lib/utils/compare/recent-participation.test.ts lib/roster-source.db.ts lib/__tests__/roster-source.db.test.ts
git add lib/types.ts lib/roster-source.ts lib/utils/compare/recent-participation.ts lib/utils/compare/recent-participation.test.ts lib/roster-source.db.ts lib/__tests__/roster-source.db.test.ts
git commit -m "feat(compare): expose recent participation data"
```

Expected: all verification passes; the live suite skips only without Supabase environment variables.

---

### Task 5: Cross-language fixture and native repository parity

**Files:**

- Modify: `fixtures/generate.mts`
- Create: `fixtures/domain/recent-participation.json`
- Modify: `lib/__tests__/domain-fixtures-parity.test.ts`
- Create: `ios/Depth/Domain/RecentParticipation.swift`
- Create: `ios/Depth/Data/RecentParticipationDTO.swift`
- Create: `ios/Depth/Data/RecentParticipationMapper.swift`
- Modify: `ios/Depth/Data/DepthRepository.swift`
- Modify: `ios/Depth/Data/SupabaseDepthRepository.swift`
- Modify: `ios/Depth/Data/CachingDepthRepository.swift`
- Create: `ios/DepthTests/RecentParticipationMapperTests.swift`
- Modify: `ios/DepthTests/CachingDepthRepositoryTests.swift`
- Modify: `ios/Depth.xcodeproj/project.pbxproj`

**Interfaces:**

- Consumes: Task 4 field names and selection rules
- Produces: `RecentParticipationMapper.map(_:)` and Swift `RecentParticipation`
- Produces: `DepthRepository.recentParticipation(teamId:) async throws -> RecentParticipation?`

- [x] **Step 1: Generate a TypeScript-oracle fixture**

Add current-season and previous-season-only cases to `fixtures/generate.mts`:

```ts
write(
  'recent-participation',
  recentParticipationCases.map((testCase) => ({
    description: testCase.description,
    input: testCase.rows,
    expected: buildRecentParticipation(testCase.rows),
  }))
);
```

Run: `npx tsx fixtures/generate.mts`

Expected: `recent-participation.json` has snake-case row inputs and camel-case expected domain values.

- [x] **Step 2: Add and run the TypeScript fixture drift guard**

Load the fixture in `domain-fixtures-parity.test.ts` and assert each `buildRecentParticipation(input)` equals `expected`.

Run: `npx vitest run lib/__tests__/domain-fixtures-parity.test.ts`

Expected: PASS.

- [x] **Step 3: Define Swift domain and DTO types**

Create:

```swift
struct RecentParticipation: Equatable, Codable, Sendable {
    let teamId: String
    let season: Int
    let windowStartWeek: Int
    let windowEndWeek: Int
    let gameIds: [String]
    let source: String
    let updatedAt: String
    let players: [PlayerRecentParticipation]
}

struct PlayerRecentParticipation: Equatable, Codable, Sendable {
    let playerId: String
    let offense: ParticipationUnit
    let defense: ParticipationUnit
    let specialTeams: ParticipationUnit
}

struct ParticipationUnit: Equatable, Codable, Sendable {
    let snaps: Int
    let percentage: Double?
}
```

`RecentParticipationDTO` must use explicit `CodingKeys` for every selected snake-case column. Keep percentages optional and `updatedAt` a string for exact parity.

- [x] **Step 4: Write the failing Swift fixture mapper tests**

Decode `recent-participation.json` through `loadFixture`; assert each mapped value equals expected. Add direct empty-input nil and inconsistent-winning-metadata error cases.

Run `xcodegen generate --spec ios/project.yml`. Resolve an available simulator ID with `xcrun simctl list devices available`, assign it to `DEPTH_SIM_ID`, then run:

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -destination "platform=iOS Simulator,id=$DEPTH_SIM_ID" test -only-testing:DepthTests/RecentParticipationMapperTests
```

Expected: FAIL because the mapper is missing.

- [x] **Step 5: Implement the Swift mapper**

It must return nil for empty rows; select greatest season then greatest ISO timestamp; reject mixed winning metadata; map the source attribution; preserve zero percentages; and sort players by ID.

- [x] **Step 6: Run cross-language mapper verification**

```bash
npx vitest run lib/__tests__/domain-fixtures-parity.test.ts
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -destination "platform=iOS Simulator,id=$DEPTH_SIM_ID" test -only-testing:DepthTests/RecentParticipationMapperTests
```

Expected: PASS.

- [x] **Step 7: Add the native repository method**

Add to `DepthRepository`:

```swift
func recentParticipation(teamId: String) async throws -> RecentParticipation?
```

Add a default nil implementation in its protocol extension so unrelated focused test doubles compile.

In `SupabaseDepthRepository`, add the Task 4 explicit projection. Derive current source season from `TeamStatsMapper.nflSeasonState()` and query:

```swift
let rows: [RecentParticipationDTO] = try await client
    .from("player_recent_snaps")
    .select(Self.recentParticipationSelect)
    .eq("team_id", value: teamId)
    .in("season", values: [currentSeason, currentSeason - 1])
    .execute()
    .value
return try RecentParticipationMapper.map(rows)
```

Use the repository's existing error mapping. In `CachingDepthRepository`, delegate directly to `underlying`; add no SwiftData, TTL, or in-flight cache.

- [x] **Step 8: Add the caching-delegation test**

Extend the existing fake with a configurable `RecentParticipation?` result and call count. Assert the wrapper returns the exact value and invokes the underlying method once.

Run:

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -destination "platform=iOS Simulator,id=$DEPTH_SIM_ID" test -only-testing:DepthTests/RecentParticipationMapperTests -only-testing:DepthTests/CachingDepthRepositoryTests
```

Expected: PASS.

- [x] **Step 9: Regenerate, inspect, and commit the Xcode project**

```bash
xcodegen generate --spec ios/project.yml
git diff -- ios/Depth.xcodeproj/project.pbxproj
```

Expected: only the three new app files and one test file enter the project; no signing/build-setting drift.

```bash
git add fixtures/generate.mts fixtures/domain/recent-participation.json lib/__tests__/domain-fixtures-parity.test.ts ios/Depth/Domain/RecentParticipation.swift ios/Depth/Data/RecentParticipationDTO.swift ios/Depth/Data/RecentParticipationMapper.swift ios/Depth/Data/DepthRepository.swift ios/Depth/Data/SupabaseDepthRepository.swift ios/Depth/Data/CachingDepthRepository.swift ios/DepthTests/RecentParticipationMapperTests.swift ios/DepthTests/CachingDepthRepositoryTests.swift ios/Depth.xcodeproj/project.pbxproj
git commit -m "feat(ios): expose recent participation data"
```

---

### Task 6: Documentation and final verification

**Files:**

- Modify: `docs/nflverse.md`
- Modify: `docs/superpowers/plans/2026-08-24-player-recent-snaps.md`

**Interfaces:**

- Consumes: completed schema, ingestion, repository, and attribution contracts
- Produces: operator documentation for source, cadence, diagnostics, seed, fallback, and outage behavior

- [x] **Step 1: Document the pipeline**

Add to `docs/nflverse.md`:

- `snap_counts/snap_counts_<season>.csv` source pattern and nflverse/PFR ownership
- current/previous selection independent of `--seasons`
- PFR-to-ESPN mapping and counted unresolved IDs
- last-three-REG-games, early-season, bye, and zero-fill semantics
- summary-only storage and shared timestamp
- `ingestion_runs.errors.snap_counts` fields
- last-good behavior on fetch/transform/upsert failure
- seed/reset commands and returned attribution

Link the approved vault spec at `../obsidian/Projects/depth/specs/2026-08-23-player-recent-snaps-design.md`.

- [x] **Step 2: Run complete TypeScript verification**

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
```

Expected: PASS without new warnings.

- [x] **Step 3: Run targeted native verification**

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -destination "platform=iOS Simulator,id=$DEPTH_SIM_ID" test -only-testing:DepthTests/RecentParticipationMapperTests -only-testing:DepthTests/CachingDepthRepositoryTests
```

Expected: PASS. Do not substitute the full iOS suite.

- [x] **Step 4: Re-run final local database checks**

```bash
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select season, count(*) as players, min(updated_at) = max(updated_at) as shared_timestamp from player_recent_snaps group by season order by season desc;"
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c "select grantee, string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'player_recent_snaps' group by grantee order by grantee;"
```

Expected: seeded seasons have players and one timestamp; public roles have only SELECT.

- [x] **Step 5: Inspect scope and payload boundaries**

```bash
rg -n "player_recent_snaps|recentParticipation|RecentParticipation" lib ios fixtures scripts docs supabase
git diff origin/main...HEAD --stat
git diff --check origin/main...HEAD
```

Confirm no Compare UI changed; neither `TeamSnapshot` nor `TeamStatsPage` gained participation; raw rows are not stored/returned; only dedicated methods query the table; attribution is present; unrelated work is unstaged.

- [ ] **Step 6: Complete and commit documentation**

Check completed steps in this plan, then run:

```bash
git add docs/nflverse.md docs/superpowers/plans/2026-08-24-player-recent-snaps.md
git commit -m "docs(nflverse): document recent snap summaries"
```

- [ ] **Step 7: Open the ready pull request without merging**

Push `codex/dep-313-snap-participation` and open a ready PR titled `feat(compare): ingest recent player participation`. Link DEP-313; summarize last-good storage; list TypeScript, native, and database checks; state that Compare UI is intentionally unchanged. Stop for review. Squash merge only after checks and review feedback are clear.
