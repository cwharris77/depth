'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Shared "read a query param, apply it" pattern — used by ApplyKitFromQuery (?kit=) and
// ApplySharedOrder (?order=), which were near-identical copies of this effect, plus
// SyncSelectionFromQuery's `?season=` read (DEP-184). Two modes, chosen by `strip`:
//   - strip: true (default) — one-shot params. Apply once, then router.replace to a clean
//     URL regardless of whether the value was valid, so a reload/reshare doesn't reapply
//     it. `apply` is never called with null in this mode.
//   - strip: false — persistent params (e.g. `?season=`, which stays shareable through
//     reload/re-share). The param is left alone, and `apply(null)` fires when it's absent
//     so a removal (Back/Forward, a manual edit) resets whatever state it drove.
// `?player=`/`?unit=` still don't go through here — DEP-130 made that pair persistent
// *and* loop-guarded against this page's own writes, which this hook has no concept of.
// Genuine effect, not a derived-render value: it performs an imperative navigation
// (router.replace) on an external system (the router), which has no render-time
// equivalent. Callers must render this from within a Suspense boundary — useSearchParams
// requires one during static generation.
export function useApplyQueryParam(
  key: string,
  apply: (value: string | null) => void,
  options?: { strip?: boolean }
) {
  const strip = options?.strip ?? true;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read through a ref, not a closure dependency — an `apply` recreated every render (the
  // common case; none of this hook's callers currently memoize it) would otherwise be
  // silently dropped from the effect's actual behavior even though the effect ran, since
  // the *old* closure is what fired. This makes the "apply is stable" assumption structural
  // instead of documented-lucky (DEP-184 finding #2).
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    const value = searchParams.get(key);
    if (value) {
      applyRef.current(value);
      if (strip) router.replace(pathname, { scroll: false });
      return;
    }
    if (!strip) applyRef.current(null);
    // `pathname` is a dependency (not just `searchParams`/`key`) so a persistent param
    // re-applies on a team switch whose URL happens to carry the same raw value — the
    // team switch's own render-time reset otherwise leaves nothing to pull it back in
    // sync (mirrors ApplySeasonFromQuery's original reasoning).
  }, [searchParams, key, pathname, strip, router]);
}
