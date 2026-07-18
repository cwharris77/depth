'use client';

// Regular-season schedule for one team (design spec 5a's SCHEDULE tab). A weekly card
// grid — one card per week: opponent code chip in the opponent's colors, date, HOME/AWAY
// badge for upcoming games or the final score + W/L/T for played ones, with BYE weeks
// called out. Client component receiving one team's already-resolved schedule as a prop
// (invariant 5); it never imports all-32 data — opponent colors are baked into the prop.
import type { TeamMeta } from '@/lib/roster-source';
import type { TeamSchedule, TeamScheduleGame } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import TeamPageHeader from './TeamPageHeader';
import { colors as uiTokens } from '@/components/ui/tokens';

interface Props {
  team: TeamMeta;
  teams: TeamMeta[];
  schedule: TeamSchedule | null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Parse the yyyy-mm-dd parts directly rather than `new Date(iso)` — the latter is parsed
// as UTC midnight and shifts a day back in western timezones. Returns e.g. "SEP 9".
function formatGameDate(iso: string | null): string {
  if (!iso) return '';
  const [, month, day] = iso.split('-').map(Number);
  if (!month || !day) return '';
  return `${MONTHS[month - 1]} ${day}`;
}

const RESULT_COLOR: Record<'W' | 'L' | 'T', string> = {
  W: '#3fb950',
  L: uiTokens.statusInjured,
  T: uiTokens.textMuted,
};

function GameCard({
  game,
  uiAccent,
  onAccent,
}: {
  game: TeamScheduleGame;
  uiAccent: string;
  onAccent: string;
}) {
  if (game.isBye) {
    return (
      <div
        className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center"
        style={{ border: '1px dashed rgba(255,255,255,0.25)' }}>
        <div
          className="text-[9px] font-bold tracking-[0.06em]"
          style={{ color: uiTokens.textFaint }}>
          WEEK {game.week}
        </div>
        <div className="text-xs font-black" style={{ color: uiTokens.textMuted }}>
          BYE
        </div>
      </div>
    );
  }

  const opp = game.opponent;
  const played = game.result !== null;

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
      <div className="text-[9px] font-bold tracking-[0.06em]" style={{ color: uiTokens.textFaint }}>
        WEEK {game.week}
      </div>
      <div
        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[9px] font-black"
        style={
          opp
            ? {
                background: opp.colors.primary,
                border: `1px solid ${opp.colors.secondary}`,
                color: readableTextOn(opp.colors.primary),
              }
            : { background: 'rgba(255,255,255,0.08)', color: uiTokens.textMuted }
        }>
        {opp?.abbrev ?? '—'}
      </div>
      <div className="text-[11px] font-extrabold" style={{ color: uiTokens.textPrimary }}>
        {game.isHome ? 'vs' : '@'} {opp?.abbrev ?? '—'}
      </div>
      {played ? (
        <div
          className="text-[10px] font-bold"
          style={{ color: RESULT_COLOR[game.result as 'W' | 'L' | 'T'] }}>
          {game.result} {game.teamScore}-{game.oppScore}
        </div>
      ) : (
        <>
          <div className="text-[10px] font-bold" style={{ color: uiTokens.textMuted }}>
            {formatGameDate(game.date)}
          </div>
          <div
            className="rounded-full px-2 py-0.5 text-[8px] font-bold tracking-[0.06em]"
            style={
              game.isHome
                ? { background: uiAccent, color: onAccent }
                : { background: 'rgba(255,255,255,0.08)', color: uiTokens.textMuted }
            }>
            {game.isHome ? 'HOME' : 'AWAY'}
          </div>
        </>
      )}
    </div>
  );
}

export default function TeamScheduleView({ team, teams, schedule }: Props) {
  const { uiAccent, onAccent } = team.colors;

  const header = (
    <div
      className="bg-background px-5 pb-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <TeamPageHeader team={team} teams={teams} colors={team.colors} activePage="schedule" />
    </div>
  );

  if (!schedule || schedule.games.length === 0) {
    return (
      <div className="bg-background" style={{ minHeight: '100dvh', color: uiTokens.textPrimary }}>
        {header}
        <p className="px-5 text-sm" style={{ color: uiTokens.textMuted }}>
          No schedule available for this team yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background" style={{ minHeight: '100dvh', color: uiTokens.textPrimary }}>
      {header}
      <div className="px-[18px] pb-1 pt-[18px]">
        <div
          className="text-[10px] font-bold tracking-[0.1em]"
          style={{ color: uiTokens.textFaint }}>
          {schedule.season} SEASON
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3.5 pb-6 pt-2">
        {schedule.games.map((game) => (
          <GameCard key={game.week} game={game} uiAccent={uiAccent} onAccent={onAccent} />
        ))}
      </div>
    </div>
  );
}
