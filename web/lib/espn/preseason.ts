// Turns ESPN's league-wide preseason scoreboard (site API `scoreboard?seasontype=1`) into
// `games` + `schedules` upsert rows tagged `game_type = 'PRE'` (DEP-204). Pure: no fetch,
// no DB -- scripts/ingest-espn.mts fetches one scoreboard per preseason calendar week and
// hands the responses here.
//
// Why ESPN writes into nflverse's `games` table: nflverse's games.csv carries no preseason
// rows at all (REG/WC/DIV/CON/SB only, 1999-present), so preseason is a surface only ESPN
// has. The two sources never collide -- ids here are `${season}_PRE_${espnEventId}`, a
// shape nflverse's `${season}_${week}_${away}_${home}` can't produce, and nflverse's
// upsert never deletes rows it didn't write.
//
// Backwards compatibility (web/CLAUDE.md invariant 11, ios-release-compatibility.md): `PRE` is
// a new `game_type` value with no schema change. Every reader filters it out before it
// matters -- iOS ScheduleMapper keeps REG (plus PRE and the postseason allowlist on newer
// builds), the web resolveSchedule keeps REG and resolvePostseason an explicit allowlist,
// records.ts is REG-only, and ingest-nflverse's games-played coverage count excludes PRE.
//
// Week numbering follows the calendar label of the bucket the event came from, never
// ESPN's raw `week.number`: bucket 1 is "Hall of Fame Weekend" (week 0) and "Preseason
// Week N" is week N. An event whose kickoff falls outside its bucket's calendar window is
// skipped, not guessed: ESPN's pre-2009 preseason buckets don't line up with their own
// calendar (verified 2026-09-10 -- every 2002 event sits outside its window), which is
// also why PRESEASON_SEASONS_MIN exists.

import type { GameInsert, ScheduleInsert } from '@/lib/nflverse/games';

// First season whose preseason scoreboard buckets agree with ESPN's calendar (verified
// 2009 and 2026 live; 2002 buckets are shifted). Earlier seasons are not fetched at all.
export const PRESEASON_SEASONS_MIN = 2009;

export interface EspnCalendarEntry {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

export interface EspnScoreboardCompetitor {
  homeAway: 'home' | 'away';
  score?: string;
  team: { id: string; abbreviation: string };
}

export interface EspnScoreboardEvent {
  id: string;
  date: string;
  season: { year: number; type: number };
  competitions: {
    neutralSite?: boolean;
    status: { type: { name: string; state: string; completed: boolean } };
    competitors: EspnScoreboardCompetitor[];
  }[];
}

export interface EspnScoreboard {
  leagues?: { calendar?: { value: string; entries?: EspnCalendarEntry[] }[] }[];
  events?: EspnScoreboardEvent[];
}

export interface PreseasonWeek {
  /** The scoreboard `week=` query value for this bucket. */
  value: string;
  /** 0 for the Hall of Fame game, N for "Preseason Week N". */
  week: number;
  startDate: string;
  endDate: string;
}

const PRESEASON_SEASON_TYPE = 1;

/**
 * The preseason weeks in a scoreboard's league calendar (any seasontype=1 scoreboard
 * response carries the whole calendar). An entry whose label isn't recognizable is
 * dropped rather than numbered by position.
 */
export function preseasonWeeks(scoreboard: EspnScoreboard): PreseasonWeek[] {
  const calendar = scoreboard.leagues?.[0]?.calendar ?? [];
  const preseason = calendar.find((c) => String(c.value) === String(PRESEASON_SEASON_TYPE));
  const weeks: PreseasonWeek[] = [];
  for (const entry of preseason?.entries ?? []) {
    const week = /hall of fame/i.test(entry.label)
      ? 0
      : Number(entry.label.match(/^preseason week (\d+)$/i)?.[1] ?? NaN);
    if (!Number.isInteger(week)) continue;
    weeks.push({ value: entry.value, week, startDate: entry.startDate, endDate: entry.endDate });
  }
  return weeks;
}

// nflverse stores gameday/gametime in US Eastern (its games.csv convention); ESPN's event
// date is a UTC instant like `2026-08-14T00:00Z`, which is 8pm ET on Aug 13.
const EASTERN = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function easternDateTime(iso: string): { gameday: string; gametime: string } | null {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  const part = (type: string) => EASTERN.formatToParts(instant).find((p) => p.type === type)?.value;
  return {
    gameday: `${part('year')}-${part('month')}-${part('day')}`,
    gametime: `${part('hour')}:${part('minute')}`,
  };
}

function score(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

/**
 * Game + schedule rows for one season's preseason. `buckets` pairs each calendar week
 * with the scoreboard fetched for it; `resolveTeamId` maps an ESPN team id to our team
 * id (null = unknown team, row skipped). Cancelled games are dropped (they never
 * happened, e.g. all of 2020), unplayed and in-progress games keep null scores
 * (ESPN reports "0" for a game that hasn't finished), and a malformed or out-of-window
 * event is skipped and counted.
 */
export function toPreseasonGameRows(
  season: number,
  buckets: { week: PreseasonWeek; scoreboard: EspnScoreboard }[],
  resolveTeamId: (espnTeamId: string) => string | null
): { games: GameInsert[]; schedules: ScheduleInsert[]; skipped: number; cancelled: number } {
  const gamesById = new Map<string, GameInsert>();
  let skipped = 0;
  let cancelled = 0;

  for (const { week, scoreboard } of buckets) {
    const start = Date.parse(week.startDate);
    const end = Date.parse(week.endDate);
    for (const event of scoreboard.events ?? []) {
      const competition = event.competitions?.[0];
      const status = competition?.status?.type;
      if (status?.name === 'STATUS_CANCELED') {
        cancelled++;
        continue;
      }
      const home = competition?.competitors.find((c) => c.homeAway === 'home');
      const away = competition?.competitors.find((c) => c.homeAway === 'away');
      const homeId = home ? resolveTeamId(home.team.id) : null;
      const awayId = away ? resolveTeamId(away.team.id) : null;
      const kickoff = Date.parse(event.date);
      const eastern = easternDateTime(event.date);
      if (
        event.season?.year !== season ||
        event.season?.type !== PRESEASON_SEASON_TYPE ||
        !status ||
        !homeId ||
        !awayId ||
        !eastern ||
        !(kickoff >= start && kickoff <= end)
      ) {
        skipped++;
        continue;
      }

      gamesById.set(event.id, {
        game_id: `${season}_PRE_${event.id}`,
        season,
        game_type: 'PRE',
        week: week.week,
        gameday: eastern.gameday,
        gametime: eastern.gametime,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: status.completed ? score(home?.score) : null,
        away_score: status.completed ? score(away?.score) : null,
        location: competition.neutralSite ? 'Neutral' : 'Home',
        away_moneyline: null,
        home_moneyline: null,
        spread_line: null,
        away_spread_odds: null,
        home_spread_odds: null,
        total_line: null,
        under_odds: null,
        over_odds: null,
        market_updated_at: null,
      });
    }
  }

  const games = [...gamesById.values()];
  const scheduleKeys = new Set<string>();
  for (const g of games) {
    scheduleKeys.add(g.home_team_id);
    scheduleKeys.add(g.away_team_id);
  }
  const schedules = [...scheduleKeys].map((team_id) => ({ team_id, season }));
  return { games, schedules, skipped, cancelled };
}
