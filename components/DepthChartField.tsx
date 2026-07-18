'use client';

import {
  applyTeamOverride,
  clearPositionOrder,
  clearTeamOverride,
  getTeamOverride,
  hasOverride,
  setPositionOrder,
  setTeamOverride,
  type TeamDepthOverride,
} from '@/lib/depth-overrides';
import { resolveUnit } from '@/lib/formations';
import { mergeOnSignIn, pushTeamOverride } from '@/lib/overrides-sync';
import type { TeamMeta } from '@/lib/roster-source';
import { unitForPosition } from '@/lib/search';
import { rosterShareUrlPath } from '@/lib/share';
import type { Player, Position, TeamRoster, Unit } from '@/lib/types';
import { useUser } from '@/lib/use-user';
import { Check, MoreHorizontal, RotateCcw, Share2, Shirt } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import BottomSheet from './BottomSheet';
import OpenPlayerFromQuery from './OpenPlayerFromQuery';
import PlayerCard from './PlayerCard';
import PlayerDot from './PlayerDot';
import SharedBoardBanner from './SharedBoardBanner';
import TeamPageHeader from './TeamPageHeader';
import UniformSheet from './UniformSheet';

const UNIT_LABELS: Record<Unit, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special',
};

// Pure client component: it receives one resolved roster as a prop and never
// imports the team registry, so a page ships only its own team's data — not all 32.
export default function DepthChartField({
  roster,
  teams,
}: {
  roster: TeamRoster;
  teams: TeamMeta[];
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>('offense');
  const [kitOpen, setKitOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Uniform picker + share collapse into a single "•••" menu (design spec 5a).
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!moreMenuRef.current?.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [moreMenuOpen]);

  const { team } = roster;

  // Selected uniform (roadmap Phase 7). Defaults to uniforms[0] — the synthesized Home
  // kit, i.e. the team's real colors — so the page opens exactly as before. Picking a
  // kit swaps the colors the whole view renders with (dots, card, header), so the field
  // "wears" the uniform. Reset to Home whenever the team changes.
  const [kitId, setKitId] = useState(roster.uniforms[0]?.id);
  useEffect(() => {
    setKitId(roster.uniforms[0]?.id);
  }, [roster.uniforms]);
  const activeUniform = roster.uniforms.find((u) => u.id === kitId) ?? roster.uniforms[0];
  const activeColors = activeUniform?.colors ?? team.colors;

  // The user's custom depth ordering for this team (localStorage cache). Applied to the
  // roster everything below renders from, so a reorder flows to the field dots and the card.
  // Signed in, every write is mirrored to the server and reconciled on sign-in below.
  const { user } = useUser();
  const [override, setOverride] = useState<TeamDepthOverride>({});
  useEffect(() => {
    setOverride(getTeamOverride(team.id));
  }, [team.id]);

  // On sign-in, pull the durable server overrides (server wins) and push up any team edited
  // only on this device, then re-read the current team's order. mergeOnSignIn is idempotent
  // and self-guarded, so re-running on user change is safe; the [team.id] effect above keeps
  // the visible order fresh when switching teams.
  useEffect(() => {
    if (!user) return;
    mergeOnSignIn().then(() => setOverride(getTeamOverride(team.id)));
  }, [user?.id]);

  // Previewing a shared board (?board=<slug>, see SharedBoardBanner): the field renders the
  // owner's order WITHOUT persisting it, and reorder is disabled until the viewer taps Apply.
  // A non-null preview takes precedence over the viewer's own override. Reset on team change.
  const [previewOverride, setPreviewOverride] = useState<TeamDepthOverride | null>(null);
  useEffect(() => {
    setPreviewOverride(null);
  }, [team.id]);
  const previewing = previewOverride !== null;
  const effectiveOverride = previewOverride ?? override;

  const displayRoster = useMemo(
    () => applyTeamOverride(roster, effectiveOverride),
    [roster, effectiveOverride]
  );
  // Same roster (players/override), re-skinned in the selected kit's colors. One lever:
  // every child that reads team colors (dots via props, PlayerCard/NavSwitcher via
  // roster.team.colors) follows the kit through this.
  const themedRoster = useMemo(
    () => ({ ...displayRoster, team: { ...displayRoster.team, colors: activeColors } }),
    [displayRoster, activeColors]
  );
  const slots = resolveUnit(themedRoster, activeUnit);

  // Keep the open card's player in sync with the reordered roster (fresh depthRank/status).
  const displaySelected = selectedPlayer
    ? (displayRoster.players.find((p) => p.id === selectedPlayer.id) ?? selectedPlayer)
    : null;

  // Every override mutation writes localStorage first (the always-on cache), then mirrors the
  // team's new override to the server when signed in (fire-and-forget, last-write-wins).
  const syncTeam = (next: TeamDepthOverride) => {
    if (user) pushTeamOverride(team.id, next);
  };

  const handleReorder = (position: Position, orderedIds: string[]) => {
    setPositionOrder(team.id, position, orderedIds);
    const next = getTeamOverride(team.id);
    setOverride(next);
    syncTeam(next);
  };

  const handleResetPosition = (position: Position) => {
    clearPositionOrder(team.id, position);
    const next = getTeamOverride(team.id);
    setOverride(next);
    syncTeam(next);
  };

  const handleResetTeam = () => {
    clearTeamOverride(team.id);
    setOverride({});
    syncTeam({});
  };

  // Applying a shared roster link: persist the sender's order as this device's custom
  // order for the team, so the board matches "exactly as edited" and Reset still works.
  const handleApplySharedOrder = (shared: TeamDepthOverride) => {
    setTeamOverride(team.id, shared);
    const next = getTeamOverride(team.id);
    setOverride(next);
    syncTeam(next);
  };

  // Share the roster as it currently stands. Signed in: a durable `?board=<slug>` reference
  // link that tracks future edits (POST /api/share); signed out: the self-contained `?order=`
  // snapshot as before. Prefers the native share sheet, else copies with a brief check.
  const buildShareUrl = async (): Promise<string> => {
    if (user) {
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: team.id }),
        });
        if (res.ok) {
          const { slug } = (await res.json()) as { slug: string };
          return `${window.location.origin}/team/${encodeURIComponent(team.id)}?board=${slug}`;
        }
      } catch {
        // fall through to the offline-safe ?order= link
      }
    }
    const homeKitId = roster.uniforms[0]?.id;
    const sharedKitId = kitId && kitId !== homeKitId ? kitId : undefined;
    return window.location.origin + rosterShareUrlPath(team.id, override, sharedKitId);
  };

  const handleShareRoster = async () => {
    const url = await buildShareUrl();
    const title = `${team.city} ${team.name} depth chart · Depth`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // share sheet dismissed / unavailable — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — no-op
    }
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player));
  };

  // A player picked from the nav's player search jumps the field to their unit,
  // then opens them — same behavior the old header search had.
  const handleNavSelectPlayer = (player: Player) => {
    setActiveUnit(unitForPosition(player.position));
    setSelectedPlayer(player);
  };

  return (
    <div
      className="flex flex-col mx-auto w-full"
      style={{
        height: '100dvh',
        maxWidth: 720,
        overflow: 'hidden',
        background: '#0a0e1a',
        position: 'relative',
      }}>
      {/* Header */}
      <div
        className="px-5 pb-3"
        style={{
          background: '#0a0e1a',
          flex: '0 0 auto',
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
        }}>
        <TeamPageHeader
          team={team}
          teams={teams}
          colors={activeColors}
          activePage="roster"
          currentTeamPlayers={themedRoster.players}
          onSelectPlayer={handleNavSelectPlayer}
        />
        {/* On its own row, 20px below the header line: unit tabs as underline
            tabs (left) and the collapsed uniform/share "•••" menu (right) —
            visually distinct from the page switcher above so the two levels
            don't read as duplicate controls (design spec 5a). */}
        <div
          className="flex items-center justify-between mt-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-4">
            {(['offense', 'defense', 'special'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => {
                  setActiveUnit(unit);
                  setSelectedPlayer(null);
                }}
                className="pb-2.5 text-[11px] font-bold"
                style={{
                  borderBottom: `2px solid ${activeUnit === unit ? activeColors.uiAccent : 'transparent'}`,
                  color: activeUnit === unit ? '#f0f4ff' : '#7d848c',
                  touchAction: 'manipulation',
                }}>
                {UNIT_LABELS[unit].toUpperCase()}
              </button>
            ))}
          </div>
          <div className="relative pb-2.5" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen((open) => !open)}
              aria-label="More options"
              aria-expanded={moreMenuOpen}
              className="flex items-center justify-center px-1"
              style={{ touchAction: 'manipulation', color: '#A5ACAF' }}>
              <MoreHorizontal size={16} />
            </button>
            {moreMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
                style={{
                  background: '#161c2c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  minWidth: 168,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setKitOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap"
                  style={{ color: '#f0f4ff', touchAction: 'manipulation' }}>
                  <Shirt size={14} color={activeColors.uiAccent} />
                  Choose uniform
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    handleShareRoster();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap"
                  style={{
                    color: '#f0f4ff',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    touchAction: 'manipulation',
                  }}>
                  {shareCopied ? (
                    <Check size={14} color={activeColors.uiAccent} strokeWidth={3} />
                  ) : (
                    <Share2 size={14} color={activeColors.uiAccent} />
                  )}
                  {shareCopied ? 'Link copied' : 'Share roster'}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Tells the user this team's depth is their custom order, with one-tap revert.
            Hidden while previewing a shared board — that order isn't theirs to reset. */}
        {hasOverride(override) && !previewing && (
          <button
            type="button"
            onClick={handleResetTeam}
            className="flex items-center gap-1 mt-3 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              color: activeColors.uiAccent,
              background: `${activeColors.uiAccent}1a`,
              border: `1px solid ${activeColors.uiAccent}55`,
              width: 'fit-content',
              touchAction: 'manipulation',
            }}>
            <RotateCcw size={11} /> Custom order · Reset all
          </button>
        )}
        {/* Shared-board preview banner (Apply / Dismiss), pinned just above the field. */}
        <SharedBoardBanner
          currentTeam={team}
          teams={teams}
          accent={activeColors.uiAccent}
          onPreview={setPreviewOverride}
          onApply={handleApplySharedOrder}
        />
      </div>

      {/* Field — fills remaining viewport space */}
      <div
        className="px-3 flex flex-col"
        style={{
          flex: '1 1 0',
          minHeight: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        }}>
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            flex: '1 1 0',
            minHeight: 0,
            background:
              'linear-gradient(180deg, #1e3d10 0%, #2d5a1b 40%, #2d5a1b 60%, #1e3d10 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 4px 32px rgba(0,0,0,0.6)',
          }}>
          <FieldMarkings />

          {slots.map((slot) => {
            const player = slot.player;
            if (!player) return null;
            return (
              <PlayerDot
                key={slot.key}
                player={player}
                slot={slot}
                isSelected={selectedPlayer?.id === player.id}
                onClick={handlePlayerClick}
                teamPrimary={activeColors.primary}
                teamColors={activeColors}
                unit={activeUnit}
              />
            );
          })}
        </div>
      </div>

      <BottomSheet isOpen={kitOpen} onClose={() => setKitOpen(false)}>
        <UniformSheet
          uniforms={roster.uniforms}
          activeId={activeUniform?.id ?? ''}
          accent={activeColors.uiAccent}
          onSelect={setKitId}
          onClose={() => setKitOpen(false)}
        />
      </BottomSheet>

      <PlayerCard
        player={displaySelected}
        roster={themedRoster}
        onClose={() => setSelectedPlayer(null)}
        onSelectPlayer={setSelectedPlayer}
        {...(previewing
          ? {}
          : {
              onReorder: handleReorder,
              onResetPosition: handleResetPosition,
              isPositionCustom: displaySelected ? !!override[displaySelected.position] : false,
            })}
      />

      <OpenPlayerFromQuery players={displayRoster.players} onOpen={handleNavSelectPlayer} />

      <ApplyKitFromQuery validIds={roster.uniforms.map((u) => u.id)} onApply={setKitId} />

      <ApplySharedOrder onApply={handleApplySharedOrder} />
    </div>
  );
}

function FieldMarkings() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      {/* yard lines spaced every 10% */}
      {[10, 20, 30, 40, 60, 70, 80, 90].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.4"
        />
      ))}
      {/* end zones */}
      <rect x="0" y="0" width="100" height="6" fill="rgba(0,34,68,0.3)" />
      <rect x="0" y="94" width="100" height="6" fill="rgba(0,34,68,0.3)" />
      {/* line of scrimmage — solid blue, matching TV broadcast overlays */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="#2d6fe0" strokeWidth="0.6" />
      {/* hash marks */}
      {[15, 25, 35, 45, 55, 65, 75, 85].map((y) => (
        <g key={`hash-${y}`}>
          <line x1="32" y1={y} x2="35" y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
          <line x1="65" y1={y} x2="68" y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        </g>
      ))}
    </svg>
  );
}
