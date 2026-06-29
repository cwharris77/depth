import type { FormationSlot, RenderSlot, TeamRoster, Unit } from "./types";
import { getPlayerById, getPlayersByPosition } from "./teams";

// Shared, generic formations. Every team's offense/defense renders on these — slots
// resolve to players by position group + depth index, so adding a team is data-only.
//
//   index 0 = first at that position (by depthRank, then jersey number)
//   index 1 = second, etc.  If the roster has no player at that index → empty slot.
//
// Coords are percentages: x = 0–100 across, y = 0–100 down. y=50 = line of scrimmage.

export const OFFENSE_FORMATION: FormationSlot[] = [
  { id: "off-wr-0", position: "WR", index: 0, x: 8, y: 54, label: "WR" },
  { id: "off-wr-1", position: "WR", index: 1, x: 92, y: 54, label: "WR" },
  { id: "off-wr-2", position: "WR", index: 2, x: 22, y: 54, label: "WR" },
  { id: "off-te-0", position: "TE", index: 0, x: 78, y: 54, label: "TE" },
  { id: "off-lt-0", position: "LT", index: 0, x: 25, y: 66, label: "LT" },
  { id: "off-lg-0", position: "LG", index: 0, x: 37, y: 66, label: "LG" },
  { id: "off-c-0", position: "C", index: 0, x: 50, y: 66, label: "C" },
  { id: "off-rg-0", position: "RG", index: 0, x: 63, y: 66, label: "RG" },
  { id: "off-rt-0", position: "RT", index: 0, x: 75, y: 66, label: "RT" },
  { id: "off-qb-0", position: "QB", index: 0, x: 50, y: 78, label: "QB" },
  { id: "off-rb-0", position: "RB", index: 0, x: 50, y: 90, label: "RB" },
];

export const DEFENSE_FORMATION: FormationSlot[] = [
  { id: "def-s-0", position: "S", index: 0, x: 34, y: 8, label: "SS" },
  { id: "def-s-1", position: "S", index: 1, x: 66, y: 8, label: "FS" },
  { id: "def-cb-0", position: "CB", index: 0, x: 8, y: 20, label: "CB" },
  { id: "def-cb-1", position: "CB", index: 1, x: 92, y: 20, label: "CB" },
  { id: "def-lb-0", position: "LB", index: 0, x: 24, y: 32, label: "LB" },
  { id: "def-lb-1", position: "LB", index: 1, x: 50, y: 32, label: "LB" },
  { id: "def-lb-2", position: "LB", index: 2, x: 76, y: 32, label: "LB" },
  { id: "def-de-0", position: "DE", index: 0, x: 22, y: 44, label: "DE" },
  { id: "def-dt-0", position: "DT", index: 0, x: 42, y: 44, label: "DT" },
  { id: "def-dt-1", position: "DT", index: 1, x: 58, y: 44, label: "DT" },
  { id: "def-de-1", position: "DE", index: 1, x: 78, y: 44, label: "DE" },
];

// Resolve a unit to render-ready slots for a given roster.
// - offense/defense: fill the shared formation by position group + index
// - special: explicit per-team assignments; an unmarked (null) or missing player → empty slot
export function resolveUnit(roster: TeamRoster, unit: Unit): RenderSlot[] {
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
    player: getPlayersByPosition(roster, slot.position)[slot.index],
  }));
}
