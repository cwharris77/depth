import { describe, it, expect } from "vitest";
import roster from "./fixtures/roster-sea.json";
import depthcharts from "./fixtures/depthchart-sea.json";
import { parseAthleteId, toTeamColors, toTeamRoster } from "./transform";
import type { EspnRoster, EspnDepthcharts, EspnTeamInfo } from "./types";
import type { Team, TeamColors } from "../types";

const CURATED: TeamColors = {
  primary: "#001",
  secondary: "#002",
  accent: "#003",
  uiAccent: "#4CC3FF",
  onAccent: "#0a0e1a",
};
const META: Team = {
  id: "seahawks",
  city: "Seattle",
  name: "Seahawks",
  abbrev: "SEA",
  conference: "NFC",
  division: "West",
  colors: CURATED,
};
const TEAM_INFO: EspnTeamInfo = {
  id: "26",
  abbreviation: "SEA",
  color: "002a5c",
  alternateColor: "69be28",
  logos: [{ href: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png" }],
};

describe("parseAthleteId", () => {
  it("extracts the id from a $ref", () => {
    expect(
      parseAthleteId(
        "http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/2473037?lang=en",
      ),
    ).toBe("2473037");
  });
  it("returns null for a junk ref", () => {
    expect(parseAthleteId("not-a-url")).toBeNull();
  });
});

describe("toTeamColors", () => {
  it("uses ESPN brand colors but keeps curated UI contrast colors", () => {
    const c = toTeamColors(TEAM_INFO, CURATED);
    expect(c.primary.toLowerCase()).toBe("#002a5c");
    expect(c.secondary.toLowerCase()).toBe("#69be28");
    expect(c.uiAccent).toBe("#4CC3FF");
    expect(c.onAccent).toBe("#0a0e1a");
  });
});

describe("toTeamRoster", () => {
  const result = toTeamRoster({
    meta: META,
    roster: roster as unknown as EspnRoster,
    depthcharts: depthcharts as unknown as EspnDepthcharts,
    teamInfo: TEAM_INFO,
  });

  it("carries team metadata + merged logo", () => {
    expect(result.team.id).toBe("seahawks");
    expect(result.team.logo).toContain("espncdn.com");
  });
  it("produces players with valid positions and depthRank 1-3", () => {
    expect(result.players.length).toBeGreaterThan(20);
    for (const p of result.players) {
      expect([1, 2, 3]).toContain(p.depthRank);
      expect(p.name).toBeTruthy();
      expect(p.photoUrl).toContain("espncdn.com");
    }
  });
  it("has a QB1 and at least two WRs", () => {
    expect(result.players.some((p) => p.position === "QB" && p.depthRank === 1)).toBe(true);
    expect(result.players.filter((p) => p.position === "WR").length).toBeGreaterThanOrEqual(2);
  });
  it("fills special-teams returners from the ST depthchart", () => {
    const kr = result.specialTeams.find((s) => s.label === "KR");
    expect(kr).toBeDefined();
    expect(kr!.playerId).toBeTruthy();
  });
  it("never references a special player id that isn't in the roster", () => {
    const ids = new Set(result.players.map((p) => p.id));
    for (const slot of result.specialTeams) {
      if (slot.playerId) expect(ids.has(slot.playerId)).toBe(true);
    }
  });
});
