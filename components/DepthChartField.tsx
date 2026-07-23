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
import type { Player, PlayerSeasonStats, Position, TeamRoster, Unit } from '@/lib/types';
import { useUser } from '@/lib/use-user';
import { Check, MoreHorizontal, Pencil, RotateCcw, Share2, Shirt } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import BottomSheet from './BottomSheet';
import OpenPlayerFromQuery from './OpenPlayerFromQuery';
import PlayerCard from './PlayerCard';
import PlayerDot from './PlayerDot';
import SharedBoardBanner from './SharedBoardBanner';
import TeamPageHeader from './TeamPageHeader';
import TeamPageShell from './TeamPageShell';
import UniformSheet from './UniformSheet';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/lib/use-media-query';
import { colors as uiTokens } from '@/components/ui/tokens';
import Menu from '@/components/ui/Menu';
import TabBar from '@/components/ui/TabBar';

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
  playerStatsMap,
}: {
  roster: TeamRoster;
  teams: TeamMeta[];
  playerStatsMap?: Map<string, PlayerSeasonStats[]>;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>('offense');
  // Desktop docks the selected player's card in TeamPageShell's context panel instead
  // of the bottom sheet. Decided by matchMedia (not CSS show/hide) so only ONE
  // PlayerCard ever mounts — two would double its per-player stats fetch. Selection is
  // always null at SSR, so the hook's server-side `false` renders nothing either way.
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
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

  // App-level "edit depth chart" toggle: puts every position group's card into reorder
  // mode at once (PlayerCard's globalEditMode prop), instead of tapping each card's own
  // Reorder button in turn. Off is symmetric with on — it drops every group straight back
  // out, same as tapping Done individually would. Reset on team change so switching teams
  // doesn't carry a stale "editing" state into the new roster.
  const [globalEditMode, setGlobalEditMode] = useState(false);
  useEffect(() => {
    setGlobalEditMode(false);
  }, [team.id]);

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

  // One prop set for both card placements, so sheet and docked stay behaviorally
  // identical (reorder wiring included).
  const playerCardProps = {
    player: displaySelected,
    roster: themedRoster,
    onClose: () => setSelectedPlayer(null),
    onSelectPlayer: setSelectedPlayer,
    playerStatsMap,
    ...(previewing
      ? {}
      : {
          onReorder: handleReorder,
          onResetPosition: handleResetPosition,
          isPositionCustom: displaySelected ? !!override[displaySelected.position] : false,
          globalEditMode,
        }),
  };

  return (
    <TeamPageShell
      team={team}
      teams={teams}
      activePage="roster"
      accent={activeColors.uiAccent}
      aside={
        isDesktop && displaySelected ? (
          <PlayerCard variant="docked" {...playerCardProps} />
        ) : (
          // Empty state from the desktop mock: tells first-time desktop users the card
          // docks here rather than covering the chart.
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-8 text-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold"
              style={{ border: `2px dashed ${uiTokens.borderInput}`, color: uiTokens.textFaint }}>
              #
            </div>
            <div className="text-[13px] font-bold" style={{ color: uiTokens.textSecondary }}>
              No player selected
            </div>
            <div className="text-xs leading-relaxed" style={{ color: uiTokens.textFaint }}>
              Click a dot on the field — the card docks here instead of covering the chart.
            </div>
          </div>
        )
      }>
      <div
        className="relative flex flex-col mx-auto w-full max-w-[720px] xl:max-w-none"
        style={{
          height: '100dvh',
          overflow: 'hidden',
          background: uiTokens.bg,
        }}>
        {/* Header */}
        <div
          className="px-5 pb-3"
          style={{
            background: uiTokens.bg,
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
            style={{ borderBottom: `1px solid ${uiTokens.borderDefault}` }}>
            <TabBar
              options={(['offense', 'defense', 'special'] as const).map((unit) => ({
                value: unit,
                label: UNIT_LABELS[unit].toUpperCase(),
              }))}
              value={activeUnit}
              onChange={(v) => {
                setActiveUnit(v as Unit);
                setSelectedPlayer(null);
              }}
              activeColor={activeColors.uiAccent}
            />
            <Menu
              ariaLabel="More options"
              trigger={
                <MoreHorizontal
                  size={16}
                  color={globalEditMode ? activeColors.uiAccent : undefined}
                />
              }
              items={[
                {
                  icon: <Shirt size={14} color={activeColors.uiAccent} />,
                  label: 'Choose uniform',
                  onClick: () => setKitOpen(true),
                },
                {
                  icon: shareCopied ? (
                    <Check size={14} color={activeColors.uiAccent} strokeWidth={3} />
                  ) : (
                    <Share2 size={14} color={activeColors.uiAccent} />
                  ),
                  label: shareCopied ? 'Link copied' : 'Share roster',
                  onClick: handleShareRoster,
                },
                // App-level edit toggle, folded into the overflow menu instead of its own
                // row: on puts every position group's card into reorder mode at once (no
                // per-card Reorder taps needed); off exits all of them together. Omitted
                // while previewing a shared board, same as reorder itself is disabled there.
                ...(previewing
                  ? []
                  : [
                      {
                        icon: <Pencil size={14} color={activeColors.uiAccent} />,
                        label: 'Edit depth chart',
                        checked: globalEditMode,
                        accent: activeColors.uiAccent,
                        onClick: () => setGlobalEditMode(!globalEditMode),
                      },
                    ]),
              ]}
            />
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
              boxShadow: `inset 0 0 60px ${uiTokens.scrimLight}, 0 4px 32px ${uiTokens.scrim}`,
            }}>
            <FieldMarkings />

            {activeUnit === 'special' && (
              <>
                {/* Grouping labels for the two special-teams clusters — the slot
                    coordinates (lib/espn/transform.ts) already cluster KR/PR above
                    the LOS and LS/K/P below it, but with no label the split reads
                    as arbitrary rather than a real formation. */}
                <div
                  className="absolute font-semibold text-center pointer-events-none"
                  style={{
                    left: '50%',
                    top: '8%',
                    transform: 'translate(-50%, -50%)',
                    color: uiTokens.textMuted,
                    letterSpacing: '0.05em',
                    fontSize: 'clamp(6px, 1.1dvh, 8px)',
                  }}>
                  RETURN UNIT
                </div>
                <div
                  className="absolute font-semibold text-center pointer-events-none"
                  style={{
                    left: '50%',
                    top: '58%',
                    transform: 'translate(-50%, -50%)',
                    color: uiTokens.textMuted,
                    letterSpacing: '0.05em',
                    fontSize: 'clamp(6px, 1.1dvh, 8px)',
                  }}>
                  KICKING UNIT
                </div>
              </>
            )}

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

        {!isDesktop && <PlayerCard {...playerCardProps} />}

        <OpenPlayerFromQuery players={displayRoster.players} onOpen={handleNavSelectPlayer} />

        <ApplyKitFromQuery validIds={roster.uniforms.map((u) => u.id)} onApply={setKitId} />

        <ApplySharedOrder onApply={handleApplySharedOrder} />
      </div>
    </TeamPageShell>
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
          stroke={uiTokens.borderStrong}
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
          <line
            x1="32"
            y1={y}
            x2="35"
            y2={y}
            stroke={uiTokens.surfaceChipHover}
            strokeWidth="0.4"
          />
          <line
            x1="65"
            y1={y}
            x2="68"
            y2={y}
            stroke={uiTokens.surfaceChipHover}
            strokeWidth="0.4"
          />
        </g>
      ))}
    </svg>
  );
}
