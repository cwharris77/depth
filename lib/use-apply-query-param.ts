'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Shared "read a query param once, apply it, then strip it" pattern — used by
// OpenPlayerFromQuery (?player=), ApplyKitFromQuery (?kit=), and ApplySharedOrder (?order=),
// which were three near-identical copies of this effect. All three hand the raw param value to
// a callback, then router.replace to a clean URL regardless of whether the value was valid, so
// a reload/reshare doesn't reapply it. Genuine effect, not a derived-render value: it performs
// an imperative navigation (router.replace) on an external system (the router), which has no
// render-time equivalent. Callers must render this from within a Suspense boundary —
// useSearchParams requires one during static generation.
export function useApplyQueryParam(key: string, apply: (value: string) => void) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const value = searchParams.get(key);
    if (!value) return;
    apply(value);
    router.replace(pathname, { scroll: false });
    // Runs once per navigation carrying the param; `apply` is expected to be stable for the
    // page's lifetime, same assumption the three original effects made.
  }, [searchParams, key]);
}
