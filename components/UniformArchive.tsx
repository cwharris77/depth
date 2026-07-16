'use client';

import { useMemo, useState } from 'react';
import type { UniformListing } from '@/lib/roster-source';
import type { UniformKind } from '@/lib/types';
import {
  matchesFilters,
  eraOptions,
  groupByDivision,
  type UniformFilters,
} from '@/lib/uniforms/filter';
import UniformFigure, { UniformFigureDefs } from './UniformFigure';
import DepthMark from './DepthMark';
import NavDrawer from './NavDrawer';

// The uniform archive (roadmap Phase 7). Receives every kit from the server route and
// filters/groups client-side with the pure helpers in lib/uniforms/filter. State-only — no
// data fetching. Editorial layout: division headers, a per-team color accent bar, then the
// team's kits as generated vector uniforms (UniformFigure). Global nav is the logo drawer,
// consistent with the team page. The archive has no team context, so nav tints use a neutral.

const KIND_OPTIONS: { value: UniformKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All kits' },
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'throwback', label: 'Throwback' },
  { value: 'alternate', label: 'Alternate' },
  { value: 'color-rush', label: 'Color rush' },
];

const ACCENT = '#69BE28';

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-3 py-1.5 text-xs"
      style={
        active
          ? { background: ACCENT, color: '#0a0e1a', fontWeight: 600 }
          : { background: 'rgba(255,255,255,0.06)', color: '#c8cdd6' }
      }>
      {children}
    </button>
  );
}

export default function UniformArchive({ kits }: { kits: UniformListing[] }) {
  const [filters, setFilters] = useState<UniformFilters>({
    kind: 'all',
    era: 'all',
    currentOnly: false,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const eras = useMemo(() => eraOptions(kits), [kits]);
  const groups = useMemo(
    () => groupByDivision(kits.filter((k) => matchesFilters(k, filters))),
    [kits, filters]
  );

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#0a0e1a',
        color: '#f0f4ff',
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
      }}
      className="px-4">
      {/* Mounted once for the whole page: every UniformFigure below passes sharedDefs so its
          mannequin geometry (helmet/facemask/jersey/pants/…) references this sprite via <use>
          instead of re-embedding the path data per kit — see components/UniformFigure.tsx. */}
      <UniformFigureDefs />
      <DepthMark color={ACCENT} onClick={() => setDrawerOpen(true)} />

      <h1 className="mt-4 text-2xl font-bold">Uniform archive</h1>
      <p className="mt-0.5 text-xs" style={{ color: '#6b7686' }}>
        {kits.length} kits · 32 teams
      </p>

      {/* One horizontally-scrollable filter bar (mobile-first): kind chips, then the
          Current-only toggle and era select. `-mx-4 px-4` bleeds it to the screen edges so
          items scroll under the padding instead of being clipped mid-chip. */}
      <div
        className="mt-4 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: 'none' }}
        role="group"
        aria-label="Filter kits">
        {KIND_OPTIONS.map((k) => (
          <Pill
            key={k.value}
            active={filters.kind === k.value}
            onClick={() => setFilters((f) => ({ ...f, kind: k.value }))}>
            {k.label}
          </Pill>
        ))}
        <span
          aria-hidden="true"
          className="shrink-0"
          style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }}
        />
        <Pill
          active={filters.currentOnly}
          onClick={() => setFilters((f) => ({ ...f, currentOnly: !f.currentOnly }))}>
          Current only
        </Pill>
        <select
          aria-label="Filter by era"
          value={filters.era}
          onChange={(e) => setFilters((f) => ({ ...f, era: e.target.value }))}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#c8cdd6', border: 'none' }}>
          <option value="all">All eras</option>
          {eras.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 text-sm" style={{ color: '#A5ACAF' }}>
          No kits match these filters.
        </p>
      ) : (
        groups.map((g) => (
          <section key={`${g.conference}-${g.division}`} className="mt-7">
            <h2
              className="mb-4 pb-1.5 text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: '#5f6b7a', borderBottom: '1px solid #1a2233' }}>
              {g.conference} {g.division.toUpperCase()}
            </h2>
            {g.teams.map((t) => {
              const home = t.kits.find((k) => k.kind === 'home') ?? t.kits[0];
              return (
                <div key={t.teamId} className="mb-6 flex gap-3">
                  <span
                    className="shrink-0 rounded-full"
                    style={{
                      width: 3,
                      background: `linear-gradient(${home.colors.primary}, ${home.colors.secondary})`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-2 text-sm font-bold">{t.teamName}</h3>
                    <div className="flex flex-wrap gap-x-5 gap-y-3">
                      {t.kits.map((k) => (
                        <figure key={k.id} className="w-16 text-center">
                          <UniformFigure
                            colors={k.colors}
                            variant="full"
                            size={54}
                            imagePath={k.imagePath}
                            title={`${t.teamName} ${k.name}`}
                            sharedDefs
                          />
                          <figcaption
                            className="mt-1 text-[10px] leading-tight"
                            style={{ color: '#9aa4b2' }}>
                            {k.name}
                            {k.yearStart ? (
                              <span className="block" style={{ color: '#5f6b7a' }}>
                                {k.yearStart}
                                {k.yearEnd ? `–${k.yearEnd}` : '–'}
                              </span>
                            ) : null}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}

      <footer className="mt-10 text-[11px]" style={{ color: '#4b5568' }}>
        <p>
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
        </p>
        <p className="mt-2">
          All kits shown here are drawn SVG references, not official NFL-owned images. For a more
          detailed uniform archive, see{' '}
          <a
            href="https://www.gridiron-uniforms.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline">
            Gridiron Uniforms
          </a>
          .
        </p>
      </footer>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} accent={ACCENT} />
    </main>
  );
}
