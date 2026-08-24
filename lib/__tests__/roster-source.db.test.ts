import { describe, it, expect } from 'vitest';
import {
  dbRosterSource,
  getPlayerStats,
  getTeamSeason,
  searchAllPlayers,
} from '@/lib/roster-source.db';

// Tests against the real Supabase project (not mocked). Rationale: this repo's test
// suite runs locally/in CI with network access already assumed for the ESPN fetch
// script, and the DB is a fixed, already-seeded dev project (not prod user data) — a
// mock would only re-assert our own assumptions about the schema, whereas hitting the
// real tables catches drift between this code and the actual columns/constraints.
// Skips gracefully (no failures) if the Supabase env vars aren't set, so a
// contributor without the env vars configured doesn't get a red suite.
const hasEnv = Boolean(
  (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
);
const maybeDescribe = hasEnv ? describe : describe.skip;

maybeDescribe('dbRosterSource (live Supabase project)', () => {
  it('lists teams with metadata-shaped entries', async () => {
    const teams = await dbRosterSource.listTeams();
    expect(teams.length).toBeGreaterThan(0);
    for (const meta of teams) {
      expect(meta).not.toHaveProperty('players');
      expect(meta).toMatchObject({
        id: expect.any(String),
        city: expect.any(String),
        name: expect.any(String),
        abbrev: expect.any(String),
      });
    }
  });

  it('assembles a full roster for an ingested team (eagles)', async () => {
    const roster = await dbRosterSource.getTeam('eagles');
    if (!roster) throw new Error('expected a roster for eagles');
    expect(roster.team.id).toBe('eagles');
    expect(roster.players.length).toBeGreaterThan(15);
    for (const p of roster.players) {
      expect([1, 2, 3]).toContain(p.depthRank);
    }
    // Special teams slots are present, and any assigned player exists on the roster.
    const ids = new Set(roster.players.map((p) => p.id));
    for (const slot of roster.specialTeams) {
      if (slot.playerId) expect(ids.has(slot.playerId)).toBe(true);
    }
  });

  it('returns undefined for an unknown team id', async () => {
    expect(await dbRosterSource.getTeam('not-a-real-team')).toBeUndefined();
  });

  it('returns a bounded participation summary when snap data is seeded', async () => {
    const summary = await dbRosterSource.recentParticipation('chiefs');
    if (!summary) return;
    expect(summary.teamId).toBe('chiefs');
    expect(summary.gameIds.length).toBeGreaterThanOrEqual(1);
    expect(summary.gameIds.length).toBeLessThanOrEqual(3);
    expect(summary.players.length).toBeGreaterThan(0);
    expect(summary.source).toBe('nflverse / Pro Football Reference');
  });

  it('assembles a full roster for an ingested team (seahawks)', async () => {
    const roster = await dbRosterSource.getTeam('seahawks');
    if (!roster) throw new Error('expected a roster for seahawks');
    expect(roster.team.id).toBe('seahawks');
    expect(roster.players.length).toBeGreaterThan(15);
  });

  it('lists every kit flattened with team identity', async () => {
    const kits = await dbRosterSource.listUniforms();
    expect(kits.length).toBeGreaterThan(72); // 72 curated + 32 home
    const creamsicle = kits.find((k) => k.id === 'buccaneers-creamsicle-1976');
    expect(creamsicle).toBeDefined();
    expect(creamsicle).toMatchObject({
      teamId: 'buccaneers',
      teamName: 'Tampa Bay Buccaneers',
      conference: 'NFC',
      division: 'South',
      kind: 'throwback',
    });
    expect(kits.some((k) => k.kind === 'home')).toBe(true);
  });
});

maybeDescribe('getTeamSeason (live Supabase project, Phase D1)', () => {
  it('assembles a read-only 2013 Seahawks roster with Russell Wilson at QB1', async () => {
    const roster = await getTeamSeason('seahawks', 2013);
    if (!roster) throw new Error('expected a 2013 Seahawks roster');
    expect(roster.team.id).toBe('seahawks');
    const qb1 = roster.players.find((p) => p.position === 'QB' && p.depthRank === 1);
    if (!qb1) throw new Error('expected a QB1');
    expect(qb1.name).toBe('Russell Wilson');
    expect(qb1.status).toBe('starter');
    // Historical player ids are the gsis:<id>@<season> typed-ref format (D2 shares it).
    expect(qb1.id).toMatch(/^gsis:.+@2013$/);
  });

  it('returns undefined for an unknown team or an out-of-range season', async () => {
    expect(await getTeamSeason('not-a-real-team', 2013)).toBeUndefined();
    expect(await getTeamSeason('seahawks', 1950)).toBeUndefined();
  });

  it('resolves stats for a historical (gsis:<id>@<season>) player id via roster_history.espn_id', async () => {
    const roster = await getTeamSeason('seahawks', 2024);
    if (!roster) throw new Error('expected a 2024 Seahawks roster');
    const withStats = roster.players.find((p) => p.name === 'Geno Smith');
    if (!withStats) throw new Error('expected Geno Smith on the 2024 roster');
    expect(withStats.id).toMatch(/^gsis:.+@2024$/);
    const stats = await getPlayerStats(withStats.id);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats.some((s) => s.season === 2024)).toBe(true);
  });

  it('returns [] for a historical player id with no ESPN crosswalk match', async () => {
    expect(await getPlayerStats('gsis:00-not-a-real-gsis-id@2024')).toEqual([]);
  });
});

maybeDescribe('searchAllPlayers (live Supabase project)', () => {
  it("finds a player on a team other than the one you'd naively assume", async () => {
    const hits = await searchAllPlayers('darnold');
    expect(hits.length).toBeGreaterThan(0);
    const darnold = hits.find((h) => h.name === 'Sam Darnold');
    if (!darnold) throw new Error('expected to find Sam Darnold');
    expect(darnold.team.id).toBe('seahawks');
  });

  it('matches by exact jersey number, not just name', async () => {
    const hits = await searchAllPlayers('99');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.number).toBe(99);
    }
  });

  it('returns [] for an empty query without hitting the DB', async () => {
    expect(await searchAllPlayers('')).toEqual([]);
    expect(await searchAllPlayers('   ')).toEqual([]);
  });

  it('dedupes a player matched by more than one clause (e.g. name + position)', async () => {
    // "qb" matches position exactly for every quarterback; also happens to be a
    // substring of no real name, so this exercises the merge-by-id path.
    const hits = await searchAllPlayers('qb', 50);
    const ids = hits.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('dbRosterSource (env not configured)', () => {
  it('documents the skip condition so a missing env var is visible, not silent', () => {
    if (!hasEnv) {
      console.warn('Supabase env vars not set — dbRosterSource live tests skipped.');
    }
    expect(true).toBe(true);
  });
});
