'use client';

import { Check, History, X } from 'lucide-react';
import IconButton from './ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';

// The season picker's contents (rendered inside BottomSheet, Phase D1). One row per
// season, current-season row first then descending -- mirrors NavSwitcher's TeamRow
// list pattern (row = identity + a trailing check on the active one). Selecting
// `currentSeason` is "back to today": it clears the historical view rather than
// fetching roster_history for a season that also happens to be ingested there
// (docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-design.md).
export default function SeasonSheet({
  currentSeason,
  minSeason,
  activeSeason,
  accent,
  onSelect,
  onClose,
}: {
  currentSeason: number;
  minSeason: number;
  activeSeason: number | null;
  accent: string;
  onSelect: (season: number | null) => void;
  onClose: () => void;
}) {
  const pastSeasons = Array.from(
    { length: currentSeason - minSeason },
    (_, i) => currentSeason - 1 - i
  );

  return (
    <div className="flex flex-col" style={{ maxHeight: '100%' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-base font-black" style={{ color: uiTokens.textPrimary }}>
          Seasons
        </h2>
        <IconButton
          icon={<X size={16} color={uiTokens.textMuted} />}
          variant="plain"
          size="sm"
          onClick={onClose}
          ariaLabel="Close"
        />
      </div>
      <div className="overflow-y-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        <SeasonRow
          label={`${currentSeason} · Current`}
          isActive={activeSeason === null}
          accent={accent}
          onClick={() => onSelect(null)}
        />
        {pastSeasons.map((season) => (
          <SeasonRow
            key={season}
            label={String(season)}
            isActive={activeSeason === season}
            accent={accent}
            onClick={() => onSelect(season)}
          />
        ))}
      </div>
    </div>
  );
}

function SeasonRow({
  label,
  isActive,
  accent,
  onClick,
}: {
  label: string;
  isActive: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-5 py-2.5 text-left"
      style={{
        touchAction: 'manipulation',
        background: isActive ? `${accent}1a` : 'transparent',
      }}>
      <History size={16} color={isActive ? accent : uiTokens.textFaint} />
      <span
        className="flex-1 text-sm font-bold"
        style={{ color: isActive ? accent : uiTokens.textPrimary }}>
        {label}
      </span>
      {isActive && <Check size={16} color={accent} strokeWidth={3} />}
    </button>
  );
}
