'use client';

// Desktop context panel for the schedule page (TeamPageShell's aside; Claude Design
// "Depth Wide Desktop" mock): season snapshot, next game, home/road splits, and recent
// form. Everything is derived client-side from the schedule prop the page already ships
// (lib/utils/schedule/schedule-summary.ts) — no second data fetch (AGENTS.md invariant 5). Renders
// nothing when there's no schedule; the main column already shows the empty state.
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';
import SectionLabel from '@/components/ui/SectionLabel';
import { gameResultColor, readableTextOn } from '@/lib/utils/colors';
import { formatGameDate } from '@/lib/utils/format';
import { scheduleSummary } from '@/lib/utils/schedule/schedule-summary';
import type { TeamSchedule } from '@/lib/types';

function SplitCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex-1 rounded-xl px-3 py-3 text-center"
      style={{ background: uiTokens.surfaceCard2, border: `1px solid ${uiTokens.borderDefault}` }}>
      <div
        className="font-bold tracking-[0.08em]"
        style={{ color: uiTokens.textFaint, fontSize: typeScale.micro }}>
        {label}
      </div>
      <div className="mt-1 text-lg font-black" style={{ color: uiTokens.textPrimary }}>
        {value}
      </div>
    </div>
  );
}

export default function SchedulePanel({
  schedule,
  accent,
}: {
  schedule: TeamSchedule | null;
  accent: string;
}) {
  if (!schedule || schedule.games.length === 0) return null;
  const s = scheduleSummary(schedule.games);
  const next = s.nextGame;

  return (
    <div className="flex flex-col gap-[18px] px-[22px] py-6">
      <div>
        <SectionLabel className="px-0 pb-2">SEASON SNAPSHOT</SectionLabel>
        <div className="flex items-baseline justify-between">
          <span
            className="text-[40px] font-black leading-none tracking-[-0.02em]"
            style={{ color: uiTokens.textPrimary }}>
            {s.record}
          </span>
          {s.streak && (
            <span className="text-xs font-extrabold" style={{ color: accent }}>
              {s.streak}
            </span>
          )}
        </div>
      </div>

      {next?.opponent && (
        <div>
          <SectionLabel className="px-0 pb-2.5">NEXT GAME</SectionLabel>
          <div
            className="flex items-center gap-3 rounded-[14px] p-3.5"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderDefault}`,
            }}>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[9px] font-black"
              style={{
                background: next.opponent.colors.primary,
                border: `1px solid ${next.opponent.colors.secondary}`,
                color: readableTextOn(next.opponent.colors.primary),
                fontSize: typeScale.label,
              }}>
              {next.opponent.abbrev}
            </span>
            <div className="flex-1">
              <div
                className="font-extrabold"
                style={{ color: uiTokens.textPrimary, fontSize: typeScale.title }}>
                {next.isHome ? 'vs' : '@'} {next.opponent.abbrev}
              </div>
              <div style={{ color: uiTokens.textMuted, fontSize: typeScale.label }}>
                Week {next.week}
                {next.date ? ` · ${formatGameDate(next.date)}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionLabel className="px-0 pb-2.5">HOME / ROAD</SectionLabel>
        <div className="flex gap-2">
          <SplitCard label="HOME" value={s.homeRecord} />
          <SplitCard label="ROAD" value={s.roadRecord} />
        </div>
      </div>

      {s.recentForm.length > 0 && (
        <div>
          <SectionLabel className="px-0 pb-2.5">RECENT FORM</SectionLabel>
          <div className="flex gap-2">
            {s.recentForm.map((result, i) => (
              <span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
                style={{
                  color: gameResultColor(result),
                  background: `${gameResultColor(result)}1a`,
                  border: `1px solid ${gameResultColor(result)}55`,
                }}>
                {result}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
