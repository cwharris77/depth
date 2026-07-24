'use client';

import { useMemo, useState } from 'react';
import type { TeamMeta, UniformListing } from '@/lib/roster-source';
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
import TeamPageShell from './TeamPageShell';
import FilterPill from './ui/FilterPill';
import { colors as uiTokens } from '@/components/ui/tokens';

// The uniform archive (roadmap Phase 7). Receives every kit from the server route and
// filters/groups client-side with the pure helpers in lib/uniforms/filter. State-only — no
// data fetching. Editorial layout: division headers, a per-team color accent bar, then the
// team's kits as generated vector uniforms (UniformFigure). Below `xl`, nav is the logo ->
// drawer (mobile); at `xl` a persistent TeamPageShell/TeamRail replaces it (Desktop shell
// for uniform archive and compare pages ticket) — the archive has no current team, so the
// rail renders with no team/activePage and nav tints stay the neutral `uiTokens.accent`.
// Each division's teams go from one full-bleed row each to a 2/3-column grid at `lg`/`xl`
// (Uniform archive layout on laptop screens ticket) — a separate, lower breakpoint than the
// shell's `xl` rail switch, since the grid should densify before there's room for a rail.

const KIND_OPTIONS: { value: UniformKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All kits' },
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'throwback', label: 'Throwback' },
  { value: 'alternate', label: 'Alternate' },
  { value: 'color-rush', label: 'Color rush' },
];

export default function UniformArchive({
  kits,
  teams,
}: {
  kits: UniformListing[];
  teams: TeamMeta[];
}) {
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
    <TeamPageShell teams={teams} accent={uiTokens.accent}>
      <div
        style={{
          minHeight: '100dvh',
          background: uiTokens.bg,
          color: uiTokens.textPrimary,
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        }}
        className="px-4">
        {/* Mounted once for the whole page: every UniformFigure below passes sharedDefs so its
          mannequin geometry (helmet/facemask/jersey/pants/…) references this sprite via <use>
          instead of re-embedding the path data per kit — see components/UniformFigure.tsx. */}
        <UniformFigureDefs />
        {/* Below xl: the mark opens the nav drawer. At xl the drawer's destinations live in
          the persistent TeamRail (TeamPageShell above), so the mark hides — same pattern as
          TeamPageHeader. */}
        <div className="xl:hidden">
          <DepthMark color={uiTokens.accent} onClick={() => setDrawerOpen(true)} />
        </div>

        <h1 className="mt-4 text-2xl font-bold">Uniform archive</h1>
        <p className="mt-0.5 text-xs" style={{ color: uiTokens.textFaint }}>
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
            <FilterPill
              key={k.value}
              active={filters.kind === k.value}
              onClick={() => setFilters((f) => ({ ...f, kind: k.value }))}>
              {k.label}
            </FilterPill>
          ))}
          <span
            aria-hidden="true"
            className="shrink-0"
            style={{ width: 1, alignSelf: 'stretch', background: uiTokens.borderStrong }}
          />
          <FilterPill
            active={filters.currentOnly}
            onClick={() => setFilters((f) => ({ ...f, currentOnly: !f.currentOnly }))}>
            Current only
          </FilterPill>
          <select
            aria-label="Filter by era"
            value={filters.era}
            onChange={(e) => setFilters((f) => ({ ...f, era: e.target.value }))}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs"
            style={{
              background: uiTokens.surfaceInput,
              color: uiTokens.textSecondary,
              border: 'none',
            }}>
            <option value="all">All eras</option>
            {eras.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        {groups.length === 0 ? (
          <p className="mt-10 text-sm" style={{ color: uiTokens.textMuted }}>
            No kits match these filters.
          </p>
        ) : (
          groups.map((g) => (
            <section key={`${g.conference}-${g.division}`} className="mt-7">
              <h2
                className="mb-4 pb-1.5 text-[10px] font-semibold tracking-[0.2em]"
                style={{
                  color: uiTokens.textFaint,
                  borderBottom: `1px solid ${uiTokens.borderDrawer}`,
                }}>
                {g.conference} {g.division.toUpperCase()}
              </h2>
              {/* lg and up: teams sit side by side instead of one full-bleed row each — the
                  per-team kit layout below (flex flex-wrap) is unchanged, only this
                  team-to-team arrangement gets denser (Uniform archive layout on laptop
                  screens ticket). */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 xl:grid-cols-3">
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
                                style={{ color: uiTokens.textMuted }}>
                                {k.name}
                                {k.yearStart ? (
                                  <span className="block" style={{ color: uiTokens.textFaint }}>
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
              </div>
            </section>
          ))
        )}

        <footer className="mt-10 text-[11px]" style={{ color: uiTokens.textFaintest }}>
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

        <NavDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          accent={uiTokens.accent}
        />
      </div>
    </TeamPageShell>
  );
}
