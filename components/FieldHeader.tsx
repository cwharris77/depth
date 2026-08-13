'use client';

import ActionChip from '@/components/ui/ActionChip';
import { colors as uiTokens } from '@/components/ui/tokens';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import { hasOverride } from '@/lib/depth-overrides';
import type { TeamMeta } from '@/lib/roster-source';
import type { Player, Team, TeamColors, Unit } from '@/lib/types';
import { History, RotateCcw } from 'lucide-react';
import FieldHeaderMenu from './FieldHeaderMenu';
import SharedBoardBanner from './SharedBoardBanner';
import TeamPageHeader from './TeamPageHeader';

type Props = {
  team: Team;
  teams: TeamMeta[];
  activeColors: TeamColors;
  nav: { players: Player[]; onSelectPlayer: (player: Player) => void };
  unit: { active: Unit; onChange: (unit: Unit) => void };
  menu: {
    onChooseUniform: () => void;
    // Phase D1: null = viewing today's live roster; a year = viewing that past season
    // read-only.
    season: { value: number | null; onOpen: () => void; onBackToToday: () => void };
    // Real-formations entry (DEP-142/2a): the ••• menu row that opens FormationsSheet,
    // showing the current pick inline instead of a separate on-field control.
    formations: { meta: string; onOpen: () => void };
    share: { copied: boolean; onShare: () => void };
    editMode: { enabled: boolean; onToggle: () => void; previewing: boolean };
  };
  override: { value: TeamDepthOverride; onReset: () => void };
  sharedBoard: {
    onPreview: (override: TeamDepthOverride | null) => void;
    onApply: (override: TeamDepthOverride) => void;
  };
};

// Header chrome above the field: team header + nav search, unit tabs, the "•••" overflow
// menu (uniform/share/edit-mode), the custom-order reset chip, and the shared-board preview
// banner. Pure presentational — all state lives in DepthChartField's hooks, threaded down
// as cohesive prop bundles rather than flat props (DEP-179 slice 3).
export default function FieldHeader({
  team,
  teams,
  activeColors,
  nav,
  unit,
  menu,
  override,
  sharedBoard,
}: Props) {
  const historicalMode = menu.season.value !== null;
  return (
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
        currentTeamPlayers={nav.players}
        onSelectPlayer={nav.onSelectPlayer}
      />
      {/* On its own row, 20px below the header line: unit tabs as underline
        tabs (left) and the collapsed uniform/share "•••" menu (right) —
        visually distinct from the page switcher above so the two levels
        don't read as duplicate controls (design spec 5a). */}
      <FieldHeaderMenu activeColors={activeColors} unit={unit} menu={menu} />
      {/* Tells the user this team's depth is their custom order, with one-tap revert.
        Hidden while previewing a shared board or viewing a past season — neither order
        is theirs to reset. */}
      {hasOverride(override.value) && !menu.editMode.previewing && !historicalMode && (
        <ActionChip
          icon={<RotateCcw size={11} />}
          label="Custom order · Reset all"
          onClick={override.onReset}
          accent={activeColors.uiAccent}
          className="mt-3"
        />
      )}
      {/* Read-only past-season indicator with a one-tap way back to today (Phase D1,
        docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-design.md). */}
      {historicalMode && (
        <ActionChip
          icon={<History size={11} />}
          label={`${menu.season.value} season · Back to today`}
          onClick={menu.season.onBackToToday}
          accent={activeColors.uiAccent}
          className="mt-3"
        />
      )}
      {/* Shared-board preview banner (Apply / Dismiss), pinned just above the field. */}
      <SharedBoardBanner
        currentTeam={team}
        teams={teams}
        accent={activeColors.uiAccent}
        onPreview={sharedBoard.onPreview}
        onApply={sharedBoard.onApply}
      />
    </div>
  );
}
