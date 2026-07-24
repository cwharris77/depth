'use client';

import { Suspense } from 'react';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import { decodeDepthOrder } from '@/lib/share';
import { useApplyQueryParam } from '@/lib/use-apply-query-param';

// Opening a shared roster link (/team/[id]?order=<packed>) applies the sender's custom
// depth order on arrival, then strips the param so a reload/reshare is clean. Isolated
// in its own Suspense boundary (useApplyQueryParam's useSearchParams requires one during
// static generation), like OpenPlayerFromQuery.
function Inner({ onApply }: { onApply: (override: TeamDepthOverride) => void }) {
  useApplyQueryParam('order', (param) => {
    const override = decodeDepthOrder(param);
    if (override) onApply(override);
  });
  return null;
}

export default function ApplySharedOrder(props: {
  onApply: (override: TeamDepthOverride) => void;
}) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
