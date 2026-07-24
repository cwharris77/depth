'use client';

import { useEffect, useState } from 'react';
import type { PlayerHit } from './search';

// Debounced player search against /api/players/search, shared by NavSwitcher (mobile) and
// TeamRail (desktop) — both used to run this fetch independently, meaning typing the same
// query in either surface (or switching between them) always hit the API again. A
// module-scoped cache keyed by the trimmed query dedupes that: once a query's results land,
// every caller (this session, this page load) reuses them instead of re-fetching. 200ms
// debounce and AbortController-on-restart are unchanged from the original per-component
// effects.
const searchCache = new Map<string, PlayerHit[]>();

export function usePlayerSearch(query: string) {
  const trimmed = query.trim();
  const searching = trimmed.length > 0;
  const [results, setResults] = useState<PlayerHit[]>(() => searchCache.get(trimmed) ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searching) {
      setResults([]);
      setLoading(false);
      return;
    }
    const cached = searchCache.get(trimmed);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        const hits: PlayerHit[] = data.results ?? [];
        searchCache.set(trimmed, hits);
        setResults(hits);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searching]);

  return { results, loading };
}
