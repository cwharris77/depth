'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Columns2 } from 'lucide-react';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';
import TeamPageShell from './TeamPageShell';
import { colors as uiTokens } from '@/components/ui/tokens';
import type { TeamMeta } from '@/lib/roster-source';
import type { TeamStats } from '@/lib/types';
import { useLastAccent } from '@/lib/use-last-accent';

interface TeamCompareSide {
  team: TeamMeta;
  stats?: TeamStats;
}

interface TeamCompareTableProps {
  teams: TeamMeta[];
  a?: TeamCompareSide;
  b?: TeamCompareSide;
}

type Slot = 'a' | 'b';

function buildComparePath(a: string | undefined, b: string | undefined): string {
  const params = new URLSearchParams();
  if (a) params.set('a', a);
  if (b) params.set('b', b);
  return `/compare?${params.toString()}`;
}

function record(stats?: TeamStats): string {
  if (!stats) return '—';
  return stats.overallTies
    ? `${stats.overallWins}-${stats.overallLosses}-${stats.overallTies}`
    : `${stats.overallWins}-${stats.overallLosses}`;
}

function wl(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

function StatLine({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div
      className="grid grid-cols-[1fr_70px_1fr] items-center gap-2 py-2.5 text-xs"
      style={{ borderTop: `1px solid ${uiTokens.borderSubtle}` }}>
      <div className="truncate text-right font-bold" style={{ color: uiTokens.textPrimary }}>
        {a}
      </div>
      <div className="text-center text-[10px] font-bold" style={{ color: uiTokens.textFaint }}>
        {label}
      </div>
      <div className="truncate font-bold" style={{ color: uiTokens.textPrimary }}>
        {b}
      </div>
    </div>
  );
}

function TeamSlotButton({ side, onClick }: { side?: TeamCompareSide; onClick: () => void }) {
  if (!side) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 rounded-2xl px-4 py-5 text-center text-sm font-bold transition-colors duration-150 hover:bg-white/[0.03]"
        style={{
          border: `1px dashed ${uiTokens.borderInput}`,
          color: uiTokens.textFaint,
          touchAction: 'manipulation',
        }}>
        Pick a team
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        background: `${side.team.colors.uiAccent}1a`,
        border: `1px solid ${side.team.colors.uiAccent}55`,
        touchAction: 'manipulation',
      }}>
      <div
        className="text-[11px] font-bold tracking-widest"
        style={{ color: side.team.colors.uiAccent }}>
        {side.team.abbrev}
      </div>
      <div className="truncate text-sm font-bold" style={{ color: uiTokens.textPrimary }}>
        {side.team.city} {side.team.name}
      </div>
      <div
        className="mt-0.5 text-[10px] font-semibold opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ color: uiTokens.textFaint }}>
        Tap to change
      </div>
    </button>
  );
}

function TeamHeader({ side }: { side: TeamCompareSide }) {
  return (
    <div className="min-w-0 text-center">
      <div
        className="text-[11px] font-black tracking-widest"
        style={{ color: side.team.colors.uiAccent }}>
        {side.team.abbrev}
      </div>
      <div className="truncate text-xs font-bold" style={{ color: uiTokens.textPrimary }}>
        {side.team.city}
      </div>
      {side.stats && (
        <div className="mt-1 text-[10px] font-bold" style={{ color: uiTokens.textFaint }}>
          {side.stats.season}
        </div>
      )}
    </div>
  );
}

function ComparePrompt({ aSide, bSide }: { aSide?: TeamCompareSide; bSide?: TeamCompareSide }) {
  const pickedCount = [aSide, bSide].filter(Boolean).length;
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center"
      style={{ border: `1px dashed ${uiTokens.borderSubtle}`, background: uiTokens.surfaceCard2 }}>
      <Columns2 size={22} color={uiTokens.textFaintest} />
      <p className="text-sm font-bold" style={{ color: uiTokens.textSecondary }}>
        {pickedCount === 0 ? 'Pick two teams to compare' : 'Pick one more team'}
      </p>
      <p className="max-w-[32ch] text-xs" style={{ color: uiTokens.textFaint }}>
        Their record, points, and home-road splits line up side by side.
      </p>
    </div>
  );
}

function TeamComparison({ a, b }: { a: TeamCompareSide; b: TeamCompareSide }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ border: `1px solid ${uiTokens.borderDefault}` }}>
      <div className="grid grid-cols-[1fr_70px_1fr] items-center gap-2 px-3 py-4">
        <TeamHeader side={a} />
        <div className="text-center text-[10px] font-black" style={{ color: uiTokens.textFaint }}>
          VS
        </div>
        <TeamHeader side={b} />
      </div>
      <StatLine label="RECORD" a={record(a.stats)} b={record(b.stats)} />
      <StatLine
        label="PTS FOR"
        a={a.stats ? String(a.stats.pointsFor) : '—'}
        b={b.stats ? String(b.stats.pointsFor) : '—'}
      />
      <StatLine
        label="PTS AGAINST"
        a={a.stats ? String(a.stats.pointsAgainst) : '—'}
        b={b.stats ? String(b.stats.pointsAgainst) : '—'}
      />
      <StatLine
        label="HOME"
        a={a.stats ? wl(a.stats.homeWins, a.stats.homeLosses) : '—'}
        b={b.stats ? wl(b.stats.homeWins, b.stats.homeLosses) : '—'}
      />
      <StatLine
        label="ROAD"
        a={a.stats ? wl(a.stats.roadWins, a.stats.roadLosses) : '—'}
        b={b.stats ? wl(b.stats.roadWins, b.stats.roadLosses) : '—'}
      />
    </div>
  );
}

export default function TeamCompareTable({ teams, a, b }: TeamCompareTableProps) {
  const router = useRouter();
  const [pickingSlot, setPickingSlot] = useState<Slot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const accent = useLastAccent();
  const both = a && b ? { a, b } : null;

  const updateUrl = (next: { a?: string; b?: string }) => {
    router.replace(
      buildComparePath('a' in next ? next.a : a?.team.id, 'b' in next ? next.b : b?.team.id),
      {
        scroll: false,
      }
    );
  };

  return (
    <TeamPageShell teams={teams} accent={accent}>
      <div
        className="relative px-4"
        style={{
          minHeight: '100dvh',
          background: uiTokens.bg,
          color: uiTokens.textPrimary,
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        }}>
        <div className="mx-auto xl:max-w-2xl xl:pt-10">
          <div className="flex items-center justify-between xl:hidden">
            <DepthMark color={accent} onClick={() => setDrawerOpen(true)} />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${accent}1a`, border: `1px solid ${accent}40` }}>
              <Columns2 size={17} color={accent} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Team matchup</h1>
              <p className="mt-0.5 text-xs" style={{ color: uiTokens.textFaint }}>
                Compare the latest season snapshot for two teams.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <TeamSlotButton side={a} onClick={() => setPickingSlot('a')} />
            <span
              className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
              style={{ background: uiTokens.surfaceChip, color: uiTokens.textFaint }}
              aria-hidden="true">
              VS
            </span>
            <TeamSlotButton side={b} onClick={() => setPickingSlot('b')} />
          </div>

          <div className="mt-5 pb-6">
            {both ? (
              <TeamComparison a={both.a} b={both.b} />
            ) : (
              <ComparePrompt aSide={a} bSide={b} />
            )}
          </div>
        </div>

        <FullScreenSheet isOpen={pickingSlot !== null}>
          <NavSwitcher
            teams={teams}
            onSelectPlayer={() => {}}
            onClose={() => setPickingSlot(null)}
            onPickTeam={(id) => {
              if (pickingSlot === 'a') updateUrl({ a: id });
              else if (pickingSlot === 'b') updateUrl({ b: id });
              setPickingSlot(null);
            }}
          />
        </FullScreenSheet>

        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} accent={accent} />
      </div>
    </TeamPageShell>
  );
}
