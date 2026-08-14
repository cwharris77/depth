'use client';

import { useEffect, useState } from 'react';
import type { TeamRoster } from '@/lib/types';

// Client-side fetch for a past season's read-only roster (Phase D1,
// docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-design.md). `season`
// null means "not viewing history" -- the hook stays idle. Aborted on team/season
// change so a slow response for a since-abandoned selection can't clobber a newer one
// (same posture as PlayerCard's stats fetch). `notFound` distinguishes "no data for
// this season" from "still loading" so the caller never flashes stale content
// (AGENTS.md invariant 16).
export function useTeamSeason(teamId: string, season: number | null, retry?: number) {
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (season === null) {
      setRoster(null);
      setLoading(false);
      setNotFound(false);
      setError(null);
      return;
    }
    setRoster(null);
    setNotFound(false);
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/teams/${encodeURIComponent(teamId)}/history/${season}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { roster: TeamRoster }) => {
        setRoster(data.roster);
        setLoading(false);
      })
      .catch((err) => {
        // A superseded request's own abort lands here too (when the previous fetch was
        // already in flight and a new season/retry arrives before it resolves) -- it
        // must not clobber the newer request's state, already set synchronously when
        // its effect ran, before this stale rejection is even delivered.
        if (controller.signal.aborted || (err as Error).name === 'AbortError') return;
        setLoading(false);
        if ((err as Response).status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    return () => controller.abort();
  }, [teamId, season, retry]);

  return {
    historicalRoster: roster,
    historyLoading: loading,
    historyNotFound: notFound,
    historyError: error,
  };
}
