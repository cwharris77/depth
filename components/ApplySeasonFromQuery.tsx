'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// A shared/bookmarked `/team/[id]?season=<year>` link opens the page already showing
// that past season. Unlike ApplyKitFromQuery/useApplyQueryParam's one-shot params,
// `season` is deliberately NOT stripped after applying -- season links stay shareable
// through reload and re-share (docs/superpowers/specs/2026-07-07-phase-d-history-and-
// boards-design.md), and DepthChartField itself keeps the param alive through player/
// unit changes (see lib/team-selection.ts). Re-applies on every `season` param change
// (Back/Forward, a fresh share link, or the field's own URL updates), not just once.
// Own Suspense boundary because useSearchParams requires one during static generation.
function Inner({ onApply }: { onApply: (season: number | null) => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const raw = searchParams.get('season');
  useEffect(() => {
    const season = raw ? Number(raw) : null;
    onApply(Number.isInteger(season) ? season : null);
    // `onApply` is expected to be stable for the page's lifetime, same assumption
    // useApplyQueryParam makes. `pathname` is in the dependency array (not just `raw`)
    // so navigating to a different team whose URL happens to carry the same `season`
    // value still re-applies it -- the team switch's own render-time reset otherwise
    // leaves `viewedSeason` at the default with nothing to pull it back in sync.
  }, [raw, pathname]);
  return null;
}

export default function ApplySeasonFromQuery(props: { onApply: (season: number | null) => void }) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
