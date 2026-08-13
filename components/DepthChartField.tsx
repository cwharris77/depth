'use client';

import { resolveUnit } from '@/lib/formations';
import type { TeamMeta } from '@/lib/roster-source';
import { unitForPosition } from '@/lib/search';
import { buildTeamSelectionUrl } from '@/lib/team-selection';
import type { Player, PlayerSeasonStats, TeamFormation, TeamRoster, Unit } from '@/lib/types';
import { useUser } from '@/lib/use-user';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySeasonFromQuery from './ApplySeasonFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import DepthChartFieldSurface from './DepthChartFieldSurface';
import DepthChartSheets from './DepthChartSheets';
import FieldHeader from './FieldHeader';
import SyncSelectionWithQuery from './SyncSelectionWithQuery';
import PlayerCard from './PlayerCard';
import TeamPageShell from './TeamPageShell';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/lib/use-media-query';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';
import { applyTeamOverride } from '@/lib/depth-overrides';
import { useKit } from '@/lib/use-kit';
import { useTeamOverride } from '@/lib/use-team-override';
import { useShareRoster } from '@/lib/use-share-roster';
import { useDepthChartSeason } from '@/lib/use-depth-chart-season';
import { useDepthChartSelection } from '@/lib/use-depth-chart-selection';
import { useFormations } from '@/lib/use-formations';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';

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
  const [kitOpen, setKitOpen] = useState(false);
  const [formationsSheetOpen, setFormationsSheetOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

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
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);

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
  // Historical roster, re-skinned the same way. Kit selection stays live (colors are
  // orthogonal to which season is showing, locked decision) but reorder overrides never
  // apply to it -- a past season is a fact, not something the user's live overlay edits.
  const themedHistoricalRoster = useMemo(
    () =>
      historicalRoster
        ? { ...historicalRoster, team: { ...historicalRoster.team, colors: activeColors } }
        : null,
    [historicalRoster, activeColors]
  );
  // While viewing history, the field renders ONLY the historical roster -- never falling
  // back to the live one mid-fetch, or a stale live frame would flash before the real
  // season's data lands (AGENTS.md invariant 16).
  const fieldRoster = historicalMode ? themedHistoricalRoster : themedRoster;

  const slots = fieldRoster ? resolveUnit(fieldRoster, activeUnit, realFormation) : [];

  // Keep the open card's player in sync with the reordered roster (fresh depthRank/status).
  const displaySelected = selectedPlayer
    ? (displayRoster.players.find((p) => p.id === selectedPlayer.id) ?? selectedPlayer)
    : null;

  // A selected formation is unit-specific (offense/defense each have their own list) --
  // switching units always resets to that unit's top formation rather than carrying a
  // stale pick across. use-depth-chart-selection.ts owns the selection/URL side;
  // this composes in the formation reset the selection hook has no knowledge of.
  const changeUnit = (unit: Unit) => {
    changeSelectionUnit(unit);
    resetToTopForUnit(unit);
  };

  // Selecting a season (SeasonSheet, or the "Back to today" chip with `next: null`)
  // closes any open card -- a live-roster selection doesn't necessarily exist in a past
  // season's data -- and writes `?season=` into the URL (kept, never stripped, so the
  // link stays shareable). The query-driven mount/Back-Forward path
  // (ApplySeasonFromQuery below) only updates local state via setSeason directly; the
  // URL is already correct in that case, so it doesn't re-push it.
  const changeSeason = (next: number | null) => {
    setSeason(next);
    resetForSeasonChange();
    router.replace(
      buildTeamSelectionUrl(pathname, { unit: activeUnit, playerId: null, season: next }),
      { scroll: false }
    );
  };

  // A player picked from the nav's player search jumps the field to their unit,
  // then opens them — same behavior the old header search had.
  const handleNavSelectPlayer = (player: Player) => {
    selectPlayer(player, unitForPosition(player.position));
  };

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
            onChooseUniform: () => setKitOpen(true),
            season: {
              value: season,
              onOpen: () => setSeasonSheetOpen(true),
              onBackToToday: () => changeSeason(null),
            },
            formations: { meta: formationsMeta, onOpen: () => setFormationsSheetOpen(true) },
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

        <DepthChartSheets
          accent={activeColors.uiAccent}
          kit={{
            open: kitOpen,
            onClose: () => setKitOpen(false),
            uniforms: roster.uniforms,
            activeId: activeUniform?.id ?? '',
            definition: uniformDefinition,
            onSelect: setKitId,
          }}
          season={{
            open: seasonSheetOpen,
            onClose: () => setSeasonSheetOpen(false),
            currentSeason,
            active: season,
            onSelect: (next) => {
              changeSeason(next);
              setSeasonSheetOpen(false);
            },
          }}
          formations={{
            open: formationsSheetOpen,
            onClose: () => setFormationsSheetOpen(false),
            unit: activeUnit,
            list: unitFormations,
            active: activeFormation,
            onSelect: (formation) => {
              setActiveFormation(formation);
              setFormationsSheetOpen(false);
            },
          }}
        />

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
