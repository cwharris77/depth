'use client';

// Two-team position-depth comparison (roadmap Phase 5d, docs/superpowers/specs/
// 2026-07-07-compare-view-design.md). Receives the two teams' position groups (already
// resolved server-side by app/compare/page.tsx) plus the lightweight all-32 team list
// for the pickers — never a whole roster. Picker and position-chip changes push new
// query params via router.replace so the server component re-resolves; this component
// does no data fetching of its own.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Columns2 } from 'lucide-react';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';
import TeamPageShell from './TeamPageShell';
import FilterPill from '@/components/ui/FilterPill';
import { colors as uiTokens } from '@/components/ui/tokens';
import { COMPARE_POSITIONS } from '@/lib/compare';
import { statusColor } from '@/lib/colors';
import { formatLastName } from '@/lib/format';
import type { TeamMeta } from '@/lib/roster-source';
import { playerDeepLinkPath } from '@/lib/share';
import type { Player, Position } from '@/lib/types';

export interface CompareSide {
  team: TeamMeta;
  players: Player[];
}

interface CompareTableProps {
  teams: TeamMeta[];
  a?: CompareSide;
  b?: CompareSide;
  position: Position;
}

type Slot = 'a' | 'b';

function buildComparePath(a: string | undefined, b: string | undefined, pos: Position): string {
  const params = new URLSearchParams();
  if (a) params.set('a', a);
  if (b) params.set('b', b);
  params.set('pos', pos);
  return `/compare?${params.toString()}`;
}

export default function CompareTable({ teams, a, b, position }: CompareTableProps) {
  const router = useRouter();
  const [pickingSlot, setPickingSlot] = useState<Slot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const updateUrl = (next: { a?: string; b?: string; pos?: Position }) => {
    router.replace(
      buildComparePath(
        'a' in next ? next.a : a?.team.id,
        'b' in next ? next.b : b?.team.id,
        next.pos ?? position
      ),
      { scroll: false }
    );
  };

  const openPlayer = (teamId: string, playerId: string) => {
    router.push(playerDeepLinkPath(teamId, playerId));
  };

  // Narrows a/b together so the table below never needs a non-null assertion.
  const both = a && b ? { a, b } : null;
  const sameTeam = both !== null && both.a.team.id === both.b.team.id;
  const rowCount = Math.max(a?.players.length ?? 0, b?.players.length ?? 0);
  const noPlayersEitherSide = both !== null && rowCount === 0;

  return (
    <TeamPageShell teams={teams} accent={uiTokens.accent}>
      <div
        className="relative px-4"
        style={{
          minHeight: '100dvh',
          background: uiTokens.bg,
          color: uiTokens.textPrimary,
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        }}>
        {/* Bounded to a reading-width column at xl — the table this page centers on has a
            fixed, fairly narrow natural width (rank + two team columns), so letting it
            stretch full-bleed inside TeamPageShell's main column (the un-styled default
            before this pass) just reads as an empty, un-designed page. UniformArchive is
            genuinely full-width content (a wrapping kit grid) so it doesn't bound its own
            width the same way — this page's content shape is different, not a house
            convention. The shell's own rail (Desktop shell for uniform archive and compare
            pages ticket) is for navigating away from compare — to a team page, to
            /uniforms — not for picking the a/b slots below, which stay this page's own
            inline pickers. */}
        <div className="mx-auto xl:max-w-2xl xl:pt-10">
          {/* Below xl: the mark opens the nav drawer. At xl the drawer's destinations live
              in the persistent TeamRail (TeamPageShell above), so the mark hides. */}
          <div className="flex items-center justify-between xl:hidden">
            <DepthMark color={uiTokens.accent} onClick={() => setDrawerOpen(true)} />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `${uiTokens.accent}1a`,
                border: `1px solid ${uiTokens.accent}40`,
              }}>
              <Columns2 size={17} color={uiTokens.accent} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Compare teams</h1>
              <p className="mt-0.5 text-xs" style={{ color: uiTokens.textFaint }}>
                Pick two teams and a position to see who has the deeper room.
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

          {sameTeam && (
            <p className="mt-2.5 text-xs font-semibold" style={{ color: uiTokens.textFaint }}>
              Same team on both sides
            </p>
          )}

          {/* Position chip row — horizontally scrollable on mobile (same pattern as the
            uniform archive's kind filter, components/UniformArchive.tsx); at xl there's
            room to wrap the full position list instead of hiding most of it behind a
            scroll affordance. */}
          <div
            className="mt-5 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 xl:mx-0 xl:flex-wrap xl:overflow-visible xl:px-0 xl:pb-0"
            style={{ scrollbarWidth: 'none' }}
            role="group"
            aria-label="Filter by position">
            {COMPARE_POSITIONS.map((pos) => (
              <FilterPill key={pos} active={pos === position} onClick={() => updateUrl({ pos })}>
                {pos}
              </FilterPill>
            ))}
          </div>

          <div className="mt-5 pb-6">
            {!both ? (
              <ComparePrompt aSide={a} bSide={b} />
            ) : noPlayersEitherSide ? (
              <EmptyPositionState position={position} />
            ) : (
              <CompareRows a={both.a} b={both.b} rowCount={rowCount} onOpenPlayer={openPlayer} />
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

        <NavDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          accent={uiTokens.accent}
        />
      </div>
    </TeamPageShell>
  );
}

function TeamSlotButton({ side, onClick }: { side?: CompareSide; onClick: () => void }) {
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
  const { team } = side;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        background: `${team.colors.uiAccent}1a`,
        border: `1px solid ${team.colors.uiAccent}55`,
        touchAction: 'manipulation',
      }}>
      <div
        className="text-[11px] font-bold tracking-widest"
        style={{ color: team.colors.uiAccent }}>
        {team.abbrev}
      </div>
      <div className="truncate text-sm font-bold" style={{ color: uiTokens.textPrimary }}>
        {team.city} {team.name}
      </div>
      <div
        className="mt-0.5 text-[10px] font-semibold opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ color: uiTokens.textFaint }}>
        Tap to change
      </div>
    </button>
  );
}

// Shown when at least one slot is still unpicked — teaches the interface instead of a
// bare sentence: names both remaining steps (pick a team, pick a position) so a first-time
// visitor knows what the two rows above the fold are for.
function ComparePrompt({ aSide, bSide }: { aSide?: CompareSide; bSide?: CompareSide }) {
  const pickedCount = [aSide, bSide].filter(Boolean).length;
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center"
      style={{ border: `1px dashed ${uiTokens.borderSubtle}`, background: uiTokens.surfaceCard2 }}>
      <Columns2 size={22} color={uiTokens.textFaintest} />
      <p className="text-sm font-bold" style={{ color: uiTokens.textSecondary }}>
        {pickedCount === 0 ? 'Pick two teams to compare' : 'Pick one more team'}
      </p>
      <p className="max-w-[32ch] text-xs" style={{ color: uiTokens.textFaint }}>
        Their depth at the selected position lines up side by side, rank for rank.
      </p>
    </div>
  );
}

function EmptyPositionState({ position }: { position: Position }) {
  return (
    <div
      className="rounded-2xl px-6 py-10 text-center text-sm font-semibold"
      style={{
        border: `1px solid ${uiTokens.borderDefault}`,
        background: uiTokens.surfaceCard2,
        color: uiTokens.textMuted,
      }}>
      Neither team lists a {position}
    </div>
  );
}

function CompareRows({
  a,
  b,
  rowCount,
  onOpenPlayer,
}: {
  a: CompareSide;
  b: CompareSide;
  rowCount: number;
  onOpenPlayer: (teamId: string, playerId: string) => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ border: `1px solid ${uiTokens.borderDefault}` }}>
      <div className="grid grid-cols-[36px_1fr_1fr]" style={{ background: uiTokens.surfaceCard2 }}>
        <div />
        <TeamHeaderCell team={a.team} />
        <TeamHeaderCell team={b.team} />
      </div>
      {Array.from({ length: rowCount }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[36px_1fr_1fr] items-stretch"
          style={{
            borderTop: `1px solid ${uiTokens.borderSubtle}`,
            // Zebra striping reads more like a real data table at desktop width, where a
            // 2-column grid with no row separation otherwise looks empty and unfinished.
            background: i % 2 === 1 ? uiTokens.surfaceCard2 : 'transparent',
          }}>
          <div className="flex items-center justify-center">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: uiTokens.surfaceChip, color: uiTokens.textFaint }}>
              {i + 1}
            </span>
          </div>
          <PlayerCell player={a.players[i]} team={a.team} onOpen={onOpenPlayer} />
          <PlayerCell player={b.players[i]} team={b.team} onOpen={onOpenPlayer} />
        </div>
      ))}
    </div>
  );
}

function TeamHeaderCell({ team }: { team: TeamMeta }) {
  return (
    <div
      className="min-w-0 px-2 py-3 text-center"
      style={{ color: team.colors.uiAccent, background: `${team.colors.uiAccent}12` }}>
      <div className="text-xs font-black tracking-widest">{team.abbrev}</div>
      <div className="truncate text-[10px] font-semibold" style={{ color: uiTokens.textMuted }}>
        {team.city}
      </div>
    </div>
  );
}

function PlayerCell({
  player,
  team,
  onOpen,
}: {
  player?: Player;
  team: TeamMeta;
  onOpen: (teamId: string, playerId: string) => void;
}) {
  if (!player) {
    return (
      <div
        className="flex items-center justify-center py-3"
        style={{ color: uiTokens.textFaintest }}>
        —
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(team.id, player.id)}
      className="flex min-w-0 items-center justify-center gap-1.5 px-1.5 py-3 transition-colors duration-150 hover:bg-white/[0.04]"
      style={{ touchAction: 'manipulation' }}>
      <span
        aria-hidden="true"
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: statusColor(player.status, team.colors) }}
      />
      <span className="min-w-0 truncate text-xs font-bold" style={{ color: uiTokens.textPrimary }}>
        <span className="font-normal" style={{ color: uiTokens.textFaint }}>
          #{player.number}
        </span>{' '}
        {/* Mobile keeps two columns rather than stacking (Decisions table "Mobile") —
            last-name-only below 480px is what keeps both columns legible at that width. */}
        <span className="hidden min-[480px]:inline">{player.name}</span>
        <span className="inline min-[480px]:hidden">{formatLastName(player.name)}</span>
      </span>
    </button>
  );
}
