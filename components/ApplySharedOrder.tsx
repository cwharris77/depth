'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import { decodeDepthOrder } from '@/lib/share';

// Opening a shared roster link (/team/[id]?order=<packed>) applies the sender's custom
// depth order on arrival, then strips the param so a reload/reshare is clean. Isolated
// in its own Suspense boundary (useSearchParams needs one during static generation),
// like OpenPlayerFromQuery.
function Inner({ onApply }: { onApply: (override: TeamDepthOverride) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const param = searchParams.get('order');
    if (!param) return;
    const override = decodeDepthOrder(param);
    if (override) onApply(override);
    router.replace(pathname, { scroll: false });
    // Runs once per navigation carrying an `?order=` param; onApply is stable.
  }, [searchParams]);

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
