import type { Position } from "./types";

// Human-readable name for each roster position code. Typed as a total
// Record<Position, string> so adding a Position to the union without a name here
// is a compile error. Used where the two-letter code alone is ambiguous to casual
// fans (the player card, dot accessibility labels).
export const POSITION_FULL_NAMES: Record<Position, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  WR: "Wide Receiver",
  TE: "Tight End",
  LT: "Left Tackle",
  LG: "Left Guard",
  C: "Center",
  RG: "Right Guard",
  RT: "Right Tackle",
  DE: "Defensive End",
  DT: "Defensive Tackle",
  LB: "Linebacker",
  CB: "Cornerback",
  S: "Safety",
  K: "Kicker",
  P: "Punter",
  LS: "Long Snapper",
  KR: "Kick Returner",
  PR: "Punt Returner",
};

export function positionFullName(position: Position): string {
  return POSITION_FULL_NAMES[position];
}
