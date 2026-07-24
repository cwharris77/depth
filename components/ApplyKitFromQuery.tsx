'use client';

import { Suspense } from 'react';
import { useApplyQueryParam } from '@/lib/use-apply-query-param';

// A shared/bookmarked `/team/[id]?kit=<uniformId>` link opens the page already wearing
// that kit. Mirrors OpenPlayerFromQuery: read the param, apply it if it names a real
// uniform for this team, then strip it so a reload/reshare is clean. Own Suspense
// boundary because useApplyQueryParam's useSearchParams requires one during static generation.
function Inner({ validIds, onApply }: { validIds: string[]; onApply: (id: string) => void }) {
  useApplyQueryParam('kit', (kit) => {
    if (validIds.includes(kit)) onApply(kit);
  });
  return null;
}

export default function ApplyKitFromQuery(props: {
  validIds: string[];
  onApply: (id: string) => void;
}) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
