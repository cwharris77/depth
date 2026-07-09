'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { UniformListing } from '@/lib/roster-source';
import type { UniformKind } from '@/lib/types';
import {
  matchesFilters,
  eraOptions,
  groupByDivision,
  type UniformFilters,
} from '@/lib/uniforms/filter';
import UniformFigure from './UniformFigure';

const KINDS: (UniformKind | 'all')[] = [
  'all',
  'home',
  'away',
  'throwback',
  'alternate',
  'color-rush',
];

// The uniform archive (roadmap Phase 7). Receives every kit from the server route and
// filters/groups client-side with the pure helpers in lib/uniforms/filter. State-only:
// no data fetching here. Kits are drawn as generated vector uniforms (UniformFigure).
export default function UniformArchive({ kits }: { kits: UniformListing[] }) {
  const [filters, setFilters] = useState<UniformFilters>({
    kind: 'all',
    era: 'all',
    currentOnly: false,
  });
  const eras = useMemo(() => eraOptions(kits), [kits]);
  const groups = useMemo(
    () => groupByDivision(kits.filter((k) => matchesFilters(k, filters))),
    [kits, filters]
  );

  return (
    <main
      style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#f0f4ff' }}
      className="px-4 py-6">
      <Link
        href="/"
        aria-label="Back to depth charts"
        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest"
        style={{ color: '#A5ACAF' }}>
        <ArrowLeft size={14} /> DEPTH
      </Link>
      <h1 className="mt-3 text-xl font-bold">Uniform Archive</h1>
      <p className="mt-1 text-sm" style={{ color: '#A5ACAF' }}>
        Every kit for all 32 teams.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          aria-label="Filter by kind"
          value={filters.kind}
          onChange={(e) =>
            setFilters((f) => ({ ...f, kind: e.target.value as UniformKind | 'all' }))
          }
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f4ff' }}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k === 'all' ? 'All kinds' : k}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by era"
          value={filters.era}
          onChange={(e) => setFilters((f) => ({ ...f, era: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f4ff' }}>
          <option value="all">All eras</option>
          {eras.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.currentOnly}
            onChange={(e) => setFilters((f) => ({ ...f, currentOnly: e.target.checked }))}
          />
          Current only
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: '#A5ACAF' }}>
          No kits match these filters.
        </p>
      ) : (
        groups.map((g) => (
          <section key={`${g.conference}-${g.division}`} className="mt-8">
            <h2 className="text-xs font-semibold tracking-widest" style={{ color: '#A5ACAF' }}>
              {g.conference} {g.division.toUpperCase()}
            </h2>
            {g.teams.map((t) => (
              <div key={t.teamId} className="mt-3">
                <h3 className="text-sm font-bold">{t.teamName}</h3>
                <div className="mt-2 flex flex-wrap gap-4">
                  {t.kits.map((k) => (
                    <figure key={k.id} className="w-20 text-center">
                      <UniformFigure
                        colors={k.colors}
                        variant="full"
                        size={64}
                        imagePath={k.imagePath}
                        title={`${t.teamName} ${k.name}`}
                      />
                      <figcaption className="mt-1 text-[11px]" style={{ color: '#c8cdd6' }}>
                        {k.name}
                        {k.yearStart ? ` · ${k.yearStart}${k.yearEnd ? `–${k.yearEnd}` : '–'}` : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}

      <footer className="mt-10 text-[11px]" style={{ color: '#6b7280' }}>
        Uniform figures are original artwork, no team logos. Proportions modeled on the{' '}
        <a
          href="https://commons.wikimedia.org/wiki/File:NFL-Uniform-template-V3.png"
          className="underline">
          NFL uniform template
        </a>{' '}
        by JohnnySeoul, used under{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" className="underline">
          CC BY 3.0
        </a>{' '}
        (modified).
      </footer>
    </main>
  );
}
