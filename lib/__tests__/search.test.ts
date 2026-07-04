import { describe, it, expect } from "vitest";
import { rankByNameMatch, searchPlayers, unitForPosition } from "../search";
import { TEAMS, DEFAULT_TEAM_ID } from "../teams";
import type { Player, Position, TeamRosterSeed } from "../types";

const roster: TeamRosterSeed = TEAMS[DEFAULT_TEAM_ID];

function p(
  id: string,
  name: string,
  position: Position,
  number: number,
  college = "",
): Player {
  return {
    id, name, number, position, depthRank: 1, status: "starter",
    age: 25, college, experience: 1, height: "6'0\"", weight: 200, bio: "",
  };
}
function rosterWith(players: Player[]): TeamRosterSeed {
  return { ...roster, players };
}

describe("unitForPosition", () => {
  it("maps offense, defense, and special positions", () => {
    expect(unitForPosition("QB")).toBe("offense");
    expect(unitForPosition("WR")).toBe("offense");
    expect(unitForPosition("RT")).toBe("offense");
    expect(unitForPosition("CB")).toBe("defense");
    expect(unitForPosition("S")).toBe("defense");
    expect(unitForPosition("DE")).toBe("defense");
    expect(unitForPosition("K")).toBe("special");
    expect(unitForPosition("P")).toBe("special");
  });
});

describe("searchPlayers", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(searchPlayers(roster, "")).toEqual([]);
    expect(searchPlayers(roster, "   ")).toEqual([]);
  });

  it("matches a name substring, case-insensitively", () => {
    const r = rosterWith([
      p("a", "Geno Smith", "QB", 7),
      p("b", "Jaxon Smith-Njigba", "WR", 11),
      p("c", "DK Metcalf", "WR", 14),
    ]);
    expect(searchPlayers(r, "smith").map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("ranks name-prefix matches ahead of mid-string matches", () => {
    const r = rosterWith([
      p("njigba", "Jaxon Smith-Njigba", "WR", 11),
      p("geno", "Geno Smith", "QB", 7),
    ]);
    // query "geno" prefixes "Geno Smith" -> it comes first
    expect(searchPlayers(r, "geno")[0].id).toBe("geno");
  });

  it("matches an exact jersey number", () => {
    const r = rosterWith([p("a", "Geno Smith", "QB", 7), p("b", "DK Metcalf", "WR", 14)]);
    expect(searchPlayers(r, "7").map((x) => x.id)).toEqual(["a"]);
  });

  it("matches a college substring, case-insensitively", () => {
    const r = rosterWith([
      p("a", "Geno Smith", "QB", 7, "West Virginia"),
      p("b", "Jaxon Smith-Njigba", "WR", 11, "Ohio State"),
      p("c", "Nick Chubb", "RB", 24, "Georgia"),
      p("d", "Roquan Smith", "LB", 0, "Georgia"),
    ]);
    expect(searchPlayers(r, "georgia").map((x) => x.id).sort()).toEqual(["c", "d"]);
    expect(searchPlayers(r, "OHIO").map((x) => x.id)).toEqual(["b"]);
  });

  it("matches an exact position code", () => {
    const r = rosterWith([
      p("a", "Geno Smith", "QB", 7),
      p("b", "Sam Howell", "QB", 19),
      p("c", "DK Metcalf", "WR", 14),
    ]);
    expect(searchPlayers(r, "qb").map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("respects the result limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => p(`p${i}`, `Player ${i}`, "WR", i));
    expect(searchPlayers(rosterWith(many), "player", 5)).toHaveLength(5);
  });

  it("finds a real Seahawks player by name", () => {
    const hits = searchPlayers(roster, "geno");
    expect(hits.some((x) => x.name.includes("Geno"))).toBe(true);
  });
});

describe("rankByNameMatch", () => {
  // Shared by searchPlayers above and searchAllPlayers (lib/roster-source.db.ts),
  // which merges several separately-filtered DB queries and needs this same
  // prefix-first-then-alphabetical ordering applied after the merge.
  it("ranks prefix matches ahead of mid-string matches, then alphabetically", () => {
    const hits = [{ name: "Jaxon Smith-Njigba" }, { name: "Smith Jones" }, { name: "Adam Smith" }];
    expect(rankByNameMatch(hits, "smith").map((h) => h.name)).toEqual([
      "Smith Jones",
      "Adam Smith",
      "Jaxon Smith-Njigba",
    ]);
  });

  it("does not mutate the input array", () => {
    const hits = [{ name: "B" }, { name: "A" }];
    rankByNameMatch(hits, "");
    expect(hits.map((h) => h.name)).toEqual(["B", "A"]);
  });
});
