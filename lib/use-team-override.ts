'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  clearPositionOrder,
  clearTeamOverride,
  getTeamOverride,
  setPositionOrder,
  setTeamOverride,
  type TeamDepthOverride,
} from '@/lib/depth-overrides';
import { mergeOnSignIn, pushTeamOverride } from '@/lib/overrides-sync';
import type { Position } from '@/lib/types';

// The user's custom depth ordering for a team (localStorage cache, mirrored to the server
// when signed in), preview support for a shared board, and the app-level "edit depth chart"
// toggle that gates reorder mode. `user` is passed in rather than read via useUser() here so
// a single subscription is shared with useShareRoster.
export function useTeamOverride(teamId: string, user: User | null) {
  const [override, setOverride] = useState<TeamDepthOverride>({});
  // Previewing a shared board (?board=<slug>, see SharedBoardBanner): the field renders the
  // owner's order WITHOUT persisting it, and reorder is disabled until the viewer taps Apply.
  // A non-null preview takes precedence over the viewer's own override.
  const [previewOverride, setPreviewOverride] = useState<TeamDepthOverride | null>(null);
  // App-level "edit depth chart" toggle: puts every position group's card into reorder mode
  // at once (PlayerCard's globalEditMode prop), instead of tapping each card's own Reorder
  // button in turn. Off is symmetric with on — it drops every group straight back out, same
  // as tapping Done individually would.
  const [globalEditMode, setGlobalEditMode] = useState(false);

  // Team switch resets everything team-scoped in one place: reload this team's saved
  // override, drop any shared-board preview from the previous team, and exit edit mode so
  // it doesn't carry a stale "editing" state into the new roster.
  useEffect(() => {
    setOverride(getTeamOverride(teamId));
    setPreviewOverride(null);
    setGlobalEditMode(false);
  }, [teamId]);

  // On sign-in, pull the durable server overrides (server wins) and push up any team edited
  // only on this device, then re-read the current team's order. mergeOnSignIn is idempotent
  // and self-guarded, so re-running on user change is safe; the [teamId] effect above keeps
  // the visible order fresh when switching teams.
  useEffect(() => {
    if (!user) return;
    mergeOnSignIn().then(() => setOverride(getTeamOverride(teamId)));
  }, [user?.id, teamId]);

  const previewing = previewOverride !== null;
  const effectiveOverride = previewOverride ?? override;

  // Every override mutation writes localStorage first (the always-on cache), then mirrors the
  // team's new override to the server when signed in (fire-and-forget, last-write-wins).
  const syncTeam = (next: TeamDepthOverride) => {
    if (user) pushTeamOverride(teamId, next);
  };

  const handleReorder = (position: Position, orderedIds: string[]) => {
    setPositionOrder(teamId, position, orderedIds);
    const next = getTeamOverride(teamId);
    setOverride(next);
    syncTeam(next);
  };

  const handleResetPosition = (position: Position) => {
    clearPositionOrder(teamId, position);
    const next = getTeamOverride(teamId);
    setOverride(next);
    syncTeam(next);
  };

  const handleResetTeam = () => {
    clearTeamOverride(teamId);
    setOverride({});
    syncTeam({});
  };

  // Applying a shared roster link: persist the sender's order as this device's custom
  // order for the team, so the board matches "exactly as edited" and Reset still works.
  const handleApplySharedOrder = (shared: TeamDepthOverride) => {
    setTeamOverride(teamId, shared);
    const next = getTeamOverride(teamId);
    setOverride(next);
    syncTeam(next);
  };

  return {
    override,
    previewOverride,
    setPreviewOverride,
    previewing,
    effectiveOverride,
    globalEditMode,
    setGlobalEditMode,
    handleReorder,
    handleResetPosition,
    handleResetTeam,
    handleApplySharedOrder,
  };
}
