'use client';

import { Check, History } from 'lucide-react';
import SheetHeader from './ui/SheetHeader';
import UpcomingBadge from './UpcomingBadge';
import { colors as uiTokens } from '@/components/ui/tokens';

export interface TeamStatsSeasonEntry {
  // TeamStatsView's index space: -2 incoming coach, -1 upcoming season, 0..N-1 real
  // `seasons` rows. Opaque to this component -- just the value round-tripped to onSelect.
  index: number;
  label: string;
  upcoming?: boolean;
}

// Season picker for the stats page (2026-08-19-espn-full-history-team-stats-design.md),
// replacing the horizontal chip row once a team can have 20+ real seasons (full ESPN
// backfill) instead of the prior 3-4. Same BottomSheet + row-list pattern as the
// SCHEDULE tab's SeasonSheet (History icon, accent tint on the active row, trailing
// check) for visual consistency, but driven by TeamStatsView's index-based entries
// (which include the synthetic upcoming-season/incoming-coach chips) rather than
// SeasonSheet's currentSeason/minSeason range generation -- different enough a shape
// that forking beat bending SeasonSheet to fit two selection models.
export default function TeamStatsSeasonSheet({
  entries,
  activeIndex,
  accent,
  onSelect,
  onClose,
}: {
  entries: TeamStatsSeasonEntry[];
  activeIndex: number;
  accent: string;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <>
      <SheetHeader title="Seasons" onClose={onClose} />
      <div
        className="overflow-y-auto pb-2"
        style={{ WebkitOverflowScrolling: 'touch', flex: '1 1 auto', minHeight: 0 }}>
        {entries.map((entry) => {
          const isActive = entry.index === activeIndex;
          return (
            <button
              key={entry.index}
              type="button"
              onClick={() => onSelect(entry.index)}
              className="flex w-full items-center gap-3 px-5 py-2.5 text-left"
              style={{
                touchAction: 'manipulation',
                background: isActive ? `${accent}1a` : 'transparent',
              }}>
              <History size={16} color={isActive ? accent : uiTokens.textFaint} />
              <span
                className="flex-1 text-sm font-bold"
                style={{ color: isActive ? accent : uiTokens.textPrimary }}>
                {entry.label}
              </span>
              {entry.upcoming && <UpcomingBadge selected={false} uiAccent={accent} />}
              {isActive && <Check size={16} color={accent} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
