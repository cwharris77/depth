'use client';

import { resolveUnit } from '@/lib/formations';
import type { TeamMeta } from '@/lib/roster-source';
import { unitForPosition } from '@/lib/search';
import type { Player, PlayerSeasonStats, TeamRoster, Unit } from '@/lib/types';
import { useUser } from '@/lib/use-user';
import { useEffect, useMemo, useState } from 'react';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import BottomSheet from './BottomSheet';
import FieldHeader from './FieldHeader';
import FieldMarkings from './FieldMarkings';
import OpenPlayerFromQuery from './OpenPlayerFromQuery';
import PlayerCard from './PlayerCard';
import PlayerDot from './PlayerDot';
import TeamPageShell from './TeamPageShell';
import UniformSheet from './UniformSheet';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/lib/use-media-query';
import { colors as uiTokens } from '@/components/ui/tokens';
import { applyTeamOverride } from '@/lib/depth-overrides';
import { useKit } from '@/lib/use-kit';
import { useTeamOverride } from '@/lib/use-team-override';
import { useShareRoster } from '@/lib/use-share-roster';
import {
  dismissEditModeWalkthrough,
  hasDismissedEditModeWalkthrough,
} from '@/lib/edit-mode-walkthrough';

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

  const { team } = roster;
  const { user } = useUser();

  const { kitId, setKitId, activeUniform, activeColors } = useKit(roster);

  const {
    override,
    setPreviewOverride,
    previewing,
    effectiveOverride,
    globalEditMode,
    setGlobalEditMode,
    handleReorder,
    handleResetPosition,
    handleResetTeam,
    handleApplySharedOrder,
  } = useTeamOverride(team.id, user);

  const { shareCopied, handleShareRoster } = useShareRoster(roster, override, kitId, user);

  // First-run walkthrough pointing at the "•••" overflow menu, explaining that "Edit depth
  // chart" moved there from its own toggle. Shown once ever, app-wide (not per-team) — the
  // dismiss flag is set the instant it shows, not on dismiss, so navigating away mid-walkthrough
  // still counts as shown (same pattern as the nav-drawer coachmark). This effect intentionally
  // runs once per component mount rather than per team.id, since DepthChartField persists across
  // team switches (see the [team.id] reset effects above).
  const [showEditModeWalkthrough, setShowEditModeWalkthrough] = useState(false);
  useEffect(() => {
    if (hasDismissedEditModeWalkthrough(window.localStorage)) return;
    dismissEditModeWalkthrough(window.localStorage);
    setShowEditModeWalkthrough(true);
  }, []);

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
        <FieldHeader
          team={team}
          teams={teams}
          activeColors={activeColors}
          currentTeamPlayers={themedRoster.players}
          onSelectPlayer={handleNavSelectPlayer}
          activeUnit={activeUnit}
          onChangeUnit={(unit) => {
            setActiveUnit(unit);
            setSelectedPlayer(null);
          }}
          globalEditMode={globalEditMode}
          onToggleGlobalEditMode={() => setGlobalEditMode(!globalEditMode)}
          previewing={previewing}
          onChooseUniform={() => setKitOpen(true)}
          shareCopied={shareCopied}
          onShareRoster={handleShareRoster}
          showEditModeWalkthrough={showEditModeWalkthrough}
          onDismissWalkthrough={() => setShowEditModeWalkthrough(false)}
          override={override}
          onResetTeam={handleResetTeam}
          onPreviewSharedOrder={setPreviewOverride}
          onApplySharedOrder={handleApplySharedOrder}
        />

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
