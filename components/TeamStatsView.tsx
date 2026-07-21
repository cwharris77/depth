'use client';

// Season-record view for the team stats page (docs/superpowers/specs/2026-07-14-
// multi-season-team-stats-design.md). A client component so the season switcher can hold
// local state; it receives one team's already-resolved data as a prop (invariant 5) —
// `seasons` is small (current + up to two prior years), never a fan-out of all-32 data.
import SectionLabel from '@/components/ui/SectionLabel';
import { colors as uiTokens } from '@/components/ui/tokens';
import { readableTextOn } from '@/lib/colors';
import { ordinal } from '@/lib/format';
import type { TeamMeta } from '@/lib/roster-source';
import type { Leader, RosterLeaders, TeamScheduleGame, TeamStats } from '@/lib/types';
import { useState } from 'react';
import TeamPageHeader from './TeamPageHeader';

interface Props {
  team: TeamMeta;
  teams: TeamMeta[];
  seasons: TeamStats[];
  incomingCoach?: { name: string };
  upcomingSeason?: number;
  // Current-roster passing/rushing/receiving leaders (design spec 5a). Null when no
  // player stats are ingested for the team yet; the block is then omitted entirely.
  leaders?: RosterLeaders | null;
  // The team's next unplayed game (design spec 5a's NEXT GAME card). Null in the
  // offseason / once the season is complete, in which case the card is omitted.
  nextGame?: TeamScheduleGame | null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Parse yyyy-mm-dd parts directly, not `new Date(iso)` (which is UTC and shifts a day in
// western timezones). Returns e.g. "SEP 9".
function formatGameDate(iso: string | null): string {
  if (!iso) return '';
  const [, month, day] = iso.split('-').map(Number);
  if (!month || !day) return '';
  return `${MONTHS[month - 1]} ${day}`;
}

function wl(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <>
      <td className="py-[9px]" style={{ color: uiTokens.textFaint }}>
        {label}
      </td>
      <td className="py-[9px] text-right font-bold" style={color ? { color } : undefined}>
        {value}
      </td>
    </>
  );
}

export default function TeamStatsView({
  team,
  teams,
  seasons,
  incomingCoach,
  upcomingSeason,
  leaders,
  nextGame,
}: Props) {
  const [index, setIndex] = useState(seasons.length > 0 ? 0 : -1);
  const { uiAccent } = team.colors;

  // Passing/rushing/receiving leaders in a fixed order, dropping any category with no
  // leader (invariant 6 — show nothing, not a zeroed row). Leaders reflect the current
  // roster's latest season, independent of the season switcher above.
  const leaderRows: { label: string; leader: Leader }[] = leaders
    ? (
        [
          ['PASSING', leaders.passing],
          ['RUSHING', leaders.rushing],
          ['RECEIVING', leaders.receiving],
        ] as const
      ).flatMap(([label, leader]) => (leader ? [{ label, leader }] : []))
    : [];

  const header = (
    <div
      className="px-5 pb-3"
      style={{ background: uiTokens.bg, paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <TeamPageHeader team={team} teams={teams} colors={team.colors} activePage="stats" />
    </div>
  );

  if (seasons.length === 0 && !incomingCoach && !upcomingSeason) {
    return (
      <div style={{ minHeight: '100dvh', background: uiTokens.bg, color: uiTokens.textPrimary }}>
        {header}
        <p className="px-5 text-sm" style={{ color: uiTokens.textMuted }}>
          No stats available for this team yet.
        </p>
      </div>
    );
  }

  // Index -1 is the upcoming season (exists during the off-season for ALL teams, not
  // just new-coach teams — Stats & Analytics P2). For teams with an incoming coach,
  // index -2 is the incoming coach chip (no season stats to attach to yet). Both are
  // clamped independently of the real `seasons` array below.
  const hasUpcomingChip = !!upcomingSeason;
  const hasIncomingCoach = !!incomingCoach;
  const minIndex = hasUpcomingChip ? (hasIncomingCoach ? -2 : -1) : hasIncomingCoach ? -1 : 0;
  const clampedIndex = Math.min(Math.max(index, minIndex), seasons.length - 1);
  const active = clampedIndex >= 0 ? seasons[clampedIndex] : null;
  const nextSeasonLabel = upcomingSeason
    ? String(upcomingSeason)
    : seasons[0]
      ? String(seasons[0].season + 1)
      : 'NEW';

  const record = active
    ? active.overallTies
      ? `${active.overallWins}-${active.overallLosses}-${active.overallTies}`
      : `${active.overallWins}-${active.overallLosses}`
    : null;
  const diff = active?.pointDifferential ?? 0;
  const diffLabel = diff > 0 ? `+${diff}` : String(diff);
  const diffColor = diff > 0 ? uiAccent : diff < 0 ? uiTokens.statusInjured : uiTokens.textMuted;
  const gamesPlayed = active ? active.overallWins + active.overallLosses + active.overallTies : 0;

  return (
    <div style={{ minHeight: '100dvh', background: uiTokens.bg, color: uiTokens.textPrimary }}>
      {header}

      {/* Season switcher — no prev/next arrows: desktop is wide enough to show every
          season at once, and mobile relies on the horizontal swipe affordance. */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2.5 overflow-x-auto"
        style={{
          borderBottom: `1px solid ${uiTokens.borderStrong}`,
          background: uiTokens.bgFilterbar,
          scrollbarWidth: 'none',
        }}>
        {[...seasons]
          .map((s, i) => ({ s, i }))
          .reverse()
          .map(({ s, i }) => {
            const isSelected = i === clampedIndex;
            const isLatest = i === 0;
            return (
              <button
                key={s.season}
                type="button"
                onClick={() => setIndex(i)}
                className="shrink-0 flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-bold"
                style={{
                  background: isSelected ? uiAccent : 'transparent',
                  color: isSelected ? uiTokens.bg : uiTokens.textMuted,
                  border: `1px solid ${isSelected ? uiAccent : uiTokens.borderInput}`,
                }}>
                {isLatest && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: isSelected ? uiTokens.bg : uiAccent }}
                  />
                )}
                {s.season}
              </button>
            );
          })}
        {/* Upcoming season chip — shown for ALL teams during the off-season, not just
            new-coach teams (Stats & Analytics P2). Renders after every real season chip
            and uses the same badge pattern as the schedule page's HOME/AWAY badge. */}
        {upcomingSeason && (
          <button
            type="button"
            onClick={() => setIndex(-1)}
            className="shrink-0 flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-bold"
            style={{
              background: clampedIndex === -1 ? uiAccent : 'transparent',
              color: clampedIndex === -1 ? uiTokens.bg : uiTokens.textMuted,
              border: `1px dashed ${clampedIndex === -1 ? uiAccent : uiTokens.borderInput}`,
            }}>
            {upcomingSeason}
            {(clampedIndex === -1 || !hasIncomingCoach) && (
              <span
                className="inline-block rounded-full px-1.5 py-[1px] text-[8px] font-bold tracking-[0.04em]"
                style={{
                  color: clampedIndex === -1 ? uiTokens.bg : uiAccent,
                  background: clampedIndex === -1 ? `${uiTokens.bg}33` : `${uiAccent}1a`,
                  border: `1px solid ${clampedIndex === -1 ? `${uiTokens.bg}55` : `${uiAccent}55`}`,
                }}>
                UPCOMING
              </span>
            )}
          </button>
        )}
      </div>

      {/* Team + coach — coach is season-scoped, keyed off the active season row
          (docs/superpowers/specs/2026-07-14-season-scoped-head-coach-design.md). The
          incoming-coach chip (index -1) has no season stats to attach to, so it gets its
          own short-circuited render below instead of falling through to `active.coach`. */}
      <div className="px-5 pt-[18px]">
        <div
          className="text-[11px] font-bold tracking-[0.1em]"
          style={{ color: uiTokens.textFaint }}>
          {team.city.toUpperCase()} {team.name.toUpperCase()}
        </div>
        {active?.coach && (
          <div className="mt-0.5 text-[11px]" style={{ color: uiTokens.textMuted }}>
            HC {active.coach.name.toUpperCase()} · {ordinal(active.coach.experience).toUpperCase()}{' '}
            SEASON
          </div>
        )}
        {!active && (
          <>
            {/* Upcoming season — general off-season chip for all teams */}
            {clampedIndex === -1 && incomingCoach && (
              <div className="mt-0.5 text-[11px]" style={{ color: uiTokens.textMuted }}>
                HC {incomingCoach.name.toUpperCase()} · INCOMING
              </div>
            )}
            {clampedIndex === -1 && !incomingCoach && (
              <div className="mt-0.5 text-[11px]" style={{ color: uiTokens.textMuted }}>
                UPCOMING SEASON · SCHEDULE AVAILABLE
              </div>
            )}
            {/* Incoming coach but no upcoming season (shouldn't happen, but
                defensive: legacy case from before the generalized chip). */}
            {clampedIndex === -2 && incomingCoach && (
              <div className="mt-0.5 text-[11px]" style={{ color: uiTokens.textMuted }}>
                HC {incomingCoach.name.toUpperCase()} · INCOMING
              </div>
            )}
          </>
        )}
      </div>

      {active ? (
        <>
          {/* Hero record */}
          <div
            className="mt-0.5 flex items-baseline justify-between px-5 pb-[18px] pt-2"
            style={{ borderBottom: `1px dashed ${uiTokens.borderInput}` }}>
            <div className="text-[52px] font-bold leading-none tracking-[-0.02em]">{record}</div>
            <div className="text-right">
              <div className="text-[13px] font-bold" style={{ color: uiAccent }}>
                {active.streak}
              </div>
              <div className="text-[11px]" style={{ color: uiTokens.textFaint }}>
                {active.playoffSeed
                  ? `SEED ${active.playoffSeed} · ${team.conference}`
                  : `MISSED PLAYOFFS · ${team.conference}`}
              </div>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="px-5">
            <table className="mt-1.5 w-full border-collapse text-xs">
              <tbody>
                <tr style={{ borderBottom: `1px solid ${uiTokens.borderStrong}` }}>
                  <StatCell label="HOME" value={wl(active.homeWins, active.homeLosses)} />
                  <td className="w-6" />
                  <StatCell label="ROAD" value={wl(active.roadWins, active.roadLosses)} />
                </tr>
                <tr style={{ borderBottom: `1px solid ${uiTokens.borderStrong}` }}>
                  <StatCell label="DIV" value={wl(active.divisionWins, active.divisionLosses)} />
                  <td className="w-6" />
                  <StatCell
                    label="CONF"
                    value={wl(active.conferenceWins, active.conferenceLosses)}
                  />
                </tr>
                <tr style={{ borderBottom: `1px solid ${uiTokens.borderStrong}` }}>
                  <StatCell label="PF" value={String(active.pointsFor)} />
                  <td className="w-6" />
                  <StatCell label="PA" value={String(active.pointsAgainst)} />
                </tr>
                <tr>
                  <StatCell label="DIFF" value={diffLabel} color={diffColor} />
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer ticker */}
          <div
            className="px-5 pb-[22px] pt-3.5 text-[10px] tracking-[0.06em]"
            style={{ color: uiTokens.textFaintest }}>
            {active.season} SEASON · {gamesPlayed} GAMES PLAYED ▸▸▸
          </div>
        </>
      ) : clampedIndex === -1 && upcomingSeason ? (
        <>
          {/* Upcoming season view — shown for ALL teams during the off-season, not
              just new-coach teams (Stats & Analytics P2). Degrade instead of faking a
              0-0 record (invariant 6) — there are no stats to show yet. */}
          <div
            className="mt-0.5 px-5 pb-[18px] pt-2"
            style={{ borderBottom: `1px dashed ${uiTokens.borderInput}` }}>
            <div className="text-[28px] font-bold leading-tight tracking-[-0.01em]">
              {upcomingSeason} season upcoming
            </div>
            <div className="mt-1 text-[11px]" style={{ color: uiTokens.textFaint }}>
              No games played yet this season
            </div>
          </div>
          <div
            className="px-5 pb-[22px] pt-3.5 text-[10px] tracking-[0.06em]"
            style={{ color: uiTokens.textFaintest }}>
            {upcomingSeason} SEASON · NOT YET STARTED ▸▸▸
          </div>
        </>
      ) : (
        <>
          {/* No season stats for an incoming coach yet — degrade instead of faking a
              0-0 record (invariant 6). */}
          <div
            className="mt-0.5 px-5 pb-[18px] pt-2"
            style={{ borderBottom: `1px dashed ${uiTokens.borderInput}` }}>
            <div className="text-[28px] font-bold leading-tight tracking-[-0.01em]">
              New head coach
            </div>
            <div className="mt-1 text-[11px]" style={{ color: uiTokens.textFaint }}>
              No games played yet this season.
            </div>
          </div>
          <div
            className="px-5 pb-[22px] pt-3.5 text-[10px] tracking-[0.06em]"
            style={{ color: uiTokens.textFaintest }}>
            {nextSeasonLabel} SEASON · NOT YET STARTED ▸▸▸
          </div>
        </>
      )}

      {/* NEXT GAME card (design spec 5a). Only when there's an upcoming game with a
          resolved opponent; omitted in the offseason / once the season is complete. */}
      {nextGame && nextGame.opponent && (
        <div className="px-[18px] pt-3.5">
          <div
            className="flex items-center justify-between rounded-2xl px-3.5 py-3"
            style={{ background: uiTokens.surfaceRaised, border: `1px solid ${uiAccent}33` }}>
            <div>
              <div
                className="text-[9px] font-bold tracking-[0.08em]"
                style={{ color: uiTokens.textMuted }}>
                NEXT GAME · WEEK {nextGame.week}
              </div>
              <div
                className="mt-[3px] text-[13px] font-extrabold"
                style={{ color: uiTokens.textPrimary }}>
                {nextGame.isHome ? 'vs' : '@'} {nextGame.opponent.abbrev}
                {nextGame.date ? ` · ${formatGameDate(nextGame.date)}` : ''}
              </div>
            </div>
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-black"
              style={{
                background: nextGame.opponent.colors.primary,
                border: `1px solid ${nextGame.opponent.colors.secondary}`,
                color: readableTextOn(nextGame.opponent.colors.primary),
              }}>
              {nextGame.opponent.abbrev}
            </div>
          </div>
        </div>
      )}

      {leaderRows.length > 0 && leaders && (
        <div className="px-5 pb-7 pt-1">
          <SectionLabel className="mb-2">ROSTER LEADERS · {leaders.season}</SectionLabel>
          {/* Card doesn't fit here: needs rounded-2xl + overflow-hidden clip + zero
              padding (rows supply their own), none of which Card's API exposes
              (rounded-3xl only, no clip variant, padding=16 default) — plain div with
              tokenized colors instead, same deviation pattern as PlayerCard's task. */}
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderSubtle}`,
            }}>
            {leaderRows.map(({ label, leader }, i) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}` }}>
                <div className="min-w-0">
                  <div
                    className="text-[9px] font-bold tracking-[0.06em]"
                    style={{ color: uiAccent }}>
                    {label}
                  </div>
                  <div
                    className="mt-0.5 truncate text-xs font-extrabold"
                    style={{ color: uiTokens.textPrimary }}>
                    {leader.name}
                  </div>
                </div>
                <div
                  className="shrink-0 text-right text-[10px]"
                  style={{ color: uiTokens.textMuted, maxWidth: 170 }}>
                  {leader.line}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
