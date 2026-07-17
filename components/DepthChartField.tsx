'use client';

import { readableTextOn } from '@/lib/colors';
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
import { BarChart2, Check, ChevronDown, RotateCcw, Search, Share2, Shirt } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import BottomSheet from './BottomSheet';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';
import OpenPlayerFromQuery from './OpenPlayerFromQuery';
import PlayerCard from './PlayerCard';
import PlayerDot from './PlayerDot';
import SharedBoardBanner from './SharedBoardBanner';
import UniformSheet from './UniformSheet';

const UNIT_LABELS: Record<Unit, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special',
};

// Pure client component: it receives one resolved roster as a prop and never
// imports the team registry, so a page ships only its own team's data — not all 32.
//
// showUniformPicker is the Phase 7 launch gate (lib/flags.ts), evaluated server-side
// in the page. The picker is code-complete but stays hidden until launch (see
// 2026-07-07-phase-7-uniform-launch-design.md). With it false the view renders in
// the Home kit (= team.colors), i.e. exactly as before Phase 7.
export default function DepthChartField({
  roster,
  teams,
  showUniformPicker,
  showIsolatedSearchBarIcon,
}: {
  roster: TeamRoster;
  teams: TeamMeta[];
  showUniformPicker: boolean;
  showIsolatedSearchBarIcon: boolean;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>('offense');
  const [navOpen, setNavOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

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
        <div className="flex items-center justify-between">
          {/* Wordmark doubles as the navigation-drawer trigger (left), where a menu
              conventionally lives. Global/growing nav (uniform archive, future views) opens
              here so the header stays uncrowded — see components/NavDrawer.tsx. */}

          <DepthMark color={activeColors.uiAccent} onClick={() => setDrawerOpen(true)} />
          {/* Team/unit switcher trigger — on the right, where users (Mia, Caleb)
              instinctively tapped expecting a menu. Styled as a visible pill, not
              plain text, so it reads as tappable. A search-icon circle sits beside
              it as a direct jump into the switcher's search bar. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Switch team or search players"
              className="flex items-center gap-1.5 text-left min-w-0 rounded-full pl-3 pr-2 py-1.5"
              style={{
                touchAction: 'manipulation',
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${activeColors.uiAccent}40`,
              }}>
              <h1
                className="text-[10px] font-semibold tracking-widest truncate"
                style={{ color: activeColors.uiAccent }}>
                {team.city.toUpperCase()} {team.name.toUpperCase()}
              </h1>
              <ChevronDown size={14} color="#A5ACAF" className="shrink-0" />
            </button>
            {showIsolatedSearchBarIcon && (
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Search teams or players"
                className="shrink-0 flex items-center justify-center rounded-full p-2"
                style={{
                  touchAction: 'manipulation',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${activeColors.uiAccent}40`,
                }}>
                <Search size={14} color={activeColors.uiAccent} />
              </button>
            )}
            <Link
              href={`/team/${team.id}/stats`}
              aria-label="Team stats"
              className="shrink-0 flex items-center justify-center rounded-full p-2"
              style={{
                touchAction: 'manipulation',
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${activeColors.uiAccent}40`,
              }}>
              <BarChart2 size={14} color={activeColors.uiAccent} />
            </Link>
            {showUniformPicker && (
              <button
                type="button"
                onClick={() => setKitOpen(true)}
                aria-label="Choose uniform"
                className="shrink-0 flex items-center justify-center rounded-full p-2"
                style={{
                  touchAction: 'manipulation',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${activeColors.uiAccent}40`,
                }}>
                <Shirt size={14} color={activeColors.uiAccent} />
              </button>
            )}
            <button
              type="button"
              onClick={handleShareRoster}
              aria-label={shareCopied ? 'Roster link copied' : 'Share this roster'}
              className="shrink-0 flex items-center justify-center rounded-full p-2"
              style={{
                touchAction: 'manipulation',
                background: shareCopied ? `${activeColors.uiAccent}26` : 'rgba(255,255,255,0.07)',
                border: `1px solid ${activeColors.uiAccent}40`,
              }}>
              {shareCopied ? (
                <Check size={14} color={activeColors.uiAccent} strokeWidth={3} />
              ) : (
                <Share2 size={14} color={activeColors.uiAccent} />
              )}
            </button>
          </div>
        </div>
        {/* On its own row, 24px below the header line, so it never crowds the
            team-switcher tap target the way sharing a row used to. */}
        <div
          className="flex rounded-xl p-1 gap-1 mt-6"
          style={{ background: 'rgba(255,255,255,0.07)', width: 'fit-content' }}>
          {(['offense', 'defense', 'special'] as const).map((unit) => {
            // The pill fills with the team's brand primary, which can be any
            // hue — uiAccent is only guaranteed to read on the dark app
            // background, not on primary (e.g. Chiefs' #FF4D5E uiAccent on
            // its #E31837 primary is ~1.45:1, illegible red-on-red). Derive
            // the label color from primary itself instead.
            const activeText = readableTextOn(activeColors.primary);
            return (
              <button
                key={unit}
                onClick={() => {
                  setActiveUnit(unit);
                  setSelectedPlayer(null);
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: activeUnit === unit ? activeColors.primary : 'transparent',
                  color: activeUnit === unit ? activeText : '#A5ACAF',
                  border:
                    activeUnit === unit ? `1px solid ${activeText}66` : '1px solid transparent',
                  touchAction: 'manipulation',
                }}>
                {UNIT_LABELS[unit]}
              </button>
            );
          })}
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

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        accent={activeColors.uiAccent}
      />

      <FullScreenSheet isOpen={navOpen}>
        <NavSwitcher
          roster={themedRoster}
          teams={teams}
          onSelectPlayer={handleNavSelectPlayer}
          onClose={() => setNavOpen(false)}
        />
      </FullScreenSheet>

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
