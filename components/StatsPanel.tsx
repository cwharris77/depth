'use client';

// Desktop context panel for the stats page (TeamPageShell's aside; Claude Design "Depth
// Wide Desktop" mock): points for/against per season as paired bars, scaled against the
// highest single value across every season shown. Renders straight from the `seasons`
// prop the page already ships (AGENTS.md invariant 5); nothing here fetches. Empty
// seasons render nothing — the main column already handles the no-stats state.
import { colors as uiTokens } from '@/components/ui/tokens';
import SectionLabel from '@/components/ui/SectionLabel';
import type { TeamStats } from '@/lib/types';

function Bar({
  label,
  value,
  pct,
  color,
  title,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[26px] text-[9px]" style={{ color: uiTokens.textFaint }} title={title}>
        {label}
      </span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: uiTokens.surfaceInput }}>
        <div className="h-full rounded-full" style={{ background: color, width: `${pct}%` }} />
      </div>
      <span
        className="w-[30px] text-right text-[10px] font-bold"
        style={{ color: uiTokens.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

export default function StatsPanel({ seasons, accent }: { seasons: TeamStats[]; accent: string }) {
  if (seasons.length === 0) return null;
  const maxPoints = Math.max(...seasons.flatMap((s) => [s.pointsFor, s.pointsAgainst]));
  // A season with zero points everywhere (shouldn't happen, but degrade — invariant 6)
  // renders empty tracks instead of dividing by zero.
  const pct = (v: number) => (maxPoints > 0 ? Math.round((v / maxPoints) * 100) : 0);

  return (
    <div className="flex flex-col gap-5 px-[22px] py-6">
      <SectionLabel className="p-0">POINTS FOR / AGAINST · BY SEASON</SectionLabel>
      <div className="flex flex-col gap-3.5">
        {seasons.map((s) => {
          const diff = s.pointDifferential;
          const diffColor =
            diff > 0 ? accent : diff < 0 ? uiTokens.statusInjured : uiTokens.textMuted;
          return (
            <div key={s.season}>
              <div
                className="mb-1.5 flex justify-between text-[11px] font-bold"
                style={{ color: uiTokens.textSecondary }}>
                <span>{s.season}</span>
                <span style={{ color: diffColor }}>{diff > 0 ? `+${diff}` : diff}</span>
              </div>
              <div className="flex flex-col gap-1">
                <Bar
                  label="PF"
                  value={s.pointsFor}
                  pct={pct(s.pointsFor)}
                  color={accent}
                  title="Points For"
                />
                <Bar
                  label="PA"
                  value={s.pointsAgainst}
                  pct={pct(s.pointsAgainst)}
                  color={uiTokens.statusInjured}
                  title="Points Against"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
