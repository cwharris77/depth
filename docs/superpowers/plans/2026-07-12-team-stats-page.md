# Team Stats Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dedicated `/team/[id]/stats` page showing head coach + season record, reachable from a new header icon button, and remove the coach line that currently sits in the field-view header (depth#95).

**Architecture:** One more field of the ESPN standings payload the ingest already fetches (`parseTeamStats`, mirroring the existing `parseStandings`) lands in a new `team_stats` table (1:1 with `teams`, typed columns, no JSONB). A new `RosterSource.getTeamStats` read composes team identity + the existing `coach_*` columns on `teams` + the new `team_stats` row into one page. The field view drops its coach line and gains a stats icon button linking to the new route.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres, Vitest.

## Global Constraints

- Formatting is Prettier's job — run `npm run format` before every commit (`.prettierrc`: single quotes, 100 width, es5 trailing commas, bracket-same-line).
- Every new/changed `lib/` module needs a role-and-constraint header comment; inline comments state contracts, never line narration.
- Pure logic lives in `lib/` with colocated tests; components stay thin.
- Package manager is npm. No new dependencies.
- Conventional Commits for every commit (`type(scope): message`), scope from: `stats`, `teams`, `espn`, `ingest`, `supabase`.
- `npx tsc --noEmit` must exit 0 and `npm test` must be green before any commit that touches shared types.
- Untrusted/missing data degrades to `undefined`/skip, never a partial row or a throw.

---

### Task 1: `team_stats` table migration

**Files:**
- Create: `supabase/migrations/20260712160000_add_team_stats.sql`

**Interfaces:**
- Produces: Postgres table `team_stats` — columns `team_id text primary key references teams(id)`, `overall_wins int`, `overall_losses int`, `overall_ties int`, `win_percent numeric`, `home_wins int`, `home_losses int`, `road_wins int`, `road_losses int`, `division_wins int`, `division_losses int`, `conference_wins int`, `conference_losses int`, `points_for int`, `points_against int`, `point_differential int`, `streak text`, `playoff_seed int`, `updated_at timestamptz not null default now()`. RLS on with a `"public read"` policy for `anon, authenticated`, same shape as the `teams` policy.

- [ ] **Step 1: Write the migration**

```sql
-- Team stats page (Phase E, docs/superpowers/specs/2026-07-12-team-stats-page-design.md).
-- Season record + standings detail, one row per team. Sourced from the same ESPN
-- standings fetch already used for conference/division (lib/espn/standings.ts
-- parseTeamStats) -- no new fetch, just more of the payload read. All nullable: a team
-- missing from the standings response this run keeps whatever row it had --
-- writeTeamStats skips the upsert entirely (scripts/ingest-espn.mts) -- never a
-- partially-filled row.
create table team_stats (
  team_id text primary key references teams(id) on delete cascade,
  overall_wins int,
  overall_losses int,
  overall_ties int,
  win_percent numeric,
  home_wins int,
  home_losses int,
  road_wins int,
  road_losses int,
  division_wins int,
  division_losses int,
  conference_wins int,
  conference_losses int,
  points_for int,
  points_against int,
  point_differential int,
  streak text,
  playoff_seed int,
  updated_at timestamptz not null default now()
);

-- Match the explicit-grant pattern (20260701171029_grant_default_table_privileges.sql)
-- and the RLS-with-policy-in-the-same-migration pattern (20260710140000_base_table_rls
-- -- AGENTS.md invariant 10): dbRosterSource reads this table with the anon key, so it
-- ships both the grant and a read policy from the start, never a window where reads break.
grant select, insert, update, delete on team_stats to anon, authenticated, service_role;

alter table team_stats enable row level security;
create policy "public read" on team_stats for select to anon, authenticated using (true);
```

- [ ] **Step 2: Apply the migration locally**

Run: `supabase db reset`
Expected: output includes `Applying migration 20260712160000_add_team_stats.sql...` with no errors, ending in `Finished supabase db reset on branch main.`

- [ ] **Step 3: Regenerate database types**

Run: `npm run db:types`
Expected: `lib/database.types.ts` now contains a `team_stats` entry under `Tables` with the 17 columns above (verify with `grep -n "team_stats" lib/database.types.ts`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260712160000_add_team_stats.sql lib/database.types.ts
git commit -m "feat(supabase): add team_stats table"
```

---

### Task 2: `TeamStats` app type + remove `Team.coach`

**Files:**
- Modify: `lib/types.ts:104-118` (the `Team` interface)

**Interfaces:**
- Produces: `export interface TeamStats { overallWins: number; overallLosses: number; overallTies: number; winPercent: number; homeWins: number; homeLosses: number; roadWins: number; roadLosses: number; divisionWins: number; divisionLosses: number; conferenceWins: number; conferenceLosses: number; pointsFor: number; pointsAgainst: number; pointDifferential: number; streak: string; playoffSeed: number; }`. `Team` no longer has a `coach` field.

- [ ] **Step 1: Edit `lib/types.ts`**

Replace the `Team` interface (currently has the `coach?: { name: string; experience: number }` field added in depth#95) with:

```typescript
export interface Team {
  id: string;
  city: string;
  name: string;
  abbrev: string;
  conference: Conference;
  division: Division;
  colors: TeamColors;
  logo?: string;
  logoDark?: string;
}

// Season record + standings detail (Phase E stats page,
// docs/superpowers/specs/2026-07-12-team-stats-page-design.md). Sourced from the same
// ESPN standings fetch already used for conference/division (lib/espn/standings.ts
// parseTeamStats) -- one call, more of the payload read. A team missing from the
// standings response (bye-week gap, mid-season expansion) has no TeamStats rather than
// a partially-filled one (invariant 6).
export interface TeamStats {
  overallWins: number;
  overallLosses: number;
  overallTies: number;
  winPercent: number;
  homeWins: number;
  homeLosses: number;
  roadWins: number;
  roadLosses: number;
  divisionWins: number;
  divisionLosses: number;
  conferenceWins: number;
  conferenceLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  streak: string;
  playoffSeed: number;
}
```

- [ ] **Step 2: Verify the codebase still type-checks with the field removed**

Run: `npx tsc --noEmit`
Expected: errors in `lib/espn/transform.ts`, `lib/roster-source.db.ts`, `components/DepthChartField.tsx`, `app/team/[id]/page.tsx`, `lib/espn/seed-sql.ts` (all reference `.coach` on a `Team`) — this is expected; each is fixed in a later task. Confirm no error mentions a file *not* in that list — if one does, note it before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(teams): add TeamStats type, drop Team.coach (moves to stats page)"
```

---

### Task 3: `parseTeamStats` in `lib/espn/standings.ts` (TDD)

**Files:**
- Modify: `lib/espn/standings.ts`
- Modify: `lib/espn/standings.test.ts`

**Interfaces:**
- Consumes: `EspnStandings` (existing type in this file), `TeamStats` from `../types` (Task 2).
- Produces: `export function parseTeamStats(json: EspnStandings): Map<string, TeamStats>` — keyed by ESPN team id, same id space as `parseStandings`'s map.

- [ ] **Step 1: Write the failing tests**

Append to `lib/espn/standings.test.ts`:

```typescript
import { parseStandings, parseTeamStats } from './standings';

function statEntry(type: string, value: number | undefined, displayValue: string) {
  return { type, value, displayValue };
}

const STATS_FIXTURE = {
  children: [
    {
      name: 'American Football Conference',
      children: [
        {
          name: 'AFC East',
          standings: {
            entries: [
              {
                team: { id: '12' },
                stats: [
                  statEntry('wins', 14, '14'),
                  statEntry('losses', 3, '3'),
                  statEntry('ties', 0, '0'),
                  statEntry('winpercent', 0.8235294, '.824'),
                  statEntry('streak', 3, 'W3'),
                  statEntry('playoffseed', 2, '2'),
                  statEntry('pointsfor', 490, '490'),
                  statEntry('pointsagainst', 320, '320'),
                  statEntry('pointdifferential', 170, '+170'),
                  statEntry('total', undefined, '14-3'),
                  statEntry('home', undefined, '6-3'),
                  statEntry('road', undefined, '8-0'),
                  statEntry('vsdiv', undefined, '5-1'),
                  statEntry('vsconf', undefined, '9-3'),
                ],
              },
              {
                // No standings entry -> no team id at all, must not appear in the map.
                team: { id: '7' },
                // stats array missing entirely.
              },
              {
                team: { id: '9' },
                // Partial: missing 'road' -> the whole team must be skipped, not
                // half-filled.
                stats: [
                  statEntry('wins', 5, '5'),
                  statEntry('losses', 12, '12'),
                  statEntry('ties', 0, '0'),
                  statEntry('winpercent', 0.294, '.294'),
                  statEntry('streak', 1, 'L1'),
                  statEntry('playoffseed', 16, '16'),
                  statEntry('pointsfor', 280, '280'),
                  statEntry('pointsagainst', 400, '400'),
                  statEntry('pointdifferential', -120, '-120'),
                  statEntry('total', undefined, '5-12'),
                  statEntry('home', undefined, '3-5'),
                  statEntry('vsdiv', undefined, '2-4'),
                  statEntry('vsconf', undefined, '4-8'),
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('parseTeamStats', () => {
  it('parses a full standings entry into a TeamStats record', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.get('12')).toEqual({
      overallWins: 14,
      overallLosses: 3,
      overallTies: 0,
      winPercent: 0.8235294,
      homeWins: 6,
      homeLosses: 3,
      roadWins: 8,
      roadLosses: 0,
      divisionWins: 5,
      divisionLosses: 1,
      conferenceWins: 9,
      conferenceLosses: 3,
      pointsFor: 490,
      pointsAgainst: 320,
      pointDifferential: 170,
      streak: 'W3',
      playoffSeed: 2,
    });
  });

  it('skips a team with no stats array at all', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.has('7')).toBe(false);
  });

  it('skips a team with a partial stats array rather than storing a half-filled row', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.has('9')).toBe(false);
  });

  it('covers exactly the teams with a complete stats block', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.size).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/espn/standings.test.ts`
Expected: FAIL — `parseTeamStats is not a function` (it doesn't exist yet).

- [ ] **Step 3: Implement `parseTeamStats`**

In `lib/espn/standings.ts`, add the stat-entry shape to `StandingsEntry` and the new parser:

```typescript
import type { Conference, Division, TeamStats } from '../types';

// Minimal shape of ESPN's site standings endpoint (?level=3) — only what we read.
interface EspnStatEntry {
  type?: string;
  value?: number;
  displayValue?: string;
}
interface StandingsEntry {
  team?: { id?: string };
  stats?: EspnStatEntry[];
}
```

(This replaces the existing `StandingsEntry` interface — same name, adds the `stats` field.)

Then, after `parseStandings`, add:

```typescript
function statNum(stats: EspnStatEntry[], type: string): number | undefined {
  const s = stats.find((e) => e.type === type);
  return typeof s?.value === 'number' ? s.value : undefined;
}

function statStr(stats: EspnStatEntry[], type: string): string | undefined {
  return stats.find((e) => e.type === type)?.displayValue;
}

// ESPN's W-L record fields ("6-3") aren't split into wins/losses server-side.
function splitRecord(display: string | undefined): { wins: number; losses: number } | undefined {
  const m = display?.match(/^(\d+)-(\d+)$/);
  return m ? { wins: Number(m[1]), losses: Number(m[2]) } : undefined;
}

// Same standings fetch parseStandings reads, mapped to the fuller stat block instead of
// just conference/division. A team whose stats array is missing or partial (bye-week
// ingest gap, mid-season expansion) is left out of the map entirely -- never a
// half-filled TeamStats (invariant 6) -- so the caller's "no entry -> skip the upsert"
// logic (scripts/ingest-espn.mts) has a clean signal.
export function parseTeamStats(json: EspnStandings): Map<string, TeamStats> {
  const out = new Map<string, TeamStats>();
  for (const conf of kids(json.children)) {
    for (const div of kids(conf.children)) {
      for (const entry of div.standings?.entries ?? []) {
        const id = entry.team?.id;
        if (!id) continue;
        const stats = entry.stats ?? [];

        const wins = statNum(stats, 'wins');
        const losses = statNum(stats, 'losses');
        const ties = statNum(stats, 'ties');
        const winPercent = statNum(stats, 'winpercent');
        const pointsFor = statNum(stats, 'pointsfor');
        const pointsAgainst = statNum(stats, 'pointsagainst');
        const pointDifferential = statNum(stats, 'pointdifferential');
        const playoffSeed = statNum(stats, 'playoffseed');
        const streak = statStr(stats, 'streak');
        const home = splitRecord(statStr(stats, 'home'));
        const road = splitRecord(statStr(stats, 'road'));
        const division = splitRecord(statStr(stats, 'vsdiv'));
        const conference = splitRecord(statStr(stats, 'vsconf'));

        if (
          wins === undefined ||
          losses === undefined ||
          ties === undefined ||
          winPercent === undefined ||
          pointsFor === undefined ||
          pointsAgainst === undefined ||
          pointDifferential === undefined ||
          playoffSeed === undefined ||
          streak === undefined ||
          !home ||
          !road ||
          !division ||
          !conference
        ) {
          continue;
        }

        out.set(String(id), {
          overallWins: wins,
          overallLosses: losses,
          overallTies: ties,
          winPercent,
          homeWins: home.wins,
          homeLosses: home.losses,
          roadWins: road.wins,
          roadLosses: road.losses,
          divisionWins: division.wins,
          divisionLosses: division.losses,
          conferenceWins: conference.wins,
          conferenceLosses: conference.losses,
          pointsFor,
          pointsAgainst,
          pointDifferential,
          streak,
          playoffSeed,
        });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/espn/standings.test.ts`
Expected: PASS, all tests including the pre-existing `parseStandings` describe block.

- [ ] **Step 5: Commit**

```bash
git add lib/espn/standings.ts lib/espn/standings.test.ts
git commit -m "feat(espn): parse team season record from the standings payload"
```

---

### Task 4: Revert `toTeamRoster` coach attachment

**Files:**
- Modify: `lib/espn/transform.ts:19-33` (the `toCoach` function's return type) and `lib/espn/transform.ts:245-254` (`toTeamRoster`'s return)

**Interfaces:**
- Produces: `export interface Coach { name: string; espnId: string; experience: number }`, `export function toCoach(roster: EspnRoster): Coach | null` (same body as today, named return type). `toTeamRoster`'s returned `team` object no longer has a `coach` field.

- [ ] **Step 1: Name the `Coach` type and stop attaching it to `Team`**

In `lib/espn/transform.ts`, replace the `toCoach` function's signature:

```typescript
export interface Coach {
  name: string;
  espnId: string;
  experience: number;
}

// The site roster payload's top-level coach array has at most one entry (the head
// coach — ESPN doesn't expose the rest of the staff cheaply). Missing/empty array
// (expansion team, offseason gap) -> null, never a crash (invariant 6). Consumed
// directly by scripts/ingest-espn.mts for the teams.coach_* columns and by the team
// stats page (docs/superpowers/specs/2026-07-12-team-stats-page-design.md) — no
// longer threaded through Team/TeamRoster.
export function toCoach(roster: EspnRoster): Coach | null {
  const coach = roster.coach?.[0];
  if (!coach) return null;
  return {
    name: `${coach.firstName} ${coach.lastName}`,
    espnId: coach.id,
    experience: coach.experience,
  };
}
```

Then in `toTeamRoster`, remove the `coach` local and the `coach:` field:

```typescript
  const logos = teamInfo.logos ?? [];
  return {
    team: {
      ...meta,
      colors: toTeamColors(teamInfo),
      logo: logos[0]?.href,
      logoDark: logos.find((l) => l.rel?.includes('dark'))?.href ?? logos[1]?.href,
    },
```

(This deletes the `const coach = toCoach(roster);` line and the `coach: coach ? { ... } : undefined,` line added in depth#95 — `toTeamRoster` goes back to its pre-depth#95 shape exactly.)

- [ ] **Step 2: Run the transform tests**

Run: `npx vitest run lib/espn/transform.test.ts`
Expected: PASS — the existing `toCoach` describe block still passes unchanged (it tests `toCoach` directly, not through `toTeamRoster`); no test asserted `toTeamRoster(...).team.coach`.

- [ ] **Step 3: Commit**

```bash
git add lib/espn/transform.ts
git commit -m "refactor(espn): stop threading coach through toTeamRoster/Team"
```

---

### Task 5: `buildSeedSql` carries coach + stats (TDD)

**Files:**
- Modify: `lib/espn/seed-sql.ts`
- Modify: `lib/espn/seed-sql.test.ts`

**Interfaces:**
- Consumes: `Coach` from `./transform` (Task 4), `TeamStats` from `../types` (Task 2).
- Produces: `export function buildSeedSql(entries: { roster: TeamRoster; coach: Coach | null; stats: TeamStats | undefined }[]): string` (signature change from today's `buildSeedSql(rosters: TeamRoster[])`) — also emits a `team_stats` insert block.

- [ ] **Step 1: Write the failing tests**

Replace the `roster()` helper and `buildSeedSql` describe block in `lib/espn/seed-sql.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import { sqlValue, insertStatement, buildSeedSql } from './seed-sql';
import type { Coach } from './transform';
import type { TeamRoster, TeamStats, Player, SpecialSlot } from '../types';

// ... (keep the existing sqlValue and insertStatement describe blocks unchanged) ...

function player(over: Partial<Player>): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    number: 1,
    position: 'QB',
    depthRank: 1,
    order: 0,
    status: 'starter',
    age: 25,
    college: 'State',
    experience: 3,
    height: '6\'2"',
    weight: 220,
    bio: 'bio',
    photoUrl: null,
    ...over,
  } as Player;
}

function roster(over: Partial<TeamRoster> = {}): TeamRoster {
  const special: SpecialSlot = { id: 'kr', playerId: 'p1', x: 50, y: 50, label: 'KR' };
  return {
    team: {
      id: 'sea',
      abbrev: 'SEA',
      city: 'Seattle',
      name: 'Seahawks',
      conference: 'NFC',
      division: 'West',
      colors: {
        primary: '#001',
        secondary: '#69BE28',
        accent: '#A5A',
        uiAccent: '#69BE28',
        onAccent: '#000',
      },
      logo: null,
      logoDark: null,
    },
    players: [player({})],
    specialTeams: [special],
    ...over,
  } as TeamRoster;
}

function coach(over: Partial<Coach> = {}): Coach {
  return { name: 'Mike Macdonald', espnId: '5044374', experience: 2, ...over };
}

function stats(over: Partial<TeamStats> = {}): TeamStats {
  return {
    overallWins: 14,
    overallLosses: 3,
    overallTies: 0,
    winPercent: 0.824,
    homeWins: 6,
    homeLosses: 3,
    roadWins: 8,
    roadLosses: 0,
    divisionWins: 5,
    divisionLosses: 1,
    conferenceWins: 9,
    conferenceLosses: 3,
    pointsFor: 490,
    pointsAgainst: 320,
    pointDifferential: 170,
    streak: 'W3',
    playoffSeed: 2,
    ...over,
  };
}

describe('buildSeedSql', () => {
  it('emits teams, players, depth, special-teams, and team_stats inserts in FK order', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: stats() }]);
    const iTeams = sql.indexOf('insert into teams');
    const iPlayers = sql.indexOf('insert into players');
    const iDepth = sql.indexOf('insert into depth_chart_entries');
    const iSpecial = sql.indexOf('insert into special_teams_slots');
    const iStats = sql.indexOf('insert into team_stats');
    expect(iTeams).toBeGreaterThanOrEqual(0);
    expect(iTeams).toBeLessThan(iPlayers);
    expect(iPlayers).toBeLessThan(iDepth);
    expect(iDepth).toBeLessThan(iSpecial);
    expect(iSpecial).toBeLessThan(iStats);
  });

  it('writes coach_name/coach_experience onto the teams row', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: stats() }]);
    expect(sql).toContain("'Mike Macdonald'");
  });

  it('omits coach columns as null when coach is null', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: null, stats: stats() }]);
    const teamsBlock = sql.slice(sql.indexOf('insert into teams'), sql.indexOf('insert into players'));
    expect(teamsBlock).toContain('null');
  });

  it('skips the team_stats insert when stats is undefined', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: undefined }]);
    expect(sql).not.toContain('insert into team_stats');
  });

  it('prefixes special-teams slot ids with the team id', () => {
    expect(buildSeedSql([{ roster: roster(), coach: null, stats: undefined }])).toContain(
      "('sea-kr', 'sea'"
    );
  });

  it('does not emit updated_at (column default fills it, no diff churn)', () => {
    expect(buildSeedSql([{ roster: roster(), coach: null, stats: undefined }])).not.toContain(
      'updated_at'
    );
  });

  it('skips a table with no rows', () => {
    const sql = buildSeedSql([{ roster: roster({ specialTeams: [] }), coach: null, stats: undefined }]);
    expect(sql).not.toContain('insert into special_teams_slots');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/espn/seed-sql.test.ts`
Expected: FAIL — `buildSeedSql` still takes `TeamRoster[]`, so `roster.roster`/`roster.coach`/`roster.stats` are undefined and the assertions on coach/stats content fail (type error at compile time in Vitest's esbuild transform is also an acceptable failure mode here — either way, not a pass).

- [ ] **Step 3: Update `buildSeedSql`**

Replace the whole file's `buildSeedSql` function and its imports:

```typescript
// Serializes resolved TeamRosters into a Postgres seed script (supabase/seed.sql) so a
// local `supabase db reset` restores the ESPN-ingested data without re-running the live
// ingest (scripts/ingest-espn.mts SEED_OUT mode calls this). Column lists mirror
// writeTeam()/writeTeamStats() in that script — keep them in sync; this is the offline
// twin of those upserts. Every statement is `on conflict … do nothing`, so it composes
// with the migration-seeded teams/uniforms and is safe to re-run.
import { toDepthChartRows } from './transform';
import type { Coach } from './transform';
import type { TeamRoster, TeamStats } from '../types';

type Val = string | number | boolean | null | undefined;

// ... (sqlValue and insertStatement stay exactly as-is) ...

export interface SeedEntry {
  roster: TeamRoster;
  coach: Coach | null;
  stats: TeamStats | undefined;
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

    if (stats) {
      teamStats.push({
        team_id: team.id,
        overall_wins: stats.overallWins,
        overall_losses: stats.overallLosses,
        overall_ties: stats.overallTies,
        win_percent: stats.winPercent,
        home_wins: stats.homeWins,
        home_losses: stats.homeLosses,
        road_wins: stats.roadWins,
        road_losses: stats.roadLosses,
        division_wins: stats.divisionWins,
        division_losses: stats.divisionLosses,
        conference_wins: stats.conferenceWins,
        conference_losses: stats.conferenceLosses,
        points_for: stats.pointsFor,
        points_against: stats.pointsAgainst,
        point_differential: stats.pointDifferential,
        streak: stats.streak,
        playoff_seed: stats.playoffSeed,
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
      'id'
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
      'team_id'
    ),
  ];

  return parts.filter(Boolean).join('\n') + '\n';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/espn/seed-sql.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/espn/seed-sql.ts lib/espn/seed-sql.test.ts
git commit -m "feat(espn): seed script carries coach + team_stats (offline twin of ingest)"
```

---

### Task 6: Wire the ingest script

**Files:**
- Modify: `scripts/ingest-espn.mts`

**Interfaces:**
- Consumes: `parseTeamStats` (Task 3), `toCoach`/`Coach` (Task 4), `SeedEntry`/`buildSeedSql` (Task 5), `TeamStats` from `../lib/types`.
- Produces: `team_stats` rows written on every live ingest run; `writeTeam`'s signature changes to `writeTeam(supabase, roster: TeamRoster, coach: Coach | null): Promise<void>`.

- [ ] **Step 1: Update imports**

In `scripts/ingest-espn.mts`, change:

```typescript
import { toDepthChartRows, toTeamRoster } from '../lib/espn/transform';
import { buildSeedSql } from '../lib/espn/seed-sql';
import { parseStandings, type EspnStandings } from '../lib/espn/standings';
```

to:

```typescript
import { toCoach, toDepthChartRows, toTeamRoster, type Coach } from '../lib/espn/transform';
import { buildSeedSql, type SeedEntry } from '../lib/espn/seed-sql';
import { parseStandings, parseTeamStats, type EspnStandings } from '../lib/espn/standings';
```

And change the `TeamRoster` type import line to also pull in `TeamStats`:

```typescript
import type { TeamRoster, TeamStats } from '../lib/types';
```

- [ ] **Step 2: Fetch standings once, derive both maps**

Replace:

```typescript
  const startedAt = new Date().toISOString();
  const espnIndex = await espnTeamIndex();
  const divisions = parseStandings(await getJson<EspnStandings>(STANDINGS));
  const built: Record<string, TeamRoster> = {};
  const errors: { team: string; message: string }[] = [];
  let seasonYear: number | null = null;
```

with:

```typescript
  const startedAt = new Date().toISOString();
  const espnIndex = await espnTeamIndex();
  const standingsJson = await getJson<EspnStandings>(STANDINGS);
  const divisions = parseStandings(standingsJson);
  const teamStatsByEspnId = parseTeamStats(standingsJson);
  const built: Record<string, TeamRoster> = {};
  const coachByTeamId: Record<string, Coach | null> = {};
  const statsByTeamId: Record<string, TeamStats | undefined> = {};
  const errors: { team: string; message: string }[] = [];
  let seasonYear: number | null = null;
```

- [ ] **Step 3: Capture coach + stats per team during the fetch loop**

Replace:

```typescript
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
```

with:

```typescript
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
      statsByTeamId[meta.id] = teamStatsByEspnId.get(info.id);
      // eslint-disable-next-line no-console
      console.log(`fetched ${meta.id} (${roster2.players.length} players)`);
```

- [ ] **Step 4: Update the seed-mode branch to the new `buildSeedSql` signature**

Replace:

```typescript
  if (seedOut) {
    writeFileSync(seedOut, buildSeedSql(Object.values(built)));
```

with:

```typescript
  if (seedOut) {
    const entries: SeedEntry[] = Object.values(built).map((roster) => ({
      roster,
      coach: coachByTeamId[roster.team.id] ?? null,
      stats: statsByTeamId[roster.team.id],
    }));
    writeFileSync(seedOut, buildSeedSql(entries));
```

(the rest of that `if (seedOut)` block — the `console.log` and error-printing lines — is unchanged)

- [ ] **Step 5: Write team_stats in the live-write loop**

Replace:

```typescript
  let teamsWritten = 0;
  for (const roster of Object.values(built)) {
    try {
      await writeTeam(supabase, roster);
      teamsWritten++;
    } catch (e) {
      errors.push({ team: roster.team.id, message: `write failed: ${(e as Error).message}` });
    }
  }
```

with:

```typescript
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
```

- [ ] **Step 6: Update `writeTeam`'s signature and body**

Replace:

```typescript
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
      coach_name: team.coach?.name ?? null,
      coach_espn_id: null,
      coach_experience: team.coach?.experience ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (teamError) throw new Error(`teams upsert: ${teamError.message}`);
```

with:

```typescript
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
```

(everything else inside `writeTeam` — players/depth_chart_entries/special_teams_slots — is unchanged)

- [ ] **Step 7: Add `writeTeamStats`**

Immediately after the closing `}` of `writeTeam` (before `main().catch(...)`), add:

```typescript
// team_stats is 1:1 with teams (Phase E stats page,
// docs/superpowers/specs/2026-07-12-team-stats-page-design.md). `stats` is undefined
// when this team had no complete entry in this run's standings fetch (bye-week gap,
// mid-season expansion) -- skip the upsert entirely rather than write a partial row;
// whatever row already exists from a prior run is left untouched.
async function writeTeamStats(
  supabase: SupabaseClient<Database>,
  teamId: string,
  stats: TeamStats | undefined
): Promise<void> {
  if (!stats) return;
  const { error } = await supabase.from('team_stats').upsert(
    {
      team_id: teamId,
      overall_wins: stats.overallWins,
      overall_losses: stats.overallLosses,
      overall_ties: stats.overallTies,
      win_percent: stats.winPercent,
      home_wins: stats.homeWins,
      home_losses: stats.homeLosses,
      road_wins: stats.roadWins,
      road_losses: stats.roadLosses,
      division_wins: stats.divisionWins,
      division_losses: stats.divisionLosses,
      conference_wins: stats.conferenceWins,
      conference_losses: stats.conferenceLosses,
      points_for: stats.pointsFor,
      points_against: stats.pointsAgainst,
      point_differential: stats.pointDifferential,
      streak: stats.streak,
      playoff_seed: stats.playoffSeed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'team_id' }
  );
  if (error) throw new Error(`team_stats upsert: ${error.message}`);
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors originating from `scripts/ingest-espn.mts`.

- [ ] **Step 9: Commit**

```bash
git add scripts/ingest-espn.mts
git commit -m "feat(ingest): write team_stats alongside the existing coach columns"
```

---

### Task 7: `RosterSource.getTeamStats` interface

**Files:**
- Modify: `lib/roster-source.ts`

**Interfaces:**
- Consumes: `TeamStats` from `./types` (Task 2).
- Produces: `export interface TeamStatsPage { team: TeamMeta; coach?: { name: string; experience: number }; stats?: TeamStats }`, `RosterSource.getTeamStats(id: string): Promise<TeamStatsPage | undefined>`. (`coach` is an inline type, not a named `Coach` export — `lib/espn/transform.ts` already exports a *different* `Coach` shape (`{name, espnId, experience}`, Task 4); naming this one the same would collide in a reader's head even though no file imports both.)

- [ ] **Step 1: Edit the file**

```typescript
import type { Conference, Division, Team, TeamColors, TeamRoster, TeamStats, UniformKind } from './types';

// The single seam between the app and where roster data comes from. Routes and
// components depend on this interface, never on a registry directly. The only
// implementation is the Postgres-backed source (lib/roster-source.db.ts) — the app
// reads everything live from the DB, populated by scripts/ingest-espn.mts.

// Lightweight team metadata for listings (e.g. the team switcher) — no player data.
export type TeamMeta = Team;

// A single kit flattened with its team's identity, for the archive listing (Phase 7
// archive page). Lightweight — no player data — so shipping all of them to the archive
// route does not violate the "one team's roster per page" invariant (this is kit
// metadata, not rosters).
export interface UniformListing {
  teamId: string;
  teamName: string;
  conference: Conference;
  division: Division;
  id: string;
  kind: UniformKind;
  name: string;
  colors: TeamColors;
  yearStart: number | null;
  yearEnd: number | null;
  isCurrent: boolean;
  imagePath?: string;
}

// Everything the team stats page needs, composed in one read: team identity (for the
// header/theming), the head coach if ingested, and season-record stats if the last
// standings fetch had a complete entry for this team. `coach`/`stats` are independently
// optional — a team can have one, both, or neither. `coach` is an inline shape, not a
// named export — lib/espn/transform.ts's `Coach` (ingest-side, has `espnId`) is a
// different type; naming this one the same would collide in a reader's head.
export interface TeamStatsPage {
  team: TeamMeta;
  coach?: { name: string; experience: number };
  stats?: TeamStats;
}

export interface RosterSource {
  // All teams' metadata, for switchers and link generation. Stable order.
  listTeams(): Promise<TeamMeta[]>;
  // Full roster for one team, or undefined for an unknown id.
  getTeam(id: string): Promise<TeamRoster | undefined>;
  // Coach + season record for one team, or undefined for an unknown id.
  getTeamStats(id: string): Promise<TeamStatsPage | undefined>;
  // Every kit for every team (home + curated), flattened with team identity, for the
  // uniform archive. No player data. Dangling team refs are skipped.
  listUniforms(): Promise<UniformListing[]>;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: a new error in `lib/roster-source.db.ts` — `dbRosterSource` doesn't satisfy `RosterSource` because it's missing `getTeamStats`. This is expected; fixed in Task 8.

- [ ] **Step 3: Commit**

```bash
git add lib/roster-source.ts
git commit -m "feat(roster-source): add getTeamStats to the RosterSource seam"
```

---

### Task 8: Implement `getTeamStats` + drop coach from `toTeam`

**Files:**
- Modify: `lib/roster-source.db.ts`

**Interfaces:**
- Consumes: `TeamStatsPage`/`Coach` from `./roster-source` (Task 7), `TeamStats` from `./types` (Task 2).
- Produces: `dbRosterSource.getTeamStats(id): Promise<TeamStatsPage | undefined>`. `toTeam` no longer reads `coach_name`/`coach_experience`. New exported `TEAM_SELECT` constant (DRY — was duplicated inline in two places, now used a third time here).

- [ ] **Step 1: Extract a `TEAM_SELECT` constant and drop coach from `TeamRow`/`toTeam`**

Replace the `TeamRow` type and `toTeam` function:

```typescript
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
```

```typescript
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
```

- [ ] **Step 2: Use `TEAM_SELECT` in the two existing queries**

In `fetchTeamRoster`, replace the inline select string:

```typescript
    client
      .from('teams')
      .select(TEAM_SELECT)
      .eq('id', teamId)
      .maybeSingle<TeamRow>(),
```

In `fetchAllTeamMeta`, replace the inline select string:

```typescript
async function fetchAllTeamMeta(): Promise<TeamRow[]> {
  const client = supabase();
  const { data, error } = await client.from('teams').select(TEAM_SELECT).returns<TeamRow[]>();
  if (error) throw new Error(`teams query failed: ${error.message}`);
  return data ?? [];
}
```

- [ ] **Step 3: Add the `team_stats` row type + mapper**

Add near the other `type ...Row` declarations (after `UniformRow`/`UNIFORM_SELECT`):

```typescript
type TeamStatsRow = Pick<
  Tables['team_stats']['Row'],
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
  'overall_wins, overall_losses, overall_ties, win_percent, home_wins, home_losses, road_wins, road_losses, division_wins, division_losses, conference_wins, conference_losses, points_for, points_against, point_differential, streak, playoff_seed';

// A present team_stats row always came from a complete parseTeamStats result (invariant
// 6 — writeTeamStats skips the upsert on a partial entry), so every column should be
// non-null in practice; the `?? 0`/`?? ''` fallbacks only guard the nullable-by-schema
// type, not a real expected case.
function toTeamStats(row: TeamStatsRow): TeamStats {
  return {
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
```

- [ ] **Step 4: Add `fetchTeamStatsPage`**

Add after `fetchTeamRoster` (before `type PlayerSearchRow`):

```typescript
type TeamStatsPageTeamRow = TeamRow & {
  coach_name: string | null;
  coach_experience: number | null;
};
const TEAM_STATS_PAGE_TEAM_SELECT = `${TEAM_SELECT}, coach_name, coach_experience`;

async function fetchTeamStatsPage(teamId: string): Promise<TeamStatsPage | undefined> {
  const client = supabase();

  const [
    { data: teamRow, error: teamError },
    { data: statsRow, error: statsError },
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
      .maybeSingle<TeamStatsRow>(),
  ]);
  if (teamError) throw new Error(`teams query failed: ${teamError.message}`);
  if (statsError) throw new Error(`team_stats query failed: ${statsError.message}`);
  if (!teamRow) return undefined;

  return {
    team: toTeam(teamRow),
    coach: teamRow.coach_name
      ? { name: teamRow.coach_name, experience: teamRow.coach_experience ?? 0 }
      : undefined,
    stats: statsRow ? toTeamStats(statsRow) : undefined,
  };
}
```

Add the import for `TeamStatsPage`/`Coach` at the top of the file:

```typescript
import type { RosterSource, TeamMeta, TeamStatsPage, UniformListing } from './roster-source';
```

(replaces the existing `import type { RosterSource, TeamMeta, UniformListing } from './roster-source';`)

- [ ] **Step 5: Wire it into `dbRosterSource`**

In the `dbRosterSource` object literal, add the new method after `getTeam`:

```typescript
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
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0 — `dbRosterSource` now satisfies `RosterSource`.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all tests pass (this file has no colocated unit tests today — `lib/roster-source.db.ts` is exercised through the live-DB path in Task 12, matching how `getTeam`/`listTeams` are already tested).

- [ ] **Step 8: Commit**

```bash
git add lib/roster-source.db.ts
git commit -m "feat(roster-source): implement getTeamStats, drop coach from toTeam"
```

---

### Task 9: Field-view header — remove coach line, add stats button

**Files:**
- Modify: `components/DepthChartField.tsx:1-35` (imports), `components/DepthChartField.tsx:255-324` (header button row + coach line)

**Interfaces:**
- Consumes: `Link` from `next/link`, a bar-chart icon from `lucide-react`.
- Produces: header row gains a "Team stats" icon button linking to `/team/{team.id}/stats`; the coach `<p>` line and its `ordinal` import are removed.

- [ ] **Step 1: Update imports**

Remove the `ordinal` import (only used by the coach line being deleted):

```typescript
import { resolveUnit } from '@/lib/formations';
```

(delete the `import { ordinal } from '@/lib/format';` line that follows it)

Add `Link` and the stats icon to the existing import block:

```typescript
import Link from 'next/link';
```

(add this near the other top-level imports, e.g. right after the `'use client';` / before `readableTextOn`)

Change the lucide-react import line:

```typescript
import { BarChart2, Check, ChevronDown, RotateCcw, Search, Share2, Shirt } from 'lucide-react';
```

- [ ] **Step 2: Remove the coach line**

Delete this block (currently right after the header row's closing `</div>`):

```typescript
        {/* Head coach line, muted so it doesn't compete with the team-name pill above.
            Absent entirely when the team has no ingested coach (spec: docs/superpowers/
            specs/2026-07-07-phase-e-coaches-design.md). */}
        {team.coach && (
          <p className="text-[10px] mt-1 truncate" style={{ color: '#A5ACAF' }}>
            HC {team.coach.name} · {ordinal(team.coach.experience)} season
          </p>
        )}
```

- [ ] **Step 3: Add the stats icon button**

Insert a new button right after the existing search button (`<Search size={14} .../></button>`'s closing tag) and before the `{showUniformPicker && (...)}` block:

```typescript
            <Link
              href={`/team/${team.id}/stats`}
              aria-label="Team stats"
              className="shrink-0 flex items-center justify-center rounded-full p-2"
              style={{
                touchAction: 'manipulation',
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${activeColors.uiAccent}40`,
              }}>
              <BarChart2 size={14} color={activeColors.uiAccent} />
            </Link>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add components/DepthChartField.tsx
git commit -m "feat(field): replace header coach line with a stats page link"
```

---

### Task 10: Revert `generateMetadata`'s coach sentence

**Files:**
- Modify: `app/team/[id]/page.tsx`

**Interfaces:**
- Produces: `generateMetadata`'s `description` back to its pre-depth#95 text (no coach sentence, no `ordinal` import).

- [ ] **Step 1: Edit the file**

Replace:

```typescript
import { dbRosterSource } from '@/lib/roster-source.db';
import { showUniformPicker } from '@/lib/flags';
import { ordinal } from '@/lib/format';
```

with:

```typescript
import { dbRosterSource } from '@/lib/roster-source.db';
import { showUniformPicker } from '@/lib/flags';
```

Replace:

```typescript
  const { team } = roster;
  const fullName = `${team.city} ${team.name}`;
  const coachLine = team.coach
    ? ` HC ${team.coach.name} · ${ordinal(team.coach.experience)} season.`
    : '';
  return {
    title: `${fullName} Depth Chart · Depth`,
    description: `Interactive depth chart for the ${fullName} — tap any player for their bio and stats.${coachLine}`,
```

with:

```typescript
  const { team } = roster;
  const fullName = `${team.city} ${team.name}`;
  return {
    title: `${fullName} Depth Chart · Depth`,
    description: `Interactive depth chart for the ${fullName} — tap any player for their bio and stats.`,
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/team/[id]/page.tsx
git commit -m "revert(teams): drop coach sentence from team page metadata"
```

---

### Task 11: The `/team/[id]/stats` route

**Files:**
- Create: `app/team/[id]/stats/page.tsx`

**Interfaces:**
- Consumes: `dbRosterSource.getTeamStats` (Task 8), `ordinal` from `@/lib/format`.
- Produces: a prerendered page per team at `/team/{id}/stats`.

- [ ] **Step 1: Write the page**

```typescript
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { dbRosterSource } from '@/lib/roster-source.db';
import { ordinal } from '@/lib/format';

type Params = { params: Promise<{ id: string }> };

// Prerender one static page per team, same shape as app/team/[id]/page.tsx.
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const page = await dbRosterSource.getTeamStats(id);
  if (!page) {
    return { title: 'Team not found · Depth' };
  }
  const fullName = `${page.team.city} ${page.team.name}`;
  return {
    title: `${fullName} Stats · Depth`,
    description: `Season record and coaching staff for the ${fullName}.`,
    alternates: { canonical: `/team/${id}/stats` },
  };
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide" style={{ color: '#7d848c' }}>
        {label}
      </dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

export default async function TeamStatsPage({ params }: Params) {
  const { id } = await params;
  const page = await dbRosterSource.getTeamStats(id);
  if (!page) {
    notFound();
  }
  const { team, coach, stats } = page;

  return (
    <div
      className="px-5 py-6"
      style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#fff' }}>
      <Link
        href={`/team/${id}`}
        className="inline-flex items-center gap-1.5 mb-6"
        style={{ color: team.colors.uiAccent }}>
        <ArrowLeft size={16} />
        <span className="text-sm font-semibold">
          {team.city} {team.name}
        </span>
      </Link>

      {coach && (
        <p className="text-sm mb-6" style={{ color: '#A5ACAF' }}>
          HC {coach.name} · {ordinal(coach.experience)} season
        </p>
      )}

      {stats && (
        <>
          <div className="mb-6">
            <p className="text-3xl font-bold" style={{ color: team.colors.uiAccent }}>
              {stats.overallWins}-{stats.overallLosses}
              {stats.overallTies ? `-${stats.overallTies}` : ''}
            </p>
            <p className="text-xs" style={{ color: '#A5ACAF' }}>
              {stats.streak}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <StatRow label="Home" value={`${stats.homeWins}-${stats.homeLosses}`} />
            <StatRow label="Road" value={`${stats.roadWins}-${stats.roadLosses}`} />
            <StatRow label="Division" value={`${stats.divisionWins}-${stats.divisionLosses}`} />
            <StatRow
              label="Conference"
              value={`${stats.conferenceWins}-${stats.conferenceLosses}`}
            />
            <StatRow label="Points for" value={String(stats.pointsFor)} />
            <StatRow label="Points against" value={String(stats.pointsAgainst)} />
            <StatRow
              label="Point differential"
              value={stats.pointDifferential > 0 ? `+${stats.pointDifferential}` : String(stats.pointDifferential)}
            />
            <StatRow label="Playoff seed" value={String(stats.playoffSeed)} />
          </dl>
        </>
      )}

      {!coach && !stats && (
        <p className="text-sm" style={{ color: '#A5ACAF' }}>
          No stats available for this team yet.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/team/[id]/stats/page.tsx
git commit -m "feat(teams): add /team/[id]/stats page"
```

---

### Task 12: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Format**

Run: `npm run format`
Expected: reformats any files touched across Tasks 1–11 that drifted from Prettier defaults; re-stage anything it changes.

- [ ] **Step 2: Format check**

Run: `npm run format:check`
Expected: `All matched files use Prettier code style!`

- [ ] **Step 3: Full type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Full test suite**

Run: `npm test`
Expected: all tests pass, including the new `parseTeamStats` and `buildSeedSql` tests from Tasks 3 and 5.

- [ ] **Step 5: Live ingest verification**

Run: `npm run ingest:espn` (requires local Supabase running — `supabase start` — and `.env.local` with `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, already configured in this repo)
Expected: `Wrote 32 teams. Status: success` (or `partial` with only pre-existing, unrelated ESPN-side skips — compare against the depth#95 run's output). Then confirm the write:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -c "select team_id, overall_wins, overall_losses, streak, playoff_seed from team_stats where team_id = 'seahawks';"
```

Expected: one row with real numbers (not null).

- [ ] **Step 6: Browser verification — field view header**

Start the dev server, open `/team/seahawks` at a 390px viewport. Confirm:
- No coach line under the team-switcher pill.
- A new stats icon button sits in the header icon row alongside search/share (and kit, if the uniform-picker flag is on) — 44px+ tap target, doesn't crowd neighboring buttons.
- Tapping it navigates to `/team/seahawks/stats`.

- [ ] **Step 7: Browser verification — stats page**

On `/team/seahawks/stats` at 390px, confirm:
- Back link to `/team/seahawks` works.
- Coach line renders (`HC Mike Macdonald · 2nd season` or current data).
- Overall record + streak render prominently.
- The 2-column stat grid (home/road/division/conference/PF/PA/diff/seed) renders without overflow or wrap at 390px.

- [ ] **Step 8: Update the PR**

The `feat/team-coach` branch (depth#95) already has the coach-ingest commits plus the coaches-page-pivot spec commit. Push these new commits to the same branch:

```bash
git push origin feat/team-coach
```

Update the PR title/body to reflect the pivot (coach moved off the field view onto a new stats page) — edit via:

```bash
gh pr edit 95 --title "feat(teams): coach + season record on a new team stats page" --body "$(cat <<'EOF'
## What
Ingests season record (win-loss, streak, home/road/div/conf splits, PF/PA, playoff
seed) from the standings payload already fetched for conference/division, into a new
`team_stats` table. Adds `/team/[id]/stats` showing that plus the head coach (ingested
in an earlier commit on this branch). The field-view header no longer shows a coach
line — a new stats icon button links to the page instead.

## Why
The original coach-header-line placement (this branch's first commits) didn't read as
grouped with the team-switcher pill in review — three repositioning variants were
mocked and none earned their spot on the primary field view. Moved to a dedicated page,
which also gives the season record somewhere to live.

## Tests
- `parseTeamStats` (lib/espn/standings.test.ts): full entry, missing stats array,
  partial stats array.
- `buildSeedSql` (lib/espn/seed-sql.test.ts): FK order including team_stats, coach
  columns, stats-undefined skip.
- Full suite green, `tsc --noEmit` clean, `format:check` clean.
- Verified live: `npm run ingest:espn` against local Postgres — `team_stats` row for
  seahawks has real wins/losses/streak/playoff_seed. Browser-checked at 390px: field
  header has no coach line and a working stats button; `/team/seahawks/stats` renders
  coach + record + stat grid without overflow.

Spec: `docs/superpowers/specs/2026-07-12-team-stats-page-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 9: Watch CI**

Run: `gh pr checks 95 --watch`
Expected: all checks green.
