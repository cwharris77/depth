'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerHit } from './search';

const searchCache = new Map<string, PlayerHit[]>();

export function usePlayerSearch(query: string, { enabled = true }: { enabled?: boolean } = {}) {
  const trimmed = query.trim();
  const searching = enabled && trimmed.length > 0;
  const prevTrimmedRef = useRef('');
  const [results, setResults] = useState<PlayerHit[]>(() =>
    searching ? (searchCache.get(trimmed) ?? []) : []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searching) {
      setResults([]);
      setLoading(false);
      prevTrimmedRef.current = trimmed;
      return;
    }
    const cached = searchCache.get(trimmed);
    if (cached) {
      setResults(cached);
      setLoading(false);
      prevTrimmedRef.current = trimmed;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const delay = prevTrimmedRef.current === '' ? 0 : 200;
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
        // A superseded request's own abort lands here too (when the previous fetch was
        // already in flight, past its debounce delay, and a new keystroke arrives before
        // it resolves) -- it must not clobber the newer request's `setLoading(true)`,
        // already set synchronously when its effect ran, before this stale rejection is
        // even delivered.
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);
    prevTrimmedRef.current = trimmed;
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searching]);

  return { results, loading };
}
