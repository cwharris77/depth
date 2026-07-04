import type { TeamRosterSeed } from "./types";
import { getPlayersByPosition } from "./roster";

export interface FeaturedStarter {
  label: string;
  name: string;
}

// A few marquee starters to feature on a team's share card: QB, RB, then top WR.
// Uses the same deterministic depth order as the field, and silently skips any
// position the roster lacks (so an incomplete team still produces a valid card).
export function featuredStarters(roster: TeamRosterSeed): FeaturedStarter[] {
  const wanted: Array<[FeaturedStarter["label"], Parameters<typeof getPlayersByPosition>[1]]> = [
    ["QB", "QB"],
    ["RB", "RB"],
    ["WR", "WR"],
  ];
  const picks: FeaturedStarter[] = [];
  for (const [label, position] of wanted) {
    const player = getPlayersByPosition(roster, position)[0];
    if (player) picks.push({ label, name: player.name });
  }
  return picks;
}
