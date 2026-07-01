import { describe, it, expect } from "vitest";
import { staticRosterSource } from "../roster-source";
import { TEAMS, DEFAULT_TEAM_ID } from "../teams";

describe("staticRosterSource", () => {
  it("lists every team in the registry", async () => {
    const teams = await staticRosterSource.listTeams();
    const ids = teams.map((t) => t.id);
    expect(new Set(ids)).toEqual(new Set(Object.keys(TEAMS)));
  });

  it("returns teams in a stable, sorted order", async () => {
    const teams = await staticRosterSource.listTeams();
    const ids = teams.map((t) => t.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("every listed team resolves to a full roster", async () => {
    const teams = await staticRosterSource.listTeams();
    for (const meta of teams) {
      const roster = await staticRosterSource.getTeam(meta.id);
      expect(roster, `roster for ${meta.id}`).toBeDefined();
      expect(roster!.team.id).toBe(meta.id);
      expect(roster!.players.length).toBeGreaterThan(0);
    }
  });

  it("listTeams exposes only metadata-shaped teams (no players field)", async () => {
    const teams = await staticRosterSource.listTeams();
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

  it("getTeam returns undefined for an unknown id (drives the route 404)", async () => {
    expect(await staticRosterSource.getTeam("not-a-team")).toBeUndefined();
  });

  it("the default team id resolves", async () => {
    expect(await staticRosterSource.getTeam(DEFAULT_TEAM_ID)).toBeDefined();
  });
});
