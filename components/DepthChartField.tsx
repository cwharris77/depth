'use client';

import { typeScale, colors as uiTokens } from '@/components/ui/tokens';
import type { TeamMeta } from '@/lib/roster-source';
import { unitForPosition } from '@/lib/utils/search/search';
import type { Player, PlayerSeasonStats, TeamFormation, TeamRoster } from '@/lib/types';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';
import { useDepthChartCommands } from '@/lib/hooks/depth-chart/use-depth-chart-commands';
import { useDepthChartRoster } from '@/lib/hooks/depth-chart/use-depth-chart-roster';
import { useDepthChartSeason } from '@/lib/hooks/depth-chart/use-depth-chart-season';
import { useDepthChartSelection } from '@/lib/hooks/depth-chart/use-depth-chart-selection';
import { useDepthChartSheets } from '@/lib/hooks/depth-chart/use-depth-chart-sheets';
import { useFormations } from '@/lib/hooks/depth-chart/use-formations';
import { useKit } from '@/lib/hooks/depth-chart/use-kit';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query';
import { useShareRoster } from '@/lib/hooks/overrides/use-share-roster';
import { useTeamOverride } from '@/lib/hooks/overrides/use-team-override';
import { useUser } from '@/lib/hooks/use-user';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySeasonFromQuery from './ApplySeasonFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import DepthChartFieldSurface from './DepthChartFieldSurface';
import DepthChartSheets from './DepthChartSheets';
import FieldHeader from './FieldHeader';
import PlayerCard from './PlayerCard';
import SyncSelectionWithQuery from './SyncSelectionWithQuery';
import TeamPageShell from './TeamPageShell';

// Pure client component: it receives one resolved roster as a prop and never
// imports the team registry, so a page ships only its own team's data — not all 32.
export default function DepthChartField({
  roster,
  teams,
  playerStatsMap,
  formations = [],
  currentSeason,
  uniformDefinition,
}: {
  roster: TeamRoster;
  teams: TeamMeta[];
  playerStatsMap?: Map<string, PlayerSeasonStats[]>;
  formations?: TeamFormation[];
  // The season SeasonSheet's "roster" row shows (the sheet's most-recent row, Phase D1).
  // Server-computed (app/team/[id]/page.tsx) since it depends on today's date.
  currentSeason: number;
  uniformDefinition?: TeamUniformDefinition;
}) {
  // Desktop docks the selected player's card in TeamPageShell's context panel instead
  // of the bottom sheet. Decided by matchMedia (not CSS show/hide) so only ONE
  // PlayerCard ever mounts — two would double its per-player stats fetch. Selection is
  // always null at SSR, so the hook's server-side `false` renders nothing either way.
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);

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

  const {
    season,
    historicalMode,
    setSeason,
    historicalRoster,
    historyLoading,
    historyNotFound,
    historyError,
    retry: retryHistory,
    historicalShareCopied,
    handleShareHistoricalRoster,
  } = useDepthChartSeason(team);

  const {
    selectedPlayer,
    activeUnit,
    selectPlayer,
    closePlayer,
    changeUnit: changeSelectionUnit,
    resetForSeasonChange,
    restoreSelectionFromUrl,
    handlePlayerClick,
  } = useDepthChartSelection(season);

  const {
    activeFormation,
    setActiveFormation,
    unitFormations,
    realFormation,
    formationsMeta,
    resetToTopForUnit,
  } = useFormations(team.id, activeUnit, formations, historicalMode);

  const { displayRoster, themedRoster, fieldRoster, slots, displaySelected } = useDepthChartRoster({
    roster,
    effectiveOverride,
    activeColors,
    historicalRoster,
    historicalMode,
    activeUnit,
    realFormation,
    selectedPlayer,
  });

  const { changeUnit, changeSeason, handleNavSelectPlayer } = useDepthChartCommands({
    activeUnit,
    changeSelectionUnit,
    resetToTopForUnit,
    selectPlayer,
    setSeason,
    resetForSeasonChange,
  });

  // A past season is read-only, same as previewing a shared board: no reorder
  // affordances (locked decision, phase-d spec — editing history is a board, D2, not an
  // overlay on a fact).
  const readOnly = previewing || historicalMode;

  // One prop set for both card placements, so sheet and docked stay behaviorally
  // identical (reorder wiring included).
  const playerCardProps = {
    player: displaySelected,
    roster: fieldRoster ?? themedRoster,
    onClose: closePlayer,
    onSelectPlayer: (player: Player) => selectPlayer(player, unitForPosition(player.position)),
    // playerStatsMap is a server prefetch keyed by the *current* roster's player ids
    // (app/team/[id]/page.tsx) -- a historical season's players resolve to different ids
    // (synthetic gsis:<id>@<season> or a still-active player's real id looked up fresh),
    // none of which are keys in that map. Passing it through unconditionally made
    // PlayerCard treat the map as authoritative and render "no stats" for every
    // historical player instead of falling back to its own client-side fetch (which
    // already resolves historical ids correctly, see getPlayerStats). Omit it in
    // historicalMode so PlayerCard fetches instead.
    playerStatsMap: historicalMode ? undefined : playerStatsMap,
    ...(readOnly
      ? {}
      : {
          onReorder: handleReorder,
          onResetPosition: handleResetPosition,
          isPositionCustom: displaySelected ? !!override[displaySelected.position] : false,
          globalEditMode,
        }),
  };

  const { sheets, openKitSheet, openSeasonSheet, openFormationsSheet } = useDepthChartSheets({
    kitUniforms: roster.uniforms,
    activeKitId: activeUniform?.id ?? '',
    kitDefinition: uniformDefinition,
    onSelectKit: setKitId,
    currentSeason,
    activeSeason: season,
    onSelectSeason: changeSeason,
    activeUnit,
    unitFormations,
    activeFormation,
    onSelectFormation: setActiveFormation,
  });

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
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full font-bold"
              style={{
                border: `2px dashed ${uiTokens.borderInput}`,
                color: uiTokens.textFaint,
                fontSize: typeScale.title,
              }}>
              #
            </div>
            <div
              className="font-bold"
              style={{ color: uiTokens.textSecondary, fontSize: typeScale.title }}>
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
          nav={{ players: themedRoster.players, onSelectPlayer: handleNavSelectPlayer }}
          unit={{ active: activeUnit, onChange: changeUnit }}
          menu={{
            onChooseUniform: openKitSheet,
            season: {
              value: season,
              onOpen: openSeasonSheet,
              onBackToToday: () => changeSeason(null),
            },
            formations: { meta: formationsMeta, onOpen: openFormationsSheet },
            share: {
              copied: historicalMode ? historicalShareCopied : shareCopied,
              onShare: historicalMode ? handleShareHistoricalRoster : handleShareRoster,
            },
            editMode: {
              enabled: globalEditMode,
              onToggle: () => setGlobalEditMode(!globalEditMode),
              previewing,
            },
          }}
          override={{ value: override, onReset: handleResetTeam }}
          sharedBoard={{ onPreview: setPreviewOverride, onApply: handleApplySharedOrder }}
        />

        <DepthChartFieldSurface
          slots={slots}
          activeUnit={activeUnit}
          activeColors={activeColors}
          selectedPlayerId={selectedPlayer?.id}
          onPlayerClick={handlePlayerClick}
          unitFormationsCount={unitFormations.length}
          historicalMode={historicalMode}
          historyLoading={historyLoading}
          historyNotFound={historyNotFound}
          historyError={historyError}
          season={season}
          teamName={team.name}
          onRetryHistory={retryHistory}
        />

        <DepthChartSheets accent={activeColors.uiAccent} {...sheets} />

        {!isDesktop && <PlayerCard {...playerCardProps} />}

        <SyncSelectionWithQuery
          players={displayRoster.players}
          selectedPlayerId={selectedPlayer?.id ?? null}
          onChange={restoreSelectionFromUrl}
        />

        <ApplyKitFromQuery validIds={roster.uniforms.map((u) => u.id)} onApply={setKitId} />

        <ApplySeasonFromQuery onApply={setSeason} />

        <ApplySharedOrder onApply={handleApplySharedOrder} />
      </div>
    </TeamPageShell>
  );
}
