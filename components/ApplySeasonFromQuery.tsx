'use client';

import { Suspense } from 'react';
import { useApplyQueryParam } from '@/lib/hooks/use-apply-query-param';

// A shared/bookmarked `/team/[id]?season=<year>` link opens the page already showing
// that past season. Unlike ApplyKitFromQuery/ApplySharedOrder's one-shot params, `season`
// is deliberately NOT stripped after applying — season links stay shareable through
// reload and re-share (docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-
// design.md). Built on useApplyQueryParam's `strip: false` mode (DEP-184) rather than a
// bespoke effect, so this and DepthChartField's own season read (folded into
// SyncSelectionFromQuery) share one implementation of "apply on every param change,
// including removal." Used standalone here by TeamScheduleView (the schedule tab has no
// player/unit/kit selection to consolidate with); DepthChartField renders
// SyncSelectionFromQuery instead. Own Suspense boundary because useApplyQueryParam's
// useSearchParams requires one during static generation.
function Inner({ onApply }: { onApply: (season: number | null) => void }) {
  useApplyQueryParam(
    'season',
    (raw) => {
      const season = raw ? Number(raw) : null;
      onApply(Number.isInteger(season) ? season : null);
    },
    { strip: false }
  );
  return null;
}

export default function ApplySeasonFromQuery(props: { onApply: (season: number | null) => void }) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
