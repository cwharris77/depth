import { describe, it, expect, beforeAll } from "vitest";
import { dbRosterSource } from "../roster-source.db";

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
