'use client';

import { useState } from 'react';
import { useTeamSeason } from '@/lib/hooks/schedule/use-team-season';

// Phase D1 historical season selection for DepthChartField: which season is showing,
// the read-only roster fetch for it, and the share flow for a historical URL (distinct
// from the live-roster share in use-share-roster.ts, since a past season has no
// override/kit state to encode). Reset to "today" (season: null) whenever the team
// changes -- a render-time reset (not an effect), same pattern as useKit's team-change
// reset, since this only needs to mirror `team.id`.
export function useDepthChartSeason(team: { id: string; city: string; name: string }) {
  const [seasonSelection, setSeasonSelection] = useState<{
    teamId: string;
    season: number | null;
  }>({ teamId: team.id, season: null });
  if (seasonSelection.teamId !== team.id) {
    setSeasonSelection({ teamId: team.id, season: null });
  }
  const season = seasonSelection.season;
  const historicalMode = season !== null;

  const [historicalShareCopied, setHistoricalShareCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { historicalRoster, historyLoading, historyNotFound, historyError } = useTeamSeason(
    team.id,
    season,
    retryCount
  );

  const setSeason = (next: number | null) => {
    setSeasonSelection({ teamId: team.id, season: next });
  };

  const retry = () => setRetryCount((c) => c + 1);

  // Share while viewing history shares the current `?season=` URL rather than the
  // override/kit share flow, which doesn't apply to a read-only past season.
  const handleShareHistoricalRoster = async () => {
    const url = window.location.href;
    const title = `${team.city} ${team.name} ${season} season · Depth`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // share sheet dismissed / unavailable — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setHistoricalShareCopied(true);
      setTimeout(() => setHistoricalShareCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — no-op
    }
  };

  return {
    season,
    historicalMode,
    setSeason,
    historicalRoster,
    historyLoading,
    historyNotFound,
    historyError,
    retry,
    historicalShareCopied,
    handleShareHistoricalRoster,
  };
}
