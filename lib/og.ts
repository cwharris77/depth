// Pure content/logic for a team's share-card OG image (app/team/[id]/og-image/route.tsx).
// Kept here, not in the route, so the "what goes on the card" decisions (which starters,
// whether a shared `?order=` override applies) are unit-testable without invoking satori.
import type { TeamRoster, TeamRosterSeed } from './types';
import { getPlayersByPosition } from './roster';
import { applyTeamOverride } from './depth-overrides';
import { decodeDepthOrder } from './share';

// Card pixel size, shared by the route handler (ImageResponse) and generateMetadata
// (openGraph.images / twitter.images dimensions) so they can't drift apart.
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = 'Team depth chart';

export interface FeaturedStarter {
  label: string;
  name: string;
}

// Apply a shared roster link's `?order=` param (lib/share.ts) to a fetched roster before
// computing OG card content, so the link preview reflects the sender's edited order
// instead of always the default. A missing or malformed param degrades to the roster's
// default order (AGENTS.md invariant 6 — untrusted input never throws), matching how
// components/ApplySharedOrder.tsx applies the same param client-side.
export function rosterForOgImage(roster: TeamRoster, orderParam: string | null): TeamRoster {
  if (!orderParam) return roster;
  const override = decodeDepthOrder(orderParam);
  if (!override) return roster;
  return applyTeamOverride(roster, override);
}

// A few marquee starters to feature on a team's share card: QB, RB, then top WR.
// Uses the same deterministic depth order as the field, and silently skips any
// position the roster lacks (so an incomplete team still produces a valid card).
export function featuredStarters(roster: TeamRosterSeed): FeaturedStarter[] {
  const wanted: Array<[FeaturedStarter['label'], Parameters<typeof getPlayersByPosition>[1]]> = [
    ['QB', 'QB'],
    ['RB', 'RB'],
    ['WR', 'WR'],
  ];
  const picks: FeaturedStarter[] = [];
  for (const [label, position] of wanted) {
    const player = getPlayersByPosition(roster, position)[0];
    if (player) picks.push({ label, name: player.name });
  }
  return picks;
}
