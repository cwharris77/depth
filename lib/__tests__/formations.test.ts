import { describe, it, expect } from "vitest";
import {
  OFFENSE_FORMATION,
  DEFENSE_FORMATION,
  LINE_OF_SCRIMMAGE,
  FIELD_SCALE,
  YARDS_PER_LINE,
  yardLineYs,
  resolveUnit,
} from "../formations";
import { getPlayersByPosition, TEAMS } from "../teams";
import type { Player, TeamRoster } from "../types";

// Minimal roster factory — only the fields the resolver touches.
function player(p: Partial<Player> & Pick<Player, "id" | "position" | "depthRank" | "number">): Player {
  return {
    name: p.id,
    status: "starter",
    age: 25,
    college: "",
    experience: 1,
    height: "6'0\"",
    weight: 200,
    bio: "",
    ...p,
  } as Player;
}

function roster(players: Player[], specialTeams: TeamRoster["specialTeams"] = []): TeamRoster {
  return {
    team: {
      id: "t",
      city: "Test",
      name: "Team",
      abbrev: "TST",
      conference: "NFC",
      division: "West",
      colors: { primary: "#000", secondary: "#fff", accent: "#888", uiAccent: "#fff", onAccent: "#000" },
    },
    players,
    specialTeams,
    uniforms: [],
  };
}

describe("getPlayersByPosition — deterministic order", () => {
  it("sorts by depthRank, then jersey number as a stable tiebreak", () => {
    // Three WR1s in scrambled input order and number order.
    const r = roster([
      player({ id: "c", position: "WR", depthRank: 1, number: 16 }),
      player({ id: "a", position: "WR", depthRank: 1, number: 11 }),
      player({ id: "b", position: "WR", depthRank: 1, number: 14 }),
      player({ id: "d", position: "WR", depthRank: 2, number: 80 }),
    ]);
    expect(getPlayersByPosition(r, "WR").map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("is stable regardless of input array order", () => {
    const a = player({ id: "a", position: "QB", depthRank: 1, number: 7 });
    const b = player({ id: "b", position: "QB", depthRank: 2, number: 19 });
    expect(getPlayersByPosition(roster([a, b]), "QB").map((p) => p.id)).toEqual(["a", "b"]);
    expect(getPlayersByPosition(roster([b, a]), "QB").map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("resolveUnit — offense/defense via shared formation", () => {
  it("fills each formation slot with the player at that position+index", () => {
    const r = roster([
      player({ id: "wr1", position: "WR", depthRank: 1, number: 11 }),
      player({ id: "wr2", position: "WR", depthRank: 1, number: 14 }),
      player({ id: "wr3", position: "WR", depthRank: 1, number: 16 }),
      player({ id: "qb1", position: "QB", depthRank: 1, number: 7 }),
    ]);
    const resolved = resolveUnit(r, "offense");
    const wrSlots = resolved.filter((s) => s.label === "WR");
    expect(wrSlots.map((s) => s.player?.id)).toEqual(["wr1", "wr2", "wr3"]);
    expect(resolved.find((s) => s.key === "off-qb-0")?.player?.id).toBe("qb1");
  });

  it("leaves a slot empty (no crash) when the roster has no player at that index", () => {
    // Only one WR, but the formation has three WR slots.
    const r = roster([player({ id: "wr1", position: "WR", depthRank: 1, number: 11 })]);
    const resolved = resolveUnit(r, "offense");
    const wrSlots = resolved.filter((s) => s.label === "WR");
    expect(wrSlots[0].player?.id).toBe("wr1");
    expect(wrSlots[1].player).toBeUndefined();
    expect(wrSlots[2].player).toBeUndefined();
  });

  it("leaves every slot empty for an empty roster, without throwing", () => {
    const resolved = resolveUnit(roster([]), "defense");
    expect(resolved).toHaveLength(DEFENSE_FORMATION.length);
    expect(resolved.every((s) => s.player === undefined)).toBe(true);
  });
});

describe("resolveUnit — special teams via explicit assignments", () => {
  it("resolves explicit playerId references", () => {
    const r = roster(
      [player({ id: "kicker", position: "K", depthRank: 1, number: 3 })],
      [{ id: "st-k", playerId: "kicker", x: 50, y: 80, label: "K" }],
    );
    const resolved = resolveUnit(r, "special");
    expect(resolved[0].player?.id).toBe("kicker");
  });

  it("renders an empty slot for an unmarked (null) returner — no guess, no crash", () => {
    const r = roster([], [{ id: "st-pr", playerId: null, x: 70, y: 18, label: "PR" }]);
    const resolved = resolveUnit(r, "special");
    expect(resolved[0].label).toBe("PR");
    expect(resolved[0].player).toBeUndefined();
  });

  it("renders an empty slot when the referenced player is missing from the roster", () => {
    const r = roster([], [{ id: "st-k", playerId: "ghost", x: 50, y: 80, label: "K" }]);
    expect(resolveUnit(r, "special")[0].player).toBeUndefined();
  });
});

describe("shipped rosters resolve fully against the formation", () => {
  // Guards real data: a team missing a starter at a formation position would leave a
  // visible empty slot on the field. Every shipped roster should fill all 11 + ST.
  for (const [id, roster] of Object.entries(TEAMS)) {
    it(`${id}: every offense and defense slot has a player`, () => {
      for (const unit of ["offense", "defense"] as const) {
        const empties = resolveUnit(roster, unit)
          .filter((s) => !s.player)
          .map((s) => s.key);
        expect(empties, `empty ${unit} slots`).toEqual([]);
      }
    });

    it(`${id}: every special-teams slot resolves to a real player`, () => {
      const empties = resolveUnit(roster, "special")
        .filter((s) => !s.player)
        .map((s) => s.key);
      expect(empties).toEqual([]);
    });
  }
});

describe("formations are well-formed", () => {
  it("every formation slot index is non-negative", () => {
    for (const slot of [...OFFENSE_FORMATION, ...DEFENSE_FORMATION]) {
      expect(slot.index).toBeGreaterThanOrEqual(0);
    }
  });

  it("slot ids are unique within each unit", () => {
    const offIds = OFFENSE_FORMATION.map((s) => s.id);
    const defIds = DEFENSE_FORMATION.map((s) => s.id);
    expect(new Set(offIds).size).toBe(offIds.length);
    expect(new Set(defIds).size).toBe(defIds.length);
  });

  it("offense has exactly 7 players on the line of scrimmage", () => {
    expect(OFFENSE_FORMATION.filter((s) => s.onLine).length).toBe(7);
  });

  it("the 5 interior offensive linemen are always on the line", () => {
    const ol = new Set(["LT", "LG", "C", "RG", "RT"]);
    const olSlots = OFFENSE_FORMATION.filter((s) => ol.has(s.position));
    expect(olSlots).toHaveLength(5);
    expect(olSlots.every((s) => s.onLine)).toBe(true);
  });

  // The formation is drawn to real scale: its total vertical span, converted back to
  // yards via FIELD_SCALE, must be a realistic pre-snap depth — not the stretched
  // ~20-yard look that reads as nonsense against yard lines. Offense ~7 yds, defense ~12.
  it("each formation's depth is a realistic number of yards, not stretched", () => {
    for (const formation of [OFFENSE_FORMATION, DEFENSE_FORMATION]) {
      const ys = formation.map((s) => s.y);
      const depthYards = (Math.max(...ys) - Math.min(...ys)) / FIELD_SCALE;
      expect(depthYards).toBeGreaterThan(4);
      expect(depthYards).toBeLessThanOrEqual(13);
    }
  });

  // The whole point of the fix: yard lines are drawn at the same scale the players use,
  // so the distance between two lines equals YARDS_PER_LINE of real player spacing.
  it("yard lines are spaced one real yard-interval apart at the player scale", () => {
    const ys = yardLineYs(LINE_OF_SCRIMMAGE.offense);
    expect(ys.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < ys.length; i++) {
      expect((ys[i] - ys[i - 1]) / FIELD_SCALE).toBeCloseTo(YARDS_PER_LINE);
    }
  });

  // The midfield line the old fixed [10..90] array dropped once the LOS moved off y=50.
  it("draws a yard line near midfield for both units", () => {
    for (const unit of ["offense", "defense"] as const) {
      const ys = yardLineYs(LINE_OF_SCRIMMAGE[unit]);
      expect(ys.some((y) => y >= 40 && y <= 60)).toBe(true);
    }
  });

  // Yard lines stay inside the playing area and never land on the LOS (drawn separately).
  it("keeps yard lines inside the field and off the LOS", () => {
    for (const unit of ["offense", "defense"] as const) {
      const losY = LINE_OF_SCRIMMAGE[unit];
      for (const y of yardLineYs(losY)) {
        expect(y).toBeGreaterThanOrEqual(6);
        expect(y).toBeLessThanOrEqual(94);
        expect(Math.abs(y - losY)).toBeGreaterThan(0.01);
      }
    }
  });

  // The on-line rows sit at each unit's line of scrimmage; the rest of the unit fills
  // away from it. Keep LINE_OF_SCRIMMAGE in sync with where the onLine slots actually are.
  it("each unit's onLine slots sit at its line of scrimmage", () => {
    for (const [unit, formation] of [
      ["offense", OFFENSE_FORMATION],
      ["defense", DEFENSE_FORMATION],
    ] as const) {
      const onLineYs = formation.filter((s) => s.onLine).map((s) => s.y);
      expect(new Set(onLineYs).size).toBe(1);
      expect(onLineYs[0]).toBe(LINE_OF_SCRIMMAGE[unit]);
    }
  });
});
