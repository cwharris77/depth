// Shared-board resolution (Phase C, share pass). A /team/[id]?board=<slug> link is resolved
// by /api/shares/[slug] into this shape, then the banner decides what to do with it. The
// decision is extracted here as a pure function so the four cases are testable without a DOM
// or a network: it's the whole logic surface of components/SharedBoardBanner.
import type { TeamDepthOverride } from './depth-overrides';

export type SharedBoard = {
  teamId: string;
  ownerName: string;
  override: TeamDepthOverride;
};

// - 'none'     no ?board param -> render nothing, do nothing
// - 'strip'    slug present but unresolved (unknown/deleted/malformed) -> drop the param
//              silently, no banner (same defensive posture as decodeDepthOrder)
// - 'redirect' resolved to a *different* team than the page you're on -> point the viewer at
//              the correct team page
// - 'preview'  resolved for this team -> preview the owner's order with Apply/Dismiss
export type BoardResolution = 'none' | 'strip' | 'redirect' | 'preview';

export function resolveBoard(
  slug: string | null,
  board: SharedBoard | null,
  currentTeamId: string
): BoardResolution {
  if (!slug) return 'none';
  if (!board) return 'strip';
  if (board.teamId !== currentTeamId) return 'redirect';
  return 'preview';
}
