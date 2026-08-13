'use client';

import { useEffect, useState } from 'react';
import type { TeamSchedule } from './types';

// Client-side fetch for a past season's read-only schedule (the schedule page's season
// picker, docs/superpowers/specs/2026-08-10-past-season-schedule-view-design.md). `season`
// null means "not viewing history" -- the hook stays idle. Aborted on team/season change
// so a slow response for a since-abandoned selection can't clobber a newer one (same
// posture as useTeamSeason and PlayerCard's stats fetch). `notFound` distinguishes "no
// data for this season" from "still loading" so the caller never flashes stale content
// (AGENTS.md invariant 16).
export function useTeamScheduleSeason(teamId: string, season: number | null) {
  const [schedule, setSchedule] = useState<TeamSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (season === null) {
      setSchedule(null);
      setLoading(false);
      setNotFound(false);
      return;
    }
    setSchedule(null);
    setNotFound(false);
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/teams/${encodeURIComponent(teamId)}/schedule/${season}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { schedule: TeamSchedule }) => {
        setSchedule(data.schedule);
        setLoading(false);
        setNotFound(false);
      })
      .catch(() => {
        // A superseded request's abort rejects here too — its state setters must not
        // clobber whatever the newer in-flight request has already set.
        if (controller.signal.aborted) return;
        setLoading(false);
        setNotFound(true);
      });
    return () => controller.abort();
  }, [teamId, season]);

  return { schedule, loading, notFound };
}
