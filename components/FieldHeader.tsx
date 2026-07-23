'use client';

import { Check, MoreHorizontal, Pencil, RotateCcw, Share2, Shirt } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import { hasOverride } from '@/lib/depth-overrides';
import type { TeamMeta } from '@/lib/roster-source';
import type { Player, Team, TeamColors, Unit } from '@/lib/types';
import { colors as uiTokens } from '@/components/ui/tokens';
import Menu from '@/components/ui/Menu';
import TabBar from '@/components/ui/TabBar';
import Walkthrough from '@/components/ui/Walkthrough';
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
  showEditModeWalkthrough: boolean;
  onDismissWalkthrough: () => void;
  override: TeamDepthOverride;
  onResetTeam: () => void;
  onPreviewSharedOrder: (override: TeamDepthOverride | null) => void;
  onApplySharedOrder: (override: TeamDepthOverride) => void;
};

// Header chrome above the field: team header + nav search, unit tabs, the "•••" overflow
// menu (uniform/share/edit-mode), the edit-mode walkthrough, the custom-order reset chip,
// and the shared-board preview banner. Pure presentational — all state lives in
// DepthChartField's hooks, passed down as props/callbacks.
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
  showEditModeWalkthrough,
  onDismissWalkthrough,
  override,
  onResetTeam,
  onPreviewSharedOrder,
  onApplySharedOrder,
}: Props) {
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
        <div className="relative">
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
                onClick: onChooseUniform,
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
                      onClick: onToggleGlobalEditMode,
                    },
                  ]),
            ]}
          />
          <AnimatePresence>
            {showEditModeWalkthrough && !previewing && (
              <Walkthrough
                steps={[
                  'We moved things around: "Edit depth chart" now lives in this ••• menu instead of its own button.',
                  'Tap ••• , then "Edit depth chart" to start reordering your roster.',
                ]}
                onDismiss={onDismissWalkthrough}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Tells the user this team's depth is their custom order, with one-tap revert.
        Hidden while previewing a shared board — that order isn't theirs to reset. */}
      {hasOverride(override) && !previewing && (
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
