'use client';

import Menu from '@/components/ui/Menu';
import TabBar from '@/components/ui/TabBar';
import { colors as uiTokens } from '@/components/ui/tokens';
import type { TeamColors, Unit } from '@/lib/types';
import { Check, History, LayoutGrid, MoreHorizontal, Pencil, Share2, Shirt } from 'lucide-react';

const UNIT_LABELS: Record<Unit, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special',
};

type MenuBundle = {
  onChooseUniform: () => void;
  season: { value: number | null; onOpen: () => void };
  formations: { meta: string; onOpen: () => void };
  share: { copied: boolean; onShare: () => void };
  editMode: { enabled: boolean; onToggle: () => void; previewing: boolean };
};

type Props = {
  activeColors: TeamColors;
  unit: { active: Unit; onChange: (unit: Unit) => void };
  menu: MenuBundle;
};

// The row directly below the team header: unit tabs (left) and the collapsed "•••"
// overflow menu (right) -- uniform/seasons/formations/share/edit-mode. Extracted out
// of FieldHeader so that component stays a thin coordinator (DEP-179 slice 3).
export default function FieldHeaderMenu({ activeColors, unit, menu }: Props) {
  const historicalMode = menu.season.value !== null;
  return (
    <div
      className="flex items-center justify-between mt-5"
      style={{ borderBottom: `1px solid ${uiTokens.borderDefault}` }}>
      <TabBar
        options={(['offense', 'defense', 'special'] as const).map((u) => ({
          value: u,
          label: UNIT_LABELS[u].toUpperCase(),
        }))}
        value={unit.active}
        onChange={(v) => unit.onChange(v as Unit)}
        activeColor={activeColors.uiAccent}
      />
      <Menu
        ariaLabel="More options"
        trigger={
          <MoreHorizontal
            size={16}
            color={menu.editMode.enabled ? activeColors.uiAccent : undefined}
          />
        }
        items={[
          {
            icon: <Shirt size={14} color={activeColors.uiAccent} />,
            label: 'Choose uniform',
            onClick: menu.onChooseUniform,
          },
          {
            icon: <History size={14} color={activeColors.uiAccent} />,
            label: 'Seasons',
            onClick: menu.season.onOpen,
          },
          {
            icon: (
              <LayoutGrid
                size={14}
                color={historicalMode ? uiTokens.textFaint : activeColors.uiAccent}
              />
            ),
            label: 'Formations',
            meta: historicalMode ? undefined : menu.formations.meta,
            onClick: menu.formations.onOpen,
            disabled: historicalMode,
            disabledReason: historicalMode
              ? "Historical seasons don't have formation data"
              : undefined,
          },
          {
            icon: menu.share.copied ? (
              <Check size={14} color={activeColors.uiAccent} strokeWidth={3} />
            ) : (
              <Share2 size={14} color={activeColors.uiAccent} />
            ),
            label: menu.share.copied ? 'Link copied' : 'Share roster',
            onClick: menu.share.onShare,
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
                color={
                  menu.editMode.previewing || historicalMode
                    ? uiTokens.textFaint
                    : activeColors.uiAccent
                }
              />
            ),
            label: 'Edit depth chart',
            checked: menu.editMode.enabled,
            accent: activeColors.uiAccent,
            onClick: menu.editMode.onToggle,
            disabled: menu.editMode.previewing || historicalMode,
            disabledReason: menu.editMode.previewing
              ? "Shared boards are read-only — apply the order to your own team's chart to edit it"
              : `Historical seasons are read-only`,
          },
        ]}
      />
    </div>
  );
}
