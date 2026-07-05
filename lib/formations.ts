import type { FormationSlot, RenderSlot, TeamRosterSeed, Unit } from "./types";
import { getPlayerById, getPlayersByPosition } from "./roster";

// Shared, generic formations. Every team's offense/defense renders on these — slots
// resolve to players by position group + depth index, so adding a team is data-only.
//
//   index 0 = first at that position (by depthRank, then jersey number)
//   index 1 = second, etc.  If the roster has no player at that index → empty slot.
//
// Coords are percentages: x = 0–100 across, y = 0–100 down.
//
// Offense and defense are shown one unit at a time (never together), so each formation
// gets the WHOLE field height instead of one half — this both fixes the vertical
// crowding on short screens and uses what was dead space. The line of scrimmage is not
// centered: it sits near the unit's front (offense up top, defense down low) and the
// unit fills away from it. LINE_OF_SCRIMMAGE holds each unit's LOS y (the field draws
// its blue line there and dots nudge onto their own side of it).
export const LINE_OF_SCRIMMAGE: Record<"offense" | "defense" | "special", number> = {
  offense: 22,
  defense: 78,
  special: 50,
};

// Base 11-personnel look. The 5 OL + TE + the split-end WR sit ON the line of scrimmage
// (y=22, near the top); slot/flanker WRs are just off it, QB behind center, RB deep — the
// stack fills down the field. NFL rule is AT LEAST 7 on the line (fewer is an illegal
// formation); more than 7 is legal too (jumbo/unbalanced sets). This base look uses
// exactly 7 — if alternate formations are added later, the invariant is onLine >= 7.
export const OFFENSE_FORMATION: FormationSlot[] = [
  { id: "off-wr-0", position: "WR", index: 0, x: 88, y: 22, label: "WR", onLine: true },
  { id: "off-wr-1", position: "WR", index: 1, x: 12, y: 33, label: "WR", onLine: false },
  { id: "off-wr-2", position: "WR", index: 2, x: 24, y: 35, label: "WR", onLine: false },
  { id: "off-te-0", position: "TE", index: 0, x: 74, y: 22, label: "TE", onLine: true },
  { id: "off-lt-0", position: "LT", index: 0, x: 34, y: 22, label: "LT", onLine: true },
  { id: "off-lg-0", position: "LG", index: 0, x: 42, y: 22, label: "LG", onLine: true },
  { id: "off-c-0", position: "C", index: 0, x: 50, y: 22, label: "C", onLine: true },
  { id: "off-rg-0", position: "RG", index: 0, x: 58, y: 22, label: "RG", onLine: true },
  { id: "off-rt-0", position: "RT", index: 0, x: 66, y: 22, label: "RT", onLine: true },
  { id: "off-qb-0", position: "QB", index: 0, x: 50, y: 52, label: "QB", onLine: false },
  { id: "off-rb-0", position: "RB", index: 0, x: 50, y: 82, label: "RB", onLine: false },
];

// 4-3 base, mirrored: the four down linemen sit ON the LOS (y=78, near the bottom);
// linebackers, corners, then safeties stack up the field toward the offense. The unit
// fills upward from its line. onLine marks the DL front.
export const DEFENSE_FORMATION: FormationSlot[] = [
  { id: "def-s-0", position: "S", index: 0, x: 34, y: 18, label: "SS", onLine: false },
  { id: "def-s-1", position: "S", index: 1, x: 66, y: 18, label: "FS", onLine: false },
  { id: "def-cb-0", position: "CB", index: 0, x: 10, y: 40, label: "CB", onLine: false },
  { id: "def-cb-1", position: "CB", index: 1, x: 90, y: 40, label: "CB", onLine: false },
  { id: "def-lb-0", position: "LB", index: 0, x: 26, y: 58, label: "LB", onLine: false },
  { id: "def-lb-1", position: "LB", index: 1, x: 50, y: 58, label: "LB", onLine: false },
  { id: "def-lb-2", position: "LB", index: 2, x: 74, y: 58, label: "LB", onLine: false },
  { id: "def-de-0", position: "DE", index: 0, x: 24, y: 78, label: "DE", onLine: true },
  { id: "def-dt-0", position: "DT", index: 0, x: 42, y: 78, label: "DT", onLine: true },
  { id: "def-dt-1", position: "DT", index: 1, x: 58, y: 78, label: "DT", onLine: true },
  { id: "def-de-1", position: "DE", index: 1, x: 76, y: 78, label: "DE", onLine: true },
];

// Resolve a unit to render-ready slots for a given roster.
// - offense/defense: fill the shared formation by position group + index
// - special: explicit per-team assignments; an unmarked (null) or missing player → empty slot
export function resolveUnit(roster: TeamRosterSeed, unit: Unit): RenderSlot[] {
  if (unit === "special") {
    return roster.specialTeams.map((slot) => ({
      key: slot.id,
      x: slot.x,
      y: slot.y,
      label: slot.label,
      player: slot.playerId ? getPlayerById(roster, slot.playerId) : undefined,
    }));
  }

  const formation = unit === "offense" ? OFFENSE_FORMATION : DEFENSE_FORMATION;
  return formation.map((slot) => ({
    key: slot.id,
    x: slot.x,
    y: slot.y,
    label: slot.label,
    onLine: slot.onLine,
    player: getPlayersByPosition(roster, slot.position)[slot.index],
  }));
}
