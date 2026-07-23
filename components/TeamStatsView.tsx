'use client';

// Season-record view for the team stats page (docs/superpowers/specs/2026-07-14-
// multi-season-team-stats-design.md). A client component so the season switcher can hold
// local state; it receives one team's already-resolved data as a prop (invariant 5) —
// `seasons` is small (current + up to two prior years), never a fan-out of all-32 data.
import SectionLabel from '@/components/ui/SectionLabel';
import { colors as uiTokens } from '@/components/ui/tokens';
import { readableTextOn } from '@/lib/colors';
import { ordinal } from '@/lib/format';
import { postseasonRoundLabel } from '@/lib/schedule';
import type { TeamMeta } from '@/lib/roster-source';
import type { Leader, RosterLeaders, TeamScheduleGame, TeamStats } from '@/lib/types';
import { useState } from 'react';
import StatsPanel from './StatsPanel';
import TeamPageHeader from './TeamPageHeader';
import TeamPageShell from './TeamPageShell';

interface Props {
  team: TeamMeta;
  teams: TeamMeta[];
  seasons: TeamStats[];
  incomingCoach?: { name: string };
  upcomingSeason?: number;
  // Passing/rushing/receiving leaders per season (design spec 5a), one entry per
  // `seasons` row at the same index. Null at an index when no player stats are
  // ingested for that season; the block is then omitted entirely. Re-derived per the
  // selected season tab, not pinned to the roster's newest season.
  leadersBySeason?: (RosterLeaders | null)[];
  // The team's next unplayed game (design spec 5a's NEXT GAME card). Null in the
  // offseason / once the season is complete, in which case the card is omitted.
  nextGame?: TeamScheduleGame | null;
  // The team's postseason games (opponent, round, result, score) for its most recent
  // completed/reported season (seasons[0]) only — not re-derived per season tab. Empty
  // for a team that missed the postseason, in which case no section renders.
  postseasonGames?: TeamScheduleGame[];
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

// Coach treatment (design mock 1a, docs/superpowers/specs — Claude Design "Coach Treatment
// Options"): a real type hierarchy — bigger name, accent-colored meta caption — instead of
// one flat 11px line.
function CoachBadge({ name, meta, uiAccent }: { name: string; meta: string; uiAccent: string }) {
  return (
    <div className="mt-[11px]">
      <div
        className="text-[16px] font-extrabold leading-tight"
        style={{ color: uiTokens.textPrimary }}>
        {name}
      </div>
      <div className="mt-0.5 text-[11px] font-bold tracking-[0.06em]" style={{ color: uiAccent }}>
        {meta}
      </div>
    </div>
  );
}

// Shared "UPCOMING" pill for the season switcher — used both by the synthetic
// upcoming-season chip and by a real season chip when ingest has already landed a
// team_stats row for that year (a stub row created ahead of kickoff).
function UpcomingBadge({ selected, uiAccent }: { selected: boolean; uiAccent: string }) {
  return (
    <span
      className="inline-block rounded-full px-1.5 py-[1px] text-[8px] font-bold tracking-[0.04em]"
      style={{
        color: selected ? uiTokens.bg : uiAccent,
        background: selected ? `${uiTokens.bg}33` : `${uiAccent}1a`,
        border: `1px solid ${selected ? `${uiTokens.bg}55` : `${uiAccent}55`}`,
      }}>
      UPCOMING
    </span>
  );
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
  leadersBySeason,
  nextGame,
  postseasonGames,
}: Props) {
  const [index, setIndex] = useState(seasons.length > 0 ? 0 : -1);
  const { uiAccent } = team.colors;

  const header = (
    <div
      className="px-5 pb-3"
      style={{ background: uiTokens.bg, paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <TeamPageHeader team={team} teams={teams} colors={team.colors} activePage="stats" />
    </div>
  );

  // Both return paths render inside the shell so desktop keeps the rail + panel frame
  // even in the degraded no-stats state (StatsPanel renders nothing for zero seasons).
  const shellProps = {
    team,
    teams,
    activePage: 'stats' as const,
    accent: uiAccent,
    aside: <StatsPanel seasons={seasons} accent={uiAccent} />,
  };

  if (seasons.length === 0 && !incomingCoach && !upcomingSeason) {
    return (
      <TeamPageShell {...shellProps}>
        <div style={{ minHeight: '100dvh', background: uiTokens.bg, color: uiTokens.textPrimary }}>
          {header}
          <p className="px-5 text-sm" style={{ color: uiTokens.textMuted }}>
            No stats available for this team yet.
          </p>
        </div>
      </TeamPageShell>
    );
  }

  // Ingest can land a real team_stats row for the upcoming season ahead of kickoff (a
  // stub row with no games played yet), in which case that row IS the upcoming season —
  // no separate synthetic chip, just the UPCOMING badge carried onto the real one.
  const upcomingSeasonHasRealRow =
    upcomingSeason !== undefined && seasons.some((s) => s.season === upcomingSeason);

  // Index -1 is the upcoming season (exists during the off-season for ALL teams, not
  // just new-coach teams — Stats & Analytics P2), unless it's already one of the real
  // `seasons` rows above. For teams with an incoming coach, index -2 is the incoming
  // coach chip (no season stats to attach to yet). Both are clamped independently of
  // the real `seasons` array below.
  const hasUpcomingChip = !!upcomingSeason && !upcomingSeasonHasRealRow;
  const hasIncomingCoach = !!incomingCoach;
  const minIndex = hasUpcomingChip ? (hasIncomingCoach ? -2 : -1) : hasIncomingCoach ? -1 : 0;
  const clampedIndex = Math.min(Math.max(index, minIndex), seasons.length - 1);
  const active = clampedIndex >= 0 ? seasons[clampedIndex] : null;

  // Leaders for the selected season tab (falls back to null for the upcoming-season/
  // incoming-coach chips, which have no season stats yet — invariant 6).
  const leaders = clampedIndex >= 0 ? (leadersBySeason?.[clampedIndex] ?? null) : null;
  // Passing/rushing/receiving leaders in a fixed order, dropping any category with no
  // leader (invariant 6 — show nothing, not a zeroed row).
  const leaderRows: { label: string; leader: Leader }[] = leaders
    ? (
        [
          ['PASSING', leaders.passing],
          ['RUSHING', leaders.rushing],
          ['RECEIVING', leaders.receiving],
        ] as const
      ).flatMap(([label, leader]) => (leader ? [{ label, leader }] : []))
    : [];

  // The NEXT GAME pill is scoped to the season actually being viewed: the in-progress
  // season while the league is in-season, or the upcoming season during the off-season
  // (Stats & Analytics P1) — never a past season tab. When the upcoming season is a
  // real row rather than the synthetic chip, "viewing it" means the selected real row's
  // season matches, not the (now nonexistent) index -1.
  const isViewingCurrentSeason = !upcomingSeason && clampedIndex === 0;
  const isViewingUpcomingSeason = hasUpcomingChip
    ? clampedIndex === -1
    : upcomingSeasonHasRealRow && active?.season === upcomingSeason;
  const showNextGame = !!nextGame?.opponent && (isViewingCurrentSeason || isViewingUpcomingSeason);

  // Postseason section: only on the season tab it was fetched for (seasons[0], the most
  // recent completed/reported season) — never on an older season tab or the upcoming-
  // season/incoming-coach chips, which have no postseason data attached. Empty array
  // (missed the postseason, or games not ingested yet) renders no section (invariant 6).
  const showPostseason =
    !!postseasonGames?.length && !!active && active.season === seasons[0]?.season;

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
    <TeamPageShell {...shellProps}>
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
              // A real row for the upcoming season (ingest stub landed early) carries
              // the UPCOMING badge instead of the plain "latest" dot — it isn't the
              // completed current season, even though it's the newest row on file.
              const isUpcomingRow = upcomingSeasonHasRealRow && s.season === upcomingSeason;
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
                  {isLatest && !isUpcomingRow && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: isSelected ? uiTokens.bg : uiAccent }}
                    />
                  )}
                  {s.season}
                  {isUpcomingRow && <UpcomingBadge selected={isSelected} uiAccent={uiAccent} />}
                </button>
              );
            })}
          {/* Upcoming season chip — shown for ALL teams during the off-season, not just
            new-coach teams (Stats & Analytics P2), unless a real season row for that
            year already exists above (then that row carries the badge instead — see
            isUpcomingRow). Uses the same badge pattern as the schedule page's HOME/AWAY
            badge. */}
          {hasUpcomingChip && (
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
                <UpcomingBadge selected={clampedIndex === -1} uiAccent={uiAccent} />
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
            <CoachBadge
              name={active.coach.name}
              meta={`HEAD COACH · ${ordinal(active.coach.experience).toUpperCase()} SEASON`}
              uiAccent={uiAccent}
            />
          )}
          {!active && (
            <>
              {/* Upcoming season — general off-season chip for all teams */}
              {clampedIndex === -1 && incomingCoach && (
                <CoachBadge
                  name={incomingCoach.name}
                  meta="HEAD COACH · INCOMING"
                  uiAccent={uiAccent}
                />
              )}
              {/* No coach change — carry the latest season's coach forward rather than a
                bare "schedule available" placeholder (the coach doesn't reset just
                because there's no team_stats row yet for the upcoming season). */}
              {clampedIndex === -1 && !incomingCoach && seasons[0]?.coach && (
                <CoachBadge
                  name={seasons[0].coach.name}
                  meta={`HEAD COACH · ${ordinal(seasons[0].coach.experience + 1).toUpperCase()} SEASON`}
                  uiAccent={uiAccent}
                />
              )}
              {/* Incoming coach but no upcoming season (shouldn't happen, but
                defensive: legacy case from before the generalized chip). */}
              {clampedIndex === -2 && incomingCoach && (
                <CoachBadge
                  name={incomingCoach.name}
                  meta="HEAD COACH · INCOMING"
                  uiAccent={uiAccent}
                />
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

        {/* NEXT GAME card (design spec 5a). Only when viewing the current/upcoming season
          tab (never a past season) and there's an unplayed game with a resolved
          opponent. */}
        {showNextGame && nextGame && nextGame.opponent && (
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

        {showPostseason && active && (
          <div className="px-5 pb-7 pt-1">
            <SectionLabel className="mb-2">POSTSEASON · {active.season}</SectionLabel>
            {/* Same card treatment as ROSTER LEADERS below — plain tokenized div, not
              Card (rounded-2xl + zero-padding rows don't fit Card's API, same deviation
              noted on that block). */}
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                background: uiTokens.surfaceCard2,
                border: `1px solid ${uiTokens.borderSubtle}`,
              }}>
              {postseasonGames?.map((g, i) => {
                const resultColor =
                  g.result === 'W'
                    ? uiAccent
                    : g.result === 'L'
                      ? uiTokens.statusInjured
                      : uiTokens.textMuted;
                const score =
                  g.teamScore !== null && g.oppScore !== null ? `${g.teamScore}-${g.oppScore}` : '';
                return (
                  <div
                    key={`${g.gameType}-${g.week}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    style={{ borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}` }}>
                    <div className="min-w-0">
                      <div
                        className="text-[9px] font-bold tracking-[0.06em]"
                        style={{ color: uiAccent }}>
                        {postseasonRoundLabel(g.gameType).toUpperCase()}
                      </div>
                      <div
                        className="mt-0.5 truncate text-xs font-extrabold"
                        style={{ color: uiTokens.textPrimary }}>
                        {g.isHome ? 'vs' : '@'} {g.opponent?.abbrev ?? '—'}
                      </div>
                    </div>
                    <div
                      className="shrink-0 text-right text-[11px] font-bold"
                      style={{ color: resultColor }}>
                      {g.result ?? ''} {score}
                    </div>
                  </div>
                );
              })}
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
    </TeamPageShell>
  );
}
