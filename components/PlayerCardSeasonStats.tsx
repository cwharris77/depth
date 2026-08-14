'use client';

// PlayerCard's "season stats" section: a columnar table (SZN + the position's stat
// columns), a loading skeleton sized to match it, or an empty state. Column set is
// position-specific (lib/utils/stat-table.ts); the grid template stretches to however many
// the position has.
import type { PlayerSeasonStats } from '@/lib/types';
import type { StatColumn } from '@/lib/utils/stat-table';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';

interface PlayerCardSeasonStatsProps {
  statColumns: StatColumn[];
  statSeasons: PlayerSeasonStats[];
  showSkeleton: boolean;
  accent: string;
}

export default function PlayerCardSeasonStats({
  statColumns,
  statSeasons,
  showSkeleton,
  accent,
}: PlayerCardSeasonStatsProps) {
  if (statSeasons.length === 0 && !showSkeleton) {
    return (
      <div className="px-6 pb-8">
        <div
          className="font-semibold mb-3"
          style={{
            color: uiTokens.textMuted,
            letterSpacing: '0.1em',
            fontSize: typeScale.caption,
          }}>
          SEASON STATS
        </div>
        <div
          className="rounded-2xl flex items-center justify-center py-6"
          style={{
            background: uiTokens.surfaceCard2,
            border: `1px solid ${uiTokens.borderDefault}`,
          }}>
          <span className="text-xs font-medium" style={{ color: uiTokens.textFaint }}>
            No stats available
          </span>
        </div>
      </div>
    );
  }

  // SZN + TM are both fixed columns ahead of the position-specific stat columns (DEP-202
  // adds TM — which team that season/season_type is attributed to, nflverse's
  // `recent_team`, one team per row per the locked scope, no mid-season-trade split).
  const gridTemplateColumns = `minmax(40px, 0.7fr) minmax(32px, 0.6fr) repeat(${statColumns.length}, 1fr)`;

  return (
    <div className="px-6 pb-8">
      <div
        className="font-semibold mb-3"
        style={{ color: uiTokens.textMuted, letterSpacing: '0.1em', fontSize: typeScale.caption }}>
        SEASON STATS
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: uiTokens.surfaceCard2,
          border: `1px solid ${uiTokens.borderDefault}`,
        }}>
        <div
          className="grid gap-x-2 px-2.5 py-2"
          style={{ gridTemplateColumns, borderBottom: `1px solid ${uiTokens.borderDefault}` }}>
          <div
            className="text-[8.5px] font-bold"
            style={{ color: uiTokens.textFaint, letterSpacing: '0.04em' }}>
            SZN
          </div>
          <div
            className="text-[8.5px] font-bold"
            style={{ color: uiTokens.textFaint, letterSpacing: '0.04em' }}>
            TM
          </div>
          {statColumns.map((col) => (
            <div
              key={col.header}
              className="text-[8.5px] font-bold"
              style={{ color: uiTokens.textFaint, letterSpacing: '0.04em' }}>
              {col.header}
            </div>
          ))}
        </div>
        {showSkeleton ? (
          // Skeleton rows reserving space while stats load. Sized against statColumns
          // so the grid dimensions match the real table — no layout shift when data
          // arrives. Two skeleton rows (the typical number of seasons a player has
          // stats for).
          <>
            {[0, 1].map((row) => (
              <div
                key={row}
                className="grid gap-x-2 px-2.5 py-[9px]"
                style={{
                  gridTemplateColumns,
                  borderTop: row === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}`,
                }}>
                <div className="h-3 rounded animate-pulse" style={{ background: `${accent}26` }} />
                <div className="h-3 rounded animate-pulse" style={{ background: `${accent}1a` }} />
                {statColumns.map((col) => (
                  <div
                    key={col.header}
                    className="h-3 rounded animate-pulse"
                    style={{ background: `${accent}1a` }}
                  />
                ))}
              </div>
            ))}
          </>
        ) : (
          statSeasons.map((s, i) => (
            <div
              key={s.season}
              className="grid gap-x-2 px-2.5 py-[9px] font-bold"
              style={{
                gridTemplateColumns,
                borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}`,
                background: i === 0 ? `${accent}0d` : 'transparent',
                fontSize: typeScale.label,
              }}>
              <div style={{ color: i === 0 ? accent : uiTokens.textPrimary }}>{s.season}</div>
              <div style={{ color: uiTokens.textMuted }}>{s.teamAbbrev ?? '—'}</div>
              {statColumns.map((col) => (
                <div
                  key={col.header}
                  style={{
                    color: col.danger?.(s) ? uiTokens.statusInjured : uiTokens.textPrimary,
                  }}>
                  {col.value(s)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
