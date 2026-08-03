'use client';

import Menu from '@/components/ui/Menu';
import TabBar from '@/components/ui/TabBar';
import { colors as uiTokens } from '@/components/ui/tokens';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import { hasOverride } from '@/lib/depth-overrides';
import type { TeamMeta } from '@/lib/roster-source';
import type { Player, Team, TeamColors, Unit } from '@/lib/types';
import {
  Check,
  History,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Share2,
  Shirt,
} from 'lucide-react';
import SharedBoardBanner from './SharedBoardBanner';
import TeamPageHeader from './TeamPageHeader';

const UNIT_LABELS: Record<Unit, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special',
};

type Props = {
  team: Team;
  teams: TeamMeta[];
  activeColors: TeamColors;
  currentTeamPlayers: Player[];
  onSelectPlayer: (player: Player) => void;
  activeUnit: Unit;
  onChangeUnit: (unit: Unit) => void;
  globalEditMode: boolean;
  onToggleGlobalEditMode: () => void;
  previewing: boolean;
  onChooseUniform: () => void;
  shareCopied: boolean;
  onShareRoster: () => void;
  override: TeamDepthOverride;
  onResetTeam: () => void;
  onPreviewSharedOrder: (override: TeamDepthOverride | null) => void;
  onApplySharedOrder: (override: TeamDepthOverride) => void;
  // Phase D1: null = viewing today's live roster; a year = viewing that past season
  // read-only.
  season: number | null;
  onOpenSeasons: () => void;
  onBackToToday: () => void;
  // Real-formations entry (DEP-142/2a): the ••• menu row that opens FormationsSheet,
  // showing the current pick inline instead of a separate on-field control.
  formationsMeta: string;
  onOpenFormations: () => void;
};

// Header chrome above the field: team header + nav search, unit tabs, the "•••" overflow
// menu (uniform/share/edit-mode), the custom-order reset chip, and the shared-board preview
// banner. Pure presentational — all state lives in DepthChartField's hooks, passed down as
// props/callbacks.
export default function FieldHeader({
  team,
  teams,
  activeColors,
  currentTeamPlayers,
  onSelectPlayer,
  activeUnit,
  onChangeUnit,
  globalEditMode,
  onToggleGlobalEditMode,
  previewing,
  onChooseUniform,
  shareCopied,
  onShareRoster,
  override,
  onResetTeam,
  onPreviewSharedOrder,
  onApplySharedOrder,
  season,
  onOpenSeasons,
  onBackToToday,
  formationsMeta,
  onOpenFormations,
}: Props) {
  const historicalMode = season !== null;
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
        currentTeamPlayers={currentTeamPlayers}
        onSelectPlayer={onSelectPlayer}
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
          onChange={(v) => onChangeUnit(v as Unit)}
          activeColor={activeColors.uiAccent}
        />
        <Menu
          ariaLabel="More options"
          trigger={
            <MoreHorizontal size={16} color={globalEditMode ? activeColors.uiAccent : undefined} />
          }
          items={[
            {
              icon: <Shirt size={14} color={activeColors.uiAccent} />,
              label: 'Choose uniform',
              onClick: onChooseUniform,
            },
            {
              icon: <History size={14} color={activeColors.uiAccent} />,
              label: 'Seasons',
              onClick: onOpenSeasons,
            },
            {
              icon: (
                <LayoutGrid
                  size={14}
                  color={historicalMode ? uiTokens.textFaint : activeColors.uiAccent}
                />
              ),
              label: 'Formations',
              meta: historicalMode ? undefined : formationsMeta,
              onClick: onOpenFormations,
              disabled: historicalMode,
              disabledReason: historicalMode
                ? "Historical seasons don't have formation data"
                : undefined,
            },
            {
              icon: shareCopied ? (
                <Check size={14} color={activeColors.uiAccent} strokeWidth={3} />
              ) : (
                <Share2 size={14} color={activeColors.uiAccent} />
              ),
              label: shareCopied ? 'Link copied' : 'Share roster',
              onClick: onShareRoster,
            },
            // App-level edit toggle, folded into the overflow menu instead of its own
            // row: on puts every position group's card into reorder mode at once (no
            // per-card Reorder taps needed); off exits all of them together. Disabled
            // (not omitted) while previewing a shared board or viewing a past season,
            // same as reorder itself is disabled in both (locked decision, phase-d
            // spec) -- a Tooltip on the disabled row explains why instead of the item
            // just silently disappearing.
            {
              icon: (
                <Pencil
                  size={14}
                  color={previewing || historicalMode ? uiTokens.textFaint : activeColors.uiAccent}
                />
              ),
              label: 'Edit depth chart',
              checked: globalEditMode,
              accent: activeColors.uiAccent,
              onClick: onToggleGlobalEditMode,
              disabled: previewing || historicalMode,
              disabledReason: previewing
                ? "Shared boards are read-only — apply the order to your own team's chart to edit it"
                : `Historical seasons are read-only`,
            },
          ]}
        />
      </div>
      {/* Tells the user this team's depth is their custom order, with one-tap revert.
        Hidden while previewing a shared board or viewing a past season — neither order
        is theirs to reset. */}
      {hasOverride(override) && !previewing && !historicalMode && (
        <button
          type="button"
          onClick={onResetTeam}
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
      {/* Read-only past-season indicator with a one-tap way back to today (Phase D1,
        docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-design.md). */}
      {historicalMode && (
        <button
          type="button"
          onClick={onBackToToday}
          className="flex items-center gap-1 mt-3 text-[10px] font-bold px-2 py-1 rounded-full"
          style={{
            color: activeColors.uiAccent,
            background: `${activeColors.uiAccent}1a`,
            border: `1px solid ${activeColors.uiAccent}55`,
            width: 'fit-content',
            touchAction: 'manipulation',
          }}>
          <History size={11} /> {season} season · Back to today
        </button>
      )}
      {/* Shared-board preview banner (Apply / Dismiss), pinned just above the field. */}
      <SharedBoardBanner
        currentTeam={team}
        teams={teams}
        accent={activeColors.uiAccent}
        onPreview={onPreviewSharedOrder}
        onApply={onApplySharedOrder}
      />
    </div>
  );
}
