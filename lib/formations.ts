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
// GEOMETRY IS TO REAL SCALE. Vertical positions are derived from each player's real
// pre-snap depth off the line of scrimmage (in yards) via FIELD_SCALE, and the field's
// yard lines are drawn at that same scale — so the gap between two players reads as the
// real yardage between them, and a yard line genuinely falls a real 5 yards away. This
// replaces the earlier "stretch the unit to fill the whole frame" look, which spaced an
// 11-man front over ~7 real yards but *looked* ~20 yards deep (nonsense against yard
// lines). A single unit occupies its honest depth (offense ~7 yds, defense ~12), not the
// whole field; open field above/below is real, not wasted.
//
// Depths (yards from the LOS), per standard alignments:
//   offense — OL/TE/split end ON the ball (0); off-ball WR ~1; shotgun QB 5; RB 7
//   defense — DL ON the ball (0); LB 4; CB (off coverage) 7; deep safety 12
// Sources: NFL rulebook (7-on-the-line), Wikipedia (LB 2–4 yds behind DL), standard
// shotgun (QB 5 yds) and Cover-shell (safeties 10–14 yds) depths.
export const FIELD_SCALE = 6; // % of field height per yard of real depth
export const YARDS_PER_LINE = 5; // real football yard lines are every 5 yards

// The LOS is not centered: it sits near each unit's front (offense up top, defense down
// low) and the unit fills away from it toward midfield. Values are the y of the on-ball
// row; every other slot is FIELD_SCALE * depthYards off it. Chosen so the deepest unit
// (defense's 12-yd safeties) lands just inside the top without clipping.
export const LINE_OF_SCRIMMAGE: Record<"offense" | "defense" | "special", number> = {
  offense: 18,
  defense: 82,
  special: 50,
};

// depth = yards behind the LOS; y is LOS ± depth * FIELD_SCALE (offense fills down).
const off = (depth: number) => LINE_OF_SCRIMMAGE.offense + depth * FIELD_SCALE;
const def = (depth: number) => LINE_OF_SCRIMMAGE.defense - depth * FIELD_SCALE;

// Base 11-personnel look. The 5 OL + TE + the split-end WR sit ON the line of scrimmage
// (depth 0, near the top); off-ball WRs a yard off, QB 5 yds back in the gun, RB 7 deep.
// NFL rule is AT LEAST 7 on the line (fewer is an illegal formation); more than 7 is
// legal too (jumbo/unbalanced sets). This base look uses exactly 7 — if alternate
// formations are added later, the invariant is onLine >= 7.
export const OFFENSE_FORMATION: FormationSlot[] = [
  { id: "off-wr-0", position: "WR", index: 0, x: 88, y: off(0), label: "WR", onLine: true },
  { id: "off-wr-1", position: "WR", index: 1, x: 12, y: off(1), label: "WR", onLine: false },
  { id: "off-wr-2", position: "WR", index: 2, x: 24, y: off(1), label: "WR", onLine: false },
  { id: "off-te-0", position: "TE", index: 0, x: 74, y: off(0), label: "TE", onLine: true },
  { id: "off-lt-0", position: "LT", index: 0, x: 34, y: off(0), label: "LT", onLine: true },
  { id: "off-lg-0", position: "LG", index: 0, x: 42, y: off(0), label: "LG", onLine: true },
  { id: "off-c-0", position: "C", index: 0, x: 50, y: off(0), label: "C", onLine: true },
  { id: "off-rg-0", position: "RG", index: 0, x: 58, y: off(0), label: "RG", onLine: true },
  { id: "off-rt-0", position: "RT", index: 0, x: 66, y: off(0), label: "RT", onLine: true },
  { id: "off-qb-0", position: "QB", index: 0, x: 50, y: off(5), label: "QB", onLine: false },
  { id: "off-rb-0", position: "RB", index: 0, x: 50, y: off(7), label: "RB", onLine: false },
];

// 4-3 base, mirrored: the four down linemen sit ON the LOS (depth 0, near the bottom);
// linebackers 4 yds off, corners 7, safeties 12 deep — the unit stacks up toward the
// offense. onLine marks the DL front.
export const DEFENSE_FORMATION: FormationSlot[] = [
  { id: "def-s-0", position: "S", index: 0, x: 34, y: def(12), label: "SS", onLine: false },
  { id: "def-s-1", position: "S", index: 1, x: 66, y: def(12), label: "FS", onLine: false },
  { id: "def-cb-0", position: "CB", index: 0, x: 10, y: def(7), label: "CB", onLine: false },
  { id: "def-cb-1", position: "CB", index: 1, x: 90, y: def(7), label: "CB", onLine: false },
  { id: "def-lb-0", position: "LB", index: 0, x: 26, y: def(4), label: "LB", onLine: false },
  { id: "def-lb-1", position: "LB", index: 1, x: 50, y: def(4), label: "LB", onLine: false },
  { id: "def-lb-2", position: "LB", index: 2, x: 74, y: def(4), label: "LB", onLine: false },
  { id: "def-de-0", position: "DE", index: 0, x: 24, y: def(0), label: "DE", onLine: true },
  { id: "def-dt-0", position: "DT", index: 0, x: 42, y: def(0), label: "DT", onLine: true },
  { id: "def-dt-1", position: "DT", index: 1, x: 58, y: def(0), label: "DT", onLine: true },
  { id: "def-de-1", position: "DE", index: 1, x: 76, y: def(0), label: "DE", onLine: true },
];

// Yard lines to draw for a unit's LOS: every YARDS_PER_LINE yards, at the SAME scale the
// players use, so line spacing == player spacing. The LOS itself is drawn separately (a
// blue line), so it's excluded here; only lines inside the playing area (past the
// end-zone bands at y<6 / y>94) are returned. Anchored to the LOS, this always yields a
// line near midfield — the one the old fixed [10..90] array dropped when the LOS moved.
export function yardLineYs(losY: number): number[] {
  const step = FIELD_SCALE * YARDS_PER_LINE;
  const ys: number[] = [];
  for (let y = losY - step * 4; y <= losY + step * 4; y += step) {
    if (y >= 6 && y <= 94 && Math.abs(y - losY) > 0.01) {
      ys.push(Math.round(y * 10) / 10);
    }
  }
  return ys;
}

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
