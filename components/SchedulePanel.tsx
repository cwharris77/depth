'use client';

// Desktop context panel for the schedule page (TeamPageShell's aside; Claude Design
// "Depth Wide Desktop" mock): season snapshot, next game, home/road splits, and recent
// form. Everything is derived client-side from the schedule prop the page already ships
// (lib/schedule-summary.ts) — no second data fetch (AGENTS.md invariant 5). Renders
// nothing when there's no schedule; the main column already shows the empty state.
import { colors as uiTokens } from '@/components/ui/tokens';
import SectionLabel from '@/components/ui/SectionLabel';
import { readableTextOn } from '@/lib/colors';
import { scheduleSummary } from '@/lib/schedule-summary';
import type { TeamSchedule } from '@/lib/types';

// Same W/L/T mapping as TeamScheduleView's result line — the win green is a literal
// there too (no token yet).
const RESULT_COLOR: Record<'W' | 'L' | 'T', string> = {
  W: '#3fb950',
  L: uiTokens.statusInjured,
  T: uiTokens.textMuted,
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Parse yyyy-mm-dd parts directly, not `new Date(iso)` (UTC parse shifts a day back in
// western timezones) — same guard as TeamScheduleView/TeamStatsView.
function formatGameDate(iso: string | null): string {
  if (!iso) return '';
  const [, month, day] = iso.split('-').map(Number);
  if (!month || !day) return '';
  return `${MONTHS[month - 1]} ${day}`;
}

function SplitCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex-1 rounded-xl px-3 py-3 text-center"
      style={{ background: uiTokens.surfaceCard2, border: `1px solid ${uiTokens.borderDefault}` }}>
      <div className="text-[9px] font-bold tracking-[0.08em]" style={{ color: uiTokens.textFaint }}>
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
        <SectionLabel className="pb-2">SEASON SNAPSHOT</SectionLabel>
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
          <SectionLabel className="pb-2.5">NEXT GAME</SectionLabel>
          <div
            className="flex items-center gap-3 rounded-[14px] p-3.5"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderDefault}`,
            }}>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[11px] font-black"
              style={{
                background: next.opponent.colors.primary,
                border: `1px solid ${next.opponent.colors.secondary}`,
                color: readableTextOn(next.opponent.colors.primary),
              }}>
              {next.opponent.abbrev}
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-extrabold" style={{ color: uiTokens.textPrimary }}>
                {next.isHome ? 'vs' : '@'} {next.opponent.abbrev}
              </div>
              <div className="text-[11px]" style={{ color: uiTokens.textMuted }}>
                Week {next.week}
                {next.date ? ` · ${formatGameDate(next.date)}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionLabel className="pb-2.5">HOME / ROAD</SectionLabel>
        <div className="flex gap-2">
          <SplitCard label="HOME" value={s.homeRecord} />
          <SplitCard label="ROAD" value={s.roadRecord} />
        </div>
      </div>

      {s.recentForm.length > 0 && (
        <div>
          <SectionLabel className="pb-2.5">RECENT FORM</SectionLabel>
          <div className="flex gap-2">
            {s.recentForm.map((result, i) => (
              <span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
                style={{
                  color: RESULT_COLOR[result],
                  background: `${RESULT_COLOR[result]}1a`,
                  border: `1px solid ${RESULT_COLOR[result]}55`,
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
