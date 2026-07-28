'use client';

// Regular-season schedule for one team (design spec 5a's SCHEDULE tab). A weekly card
// grid — one card per week: opponent code chip in the opponent's colors, date, HOME/AWAY
// badge for upcoming games or the final score + W/L/T for played ones, with BYE weeks
// called out. Client component receiving one team's already-resolved schedule as a prop
// (invariant 5); it never imports all-32 data — opponent colors are baked into the prop.
import type { TeamMeta } from '@/lib/roster-source';
import type { TeamSchedule, TeamScheduleGame } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import Link from 'next/link';
import SchedulePanel from './SchedulePanel';
import TeamPageHeader from './TeamPageHeader';
import TeamPageShell from './TeamPageShell';
import Badge from '@/components/ui/Badge';
import { colors as uiTokens } from '@/components/ui/tokens';
import { useKitColors } from '@/lib/use-kit-colors';

interface Props {
  team: TeamMeta;
  teams: TeamMeta[];
  schedule: TeamSchedule | null;
  isUpcoming?: boolean;
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
  teamId,
  uiAccent,
}: {
  game: TeamScheduleGame;
  teamId: string;
  uiAccent: string;
}) {
  if (game.isBye) {
    return (
      <div
        className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center"
        style={{ border: `1px dashed ${uiTokens.borderInput}` /* nearest token to 0.25 alpha */ }}>
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
  const content = (
    <>
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
            : {
                background: uiTokens.surfaceChip /* nearest token to 0.08 alpha */,
                color: uiTokens.textMuted,
              }
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
          <Badge kind="tag" accent={game.isHome ? uiAccent : uiTokens.textMuted}>
            {game.isHome ? 'HOME' : 'AWAY'}
          </Badge>
        </>
      )}
    </>
  );

  const cardClass =
    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.05]';
  const cardStyle = {
    background: uiTokens.surfaceCard2,
    border: `1px solid ${uiTokens.borderDefault}`,
  };

  if (!opp)
    return (
      <div className={cardClass} style={cardStyle}>
        {content}
      </div>
    );

  return (
    <Link href={`/compare?a=${teamId}&b=${opp.id}`} className={cardClass} style={cardStyle}>
      {content}
    </Link>
  );
}

export default function TeamScheduleView({ team, teams, schedule, isUpcoming }: Props) {
  // Picks up whichever kit is active on the roster page for this team (lib/use-kit-colors.ts)
  // instead of always showing the default team colors — falls back to team.colors when
  // nothing was ever picked this session.
  const colors = useKitColors(team);
  const { uiAccent } = colors;

  const header = (
    <div
      className="bg-background px-5 pb-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <TeamPageHeader team={team} teams={teams} colors={colors} activePage="schedule" />
    </div>
  );

  return (
    <TeamPageShell
      team={team}
      teams={teams}
      activePage="schedule"
      accent={uiAccent}
      aside={<SchedulePanel schedule={schedule} accent={uiAccent} />}>
      <div className="bg-background" style={{ minHeight: '100dvh', color: uiTokens.textPrimary }}>
        {header}
        {!schedule || schedule.games.length === 0 ? (
          <p className="px-5 text-sm" style={{ color: uiTokens.textMuted }}>
            No schedule available for this team yet.
          </p>
        ) : (
          <>
            <div className="px-[18px] pb-1 pt-[18px]">
              <div className="flex items-center gap-2">
                <div
                  className="text-[10px] font-bold tracking-[0.1em]"
                  style={{ color: uiTokens.textFaint }}>
                  {schedule.season} SEASON
                </div>
                {isUpcoming && (
                  <Badge kind="tag" accent={uiAccent}>
                    UPCOMING
                  </Badge>
                )}
              </div>
            </div>
            {/* Desktop's wider main column fits more weeks per row (multi-panel mock). */}
            <div className="grid grid-cols-3 gap-2 px-3.5 pb-6 pt-2 xl:grid-cols-5 xl:gap-3">
              {schedule.games.map((game) => (
                <GameCard key={game.week} game={game} teamId={team.id} uiAccent={uiAccent} />
              ))}
            </div>
          </>
        )}
      </div>
    </TeamPageShell>
  );
}
