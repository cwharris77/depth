'use client';

// Two-team position-depth comparison (roadmap Phase 5d, docs/superpowers/specs/
// 2026-07-07-compare-view-design.md). Receives the two teams' position groups (already
// resolved server-side by app/compare/page.tsx) plus the lightweight all-32 team list
// for the pickers — never a whole roster. Picker and position-chip changes push new
// query params via router.replace so the server component re-resolves; this component
// does no data fetching of its own.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';
import FilterPill from '@/components/ui/FilterPill';
import { colors as uiTokens } from '@/components/ui/tokens';
import { COMPARE_POSITIONS } from '@/lib/compare';
import { statusColor } from '@/lib/colors';
import { formatLastName, ordinal } from '@/lib/format';
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
    <main
      className="relative px-4"
      style={{
        minHeight: '100dvh',
        background: uiTokens.bg,
        color: uiTokens.textPrimary,
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
      }}>
      <DepthMark color={uiTokens.accent} onClick={() => setDrawerOpen(true)} />

      <h1 className="mt-4 text-2xl font-bold">Compare teams</h1>
      <p className="mt-0.5 text-xs" style={{ color: uiTokens.textFaint }}>
        Depth at a position, side by side.
      </p>

      <div className="mt-4 flex gap-3">
        <TeamSlotButton side={a} onClick={() => setPickingSlot('a')} />
        <TeamSlotButton side={b} onClick={() => setPickingSlot('b')} />
      </div>

      {sameTeam && (
        <p className="mt-2 text-xs" style={{ color: uiTokens.textFaint }}>
          Same team on both sides
        </p>
      )}

      {/* Position chip row — horizontally scrollable, same pattern as the uniform
          archive's kind filter (components/UniformArchive.tsx). */}
      <div
        className="mt-4 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1"
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
          <p className="text-sm" style={{ color: uiTokens.textMuted }}>
            Pick two teams to compare
          </p>
        ) : noPlayersEitherSide ? (
          <p className="text-sm" style={{ color: uiTokens.textMuted }}>
            Neither team lists a {position}
          </p>
        ) : (
          <CompareRows a={both.a} b={both.b} rowCount={rowCount} onOpenPlayer={openPlayer} />
        )}
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

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} accent={uiTokens.accent} />
    </main>
  );
}

function TeamSlotButton({ side, onClick }: { side?: CompareSide; onClick: () => void }) {
  if (!side) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-1 rounded-2xl px-4 py-6 text-center text-sm font-bold"
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
      className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-left"
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
    </button>
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
      <div className="grid grid-cols-[32px_1fr_1fr]" style={{ background: uiTokens.surfaceCard2 }}>
        <div />
        <TeamHeaderCell team={a.team} />
        <TeamHeaderCell team={b.team} />
      </div>
      {Array.from({ length: rowCount }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[32px_1fr_1fr] items-center"
          style={{ borderTop: `1px solid ${uiTokens.borderSubtle}` }}>
          <div
            className="py-3 text-center text-[9px] font-bold"
            style={{ color: uiTokens.textFaint }}>
            {ordinal(i + 1)}
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
    <div className="min-w-0 px-2 py-2.5 text-center" style={{ color: team.colors.uiAccent }}>
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
      <div className="py-3 text-center" style={{ color: uiTokens.textFaintest }}>
        —
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(team.id, player.id)}
      className="flex min-w-0 items-center justify-center gap-1.5 px-1.5 py-3"
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
