'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// A shared/bookmarked `/team/[id]?kit=<uniformId>` link opens the page already wearing
// that kit. Mirrors OpenPlayerFromQuery: read the param, apply it if it names a real
// uniform for this team, then strip it so a reload/reshare is clean. Own Suspense
// boundary because useSearchParams needs one during static generation.
function Inner({ validIds, onApply }: { validIds: string[]; onApply: (id: string) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const kit = searchParams.get('kit');
    if (!kit) return;
    if (validIds.includes(kit)) onApply(kit);
    router.replace(pathname, { scroll: false });
    // Runs per navigation carrying `?kit=`; validIds/onApply are stable for the page.
  }, [searchParams]);

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
