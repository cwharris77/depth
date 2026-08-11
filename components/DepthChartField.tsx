'use client';

import {
  alignmentLabel,
  buildRealDefenseFormation,
  buildRealFormation,
  resolveUnit,
} from '@/lib/formations';
import type { TeamMeta } from '@/lib/roster-source';
import { unitForPosition } from '@/lib/search';
import { buildTeamSelectionUrl } from '@/lib/team-selection';
import type { Player, PlayerSeasonStats, TeamFormation, TeamRoster, Unit } from '@/lib/types';
import { useUser } from '@/lib/use-user';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import ApplyKitFromQuery from './ApplyKitFromQuery';
import ApplySeasonFromQuery from './ApplySeasonFromQuery';
import ApplySharedOrder from './ApplySharedOrder';
import BottomSheet from './BottomSheet';
import FTNAttribution from './FTNAttribution';
import FieldHeader from './FieldHeader';
import FieldMarkings from './FieldMarkings';
import FormationsSheet from './FormationsSheet';
import SeasonSheet from './SeasonSheet';
import SyncSelectionWithQuery from './SyncSelectionWithQuery';
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
import { useTeamSeason } from '@/lib/use-team-season';
import { SEASONS_MIN } from '@/lib/nflverse/roster-history';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';

// A team's default formation pick is its most-used real formation for that unit, not
// the generic "Base" look -- users should never see "Base" as something they picked.
// Falls back to null (Base, internal-only) only when the unit has no real-formation
// rows at all.
function topFormationFor(unit: Unit, formations: TeamFormation[]): TeamFormation | null {
  if (unit === 'special') return null;
  const unitFormations = formations.filter((f) => f.unit === unit);
  if (unitFormations.length === 0) return null;
  return unitFormations.reduce((top, f) => (f.rank < top.rank ? f : top));
}

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
  // The season SeasonSheet lists as "current" / the sheet's most-recent row (Phase D1).
  // Server-computed (app/team/[id]/page.tsx) since it depends on today's date.
  currentSeason: number;
  uniformDefinition?: TeamUniformDefinition;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>('offense');
  // The real-formation chip choice (Phase E) — ephemeral: not persisted, not in the
  // URL (locked decision). Defaults to the team's most-used formation for the active
  // unit (topFormationFor), not the generic "Base" look. Reset during render, not an
  // effect, whenever the team changes (same pattern as useKit's team-change detection)
  // since this component persists across team switches.
  const [activeFormation, setActiveFormation] = useState<TeamFormation | null>(() =>
    topFormationFor('offense', formations)
  );
  const [formationTeamId, setFormationTeamId] = useState(roster.team.id);
  if (formationTeamId !== roster.team.id) {
    setFormationTeamId(roster.team.id);
    setActiveFormation(topFormationFor(activeUnit, formations));
  }
  // Desktop docks the selected player's card in TeamPageShell's context panel instead
  // of the bottom sheet. Decided by matchMedia (not CSS show/hide) so only ONE
  // PlayerCard ever mounts — two would double its per-player stats fetch. Selection is
  // always null at SSR, so the hook's server-side `false` renders nothing either way.
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [kitOpen, setKitOpen] = useState(false);
  const [formationsSheetOpen, setFormationsSheetOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  // Whether the currently-open card was reached by pushing a fresh history entry (a real
  // "open" from a closed state) rather than a mount-time URL restore or swapping to a
  // different player while one was already open. Only a pushed-open card gets undone with
  // router.back() on close (see closePlayer) — closing anything else just replaces the URL,
  // so it can't pop the user to whatever page happened to precede this load.
  const openedViaPushRef = useRef(false);

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

  // Phase D1 historical season selection. Reset to "today" (season: null) whenever the
  // team changes -- a render-time reset (not an effect), same pattern as useKit's
  // team-change reset, since this only needs to mirror the roster.team.id prop.
  const [seasonSelection, setSeasonSelection] = useState<{
    teamId: string;
    season: number | null;
  }>({ teamId: team.id, season: null });
  if (seasonSelection.teamId !== team.id) {
    setSeasonSelection({ teamId: team.id, season: null });
  }
  const season = seasonSelection.season;
  const historicalMode = season !== null;
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);
  const [historicalShareCopied, setHistoricalShareCopied] = useState(false);
  const { historicalRoster, historyLoading, historyNotFound } = useTeamSeason(team.id, season);

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

  // Real formations (Phase E offense, DEP-141 defense) are about the latest ingested
  // season's live participation data -- meaningless overlaid on a past season's roster,
  // so only applied outside historical mode. Special teams has no real-formation data
  // (see FormationsSheet's empty state), so it always falls back to the static layout.
  const offenseFormations = useMemo(
    () => (formations ?? []).filter((f) => f.unit === 'offense'),
    [formations]
  );
  const defenseFormations = useMemo(
    () => (formations ?? []).filter((f) => f.unit === 'defense'),
    [formations]
  );
  const unitFormations =
    activeUnit === 'offense'
      ? offenseFormations
      : activeUnit === 'defense'
        ? defenseFormations
        : [];

  const realFormation = useMemo(() => {
    if (historicalMode || !activeFormation) return undefined;
    if (activeUnit === 'offense') {
      return buildRealFormation(activeFormation.alignment, activeFormation.personnel);
    }
    if (activeUnit === 'defense') {
      return buildRealDefenseFormation(activeFormation.personnel);
    }
    return undefined;
  }, [historicalMode, activeUnit, activeFormation]);
  const slots = fieldRoster ? resolveUnit(fieldRoster, activeUnit, realFormation) : [];

  // The ••• menu's "Formations" row shows the current pick inline instead of a separate
  // on-field control (DEP-142/option 2a).
  const formationsMeta = !activeFormation
    ? 'Base'
    : activeUnit === 'offense'
      ? `${alignmentLabel(activeFormation.alignment)} ${activeFormation.personnel}`
      : `${activeFormation.alignment} (${activeFormation.personnel})`;

  // Keep the open card's player in sync with the reordered roster (fresh depthRank/status).
  const displaySelected = selectedPlayer
    ? (displayRoster.players.find((p) => p.id === selectedPlayer.id) ?? selectedPlayer)
    : null;

  // Selection and the active unit both live in the URL (`?player=&unit=`), mirroring
  // Compare's `?a=&b=&pos=` pattern (DEP-130). Opening a player from a closed state pushes
  // a new history entry so Back can close it; everything else — swapping to another
  // player while one's already open, or changing unit tabs — replaces in place, so
  // browsing around doesn't pile up a Back stop per click.
  const selectPlayer = (player: Player, unit: Unit) => {
    const wasOpen = selectedPlayer !== null;
    setActiveUnit(unit);
    setSelectedPlayer(player);
    const url = buildTeamSelectionUrl(pathname, { unit, playerId: player.id, season });
    if (wasOpen) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
      openedViaPushRef.current = true;
    }
  };

  const closePlayer = () => {
    setSelectedPlayer(null);
    if (openedViaPushRef.current) {
      openedViaPushRef.current = false;
      router.back();
    } else {
      router.replace(
        buildTeamSelectionUrl(pathname, { unit: activeUnit, playerId: null, season }),
        { scroll: false }
      );
    }
  };

  const changeUnit = (unit: Unit) => {
    setActiveUnit(unit);
    // A selected formation is unit-specific (offense/defense each have their own list) —
    // switching units always resets to that unit's top formation rather than carrying a
    // stale pick across.
    setActiveFormation(topFormationFor(unit, formations));
    setSelectedPlayer(null);
    openedViaPushRef.current = false;
    router.replace(buildTeamSelectionUrl(pathname, { unit, playerId: null, season }), {
      scroll: false,
    });
  };

  // Selecting a season (SeasonSheet, or the "Back to today" chip with `next: null`)
  // closes any open card -- a live-roster selection doesn't necessarily exist in a past
  // season's data -- and writes `?season=` into the URL (kept, never stripped, so the
  // link stays shareable). The query-driven mount/Back-Forward path
  // (applySeasonFromQuery below) only updates local state; the URL is already correct
  // in that case, so it doesn't re-push it.
  const changeSeason = (next: number | null) => {
    setSeasonSelection({ teamId: team.id, season: next });
    setSelectedPlayer(null);
    openedViaPushRef.current = false;
    router.replace(
      buildTeamSelectionUrl(pathname, { unit: activeUnit, playerId: null, season: next }),
      { scroll: false }
    );
  };

  const applySeasonFromQuery = (next: number | null) => {
    setSeasonSelection({ teamId: team.id, season: next });
  };

  // SyncSelectionWithQuery drives this when the URL changes out from under us — mount-time
  // restore, browser Back/Forward, or a manual URL edit. The URL already matches by the
  // time this fires, so no router call here; leaving openedViaPushRef false means a later
  // close replaces/strips the param instead of calling router.back() into whatever
  // happened to precede this load.
  const restoreSelectionFromUrl = (player: Player | null, unit: Unit | null) => {
    openedViaPushRef.current = false;
    setSelectedPlayer(player);
    if (unit) setActiveUnit(unit);
  };

  const handlePlayerClick = (player: Player) => {
    if (selectedPlayer?.id === player.id) {
      closePlayer();
    } else {
      selectPlayer(player, activeUnit);
    }
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

  // Share while viewing history shares the current `?season=` URL rather than the
  // override/kit share flow, which doesn't apply to a read-only past season.
  const handleShareHistoricalRoster = async () => {
    const url = window.location.href;
    const title = `${team.city} ${team.name} ${season} season · Depth`;
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
      setHistoricalShareCopied(true);
      setTimeout(() => setHistoricalShareCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — no-op
    }
  };

  // One prop set for both card placements, so sheet and docked stay behaviorally
  // identical (reorder wiring included).
  const playerCardProps = {
    player: displaySelected,
    roster: fieldRoster ?? themedRoster,
    onClose: closePlayer,
    onSelectPlayer: (player: Player) => selectPlayer(player, unitForPosition(player.position)),
    playerStatsMap,
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
          onChangeUnit={changeUnit}
          globalEditMode={globalEditMode}
          onToggleGlobalEditMode={() => setGlobalEditMode(!globalEditMode)}
          previewing={previewing}
          onChooseUniform={() => setKitOpen(true)}
          shareCopied={historicalMode ? historicalShareCopied : shareCopied}
          onShareRoster={historicalMode ? handleShareHistoricalRoster : handleShareRoster}
          override={override}
          onResetTeam={handleResetTeam}
          onPreviewSharedOrder={setPreviewOverride}
          onApplySharedOrder={handleApplySharedOrder}
          season={season}
          onOpenSeasons={() => setSeasonSheetOpen(true)}
          onBackToToday={() => changeSeason(null)}
          formationsMeta={formationsMeta}
          onOpenFormations={() => setFormationsSheetOpen(true)}
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

            {/* Historical fetch states: never render live dots in place of these (see
                fieldRoster above) so a wrong season's data can't flash before the real
                one lands, and a season with no ingested data reads as empty, not broken. */}
            {historicalMode && historyLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold" style={{ color: uiTokens.textMuted }}>
                  Loading {season} season…
                </span>
              </div>
            )}
            {historicalMode && historyNotFound && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center pointer-events-none">
                <span className="text-xs font-bold" style={{ color: uiTokens.textMuted }}>
                  No {season} roster data for the {team.name} yet.
                </span>
              </div>
            )}
          </div>

          {/* FTN Data is CC-BY-SA 4.0 -- attribution is the condition of surfacing it
              (docs/nflverse.md). Shown whenever the active unit has real-formation data
              on screen -- not only once a formation is picked, since the default pick
              is the team's top formation and the field renders FTN-sourced layouts
              from first paint. Historical seasons have no formation data, so none
              here. */}
          {!historicalMode && unitFormations.length > 0 && <FTNAttribution className="pt-1.5" />}
        </div>

        <BottomSheet isOpen={kitOpen} onClose={() => setKitOpen(false)}>
          <UniformSheet
            uniforms={roster.uniforms}
            activeId={activeUniform?.id ?? ''}
            accent={activeColors.uiAccent}
            definition={uniformDefinition}
            onSelect={setKitId}
            onClose={() => setKitOpen(false)}
          />
        </BottomSheet>

        <BottomSheet isOpen={seasonSheetOpen} onClose={() => setSeasonSheetOpen(false)}>
          <SeasonSheet
            currentSeason={currentSeason}
            minSeason={SEASONS_MIN}
            activeSeason={season}
            accent={activeColors.uiAccent}
            onSelect={(next) => {
              changeSeason(next);
              setSeasonSheetOpen(false);
            }}
            onClose={() => setSeasonSheetOpen(false)}
          />
        </BottomSheet>

        <BottomSheet isOpen={formationsSheetOpen} onClose={() => setFormationsSheetOpen(false)}>
          <FormationsSheet
            unit={activeUnit}
            formations={unitFormations}
            activeFormation={activeFormation}
            onSelect={(formation) => {
              setActiveFormation(formation);
              setFormationsSheetOpen(false);
            }}
            onClose={() => setFormationsSheetOpen(false)}
            accent={activeColors.uiAccent}
          />
        </BottomSheet>

        {!isDesktop && <PlayerCard {...playerCardProps} />}

        <SyncSelectionWithQuery
          players={displayRoster.players}
          selectedPlayerId={selectedPlayer?.id ?? null}
          onChange={restoreSelectionFromUrl}
        />

        <ApplyKitFromQuery validIds={roster.uniforms.map((u) => u.id)} onApply={setKitId} />

        <ApplySeasonFromQuery onApply={applySeasonFromQuery} />

        <ApplySharedOrder onApply={handleApplySharedOrder} />
      </div>
    </TeamPageShell>
  );
}
