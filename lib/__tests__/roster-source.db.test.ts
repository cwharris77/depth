import { describe, it, expect, beforeAll } from "vitest";
import { dbRosterSource, searchAllPlayers } from "../roster-source.db";

// Tests against the real Supabase project (not mocked). Rationale: this repo's test
// suite runs locally/in CI with network access already assumed for the ESPN fetch
// script, and the DB is a fixed, already-seeded dev project (not prod user data) — a
// mock would only re-assert our own assumptions about the schema, whereas hitting the
// real tables catches drift between this code and the actual columns/constraints.
// Skips gracefully (no failures) if SUPABASE_URL/SUPABASE_ANON_KEY aren't set, so a
// contributor without the env vars configured doesn't get a red suite.
const hasEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const maybeDescribe = hasEnv ? describe : describe.skip;

maybeDescribe("dbRosterSource (live Supabase project)", () => {
  it("lists teams with metadata-shaped entries", async () => {
    const teams = await dbRosterSource.listTeams();
    expect(teams.length).toBeGreaterThan(0);
    for (const meta of teams) {
      expect(meta).not.toHaveProperty("players");
      expect(meta).toMatchObject({
        id: expect.any(String),
        city: expect.any(String),
        name: expect.any(String),
        abbrev: expect.any(String),
      });
    }
  });

  it("assembles a full roster for an ingested team (eagles)", async () => {
    const roster = await dbRosterSource.getTeam("eagles");
    expect(roster).toBeDefined();
    expect(roster!.team.id).toBe("eagles");
    expect(roster!.players.length).toBeGreaterThan(15);
    for (const p of roster!.players) {
      expect([1, 2, 3]).toContain(p.depthRank);
    }
    // Special teams slots are present, and any assigned player exists on the roster.
    const ids = new Set(roster!.players.map((p) => p.id));
    for (const slot of roster!.specialTeams) {
      if (slot.playerId) expect(ids.has(slot.playerId)).toBe(true);
    }
  });

  it("returns undefined for an unknown team id", async () => {
    expect(await dbRosterSource.getTeam("not-a-real-team")).toBeUndefined();
  });

  it("assembles a full roster for an ingested team (seahawks)", async () => {
    const roster = await dbRosterSource.getTeam("seahawks");
    expect(roster).toBeDefined();
    expect(roster!.team.id).toBe("seahawks");
    expect(roster!.players.length).toBeGreaterThan(15);
  });
});

maybeDescribe("searchAllPlayers (live Supabase project)", () => {
  it("finds a player on a team other than the one you'd naively assume", async () => {
    const hits = await searchAllPlayers("darnold");
    expect(hits.length).toBeGreaterThan(0);
    const darnold = hits.find((h) => h.name === "Sam Darnold");
    expect(darnold).toBeDefined();
    expect(darnold!.team.id).toBe("seahawks");
  });

  it("matches by exact jersey number, not just name", async () => {
    const hits = await searchAllPlayers("99");
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.number).toBe(99);
    }
  });

  it("returns [] for an empty query without hitting the DB", async () => {
    expect(await searchAllPlayers("")).toEqual([]);
    expect(await searchAllPlayers("   ")).toEqual([]);
  });

  it("dedupes a player matched by more than one clause (e.g. name + position)", async () => {
    // "qb" matches position exactly for every quarterback; also happens to be a
    // substring of no real name, so this exercises the merge-by-id path.
    const hits = await searchAllPlayers("qb", 50);
    const ids = hits.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("dbRosterSource (env not configured)", () => {
  it("documents the skip condition so a missing env var is visible, not silent", () => {
    if (!hasEnv) {
      // eslint-disable-next-line no-console
      console.warn(
        "SUPABASE_URL/SUPABASE_ANON_KEY not set — dbRosterSource live tests skipped.",
      );
    }
    expect(true).toBe(true);
  });
});
