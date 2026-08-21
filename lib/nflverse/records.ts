// Turns nflverse game rows into `team_stats` record upserts. Pure: no fetch, no DB,
// same shape as its siblings in this folder (toScheduleAndGameRows, toTeamStatsRows).
//
// This is the DEP-146 re-own: W-L leaves ESPN's standings endpoint for nflverse's
// game-row-level data (Decisions.md 2026-08-14, "one source owner per area" — nflverse
// owns stats/history). The bug that forced it (DEP-200): ESPN's standings endpoint
// aggregates whatever season type is currently live, so through August it reports
// *preseason* games as the season record — observed 2026-08-21, every team carrying a
// preseason W-L weeks before Week 1. A game row carries an explicit `game_type`, so
// REG-only is a filter we apply here rather than a property we have to trust an upstream
// aggregate to have applied for us.
//
// Ownership boundary: this owns every record column of `team_stats` EXCEPT `playoff_seed`,
// which has no nflverse equivalent and stays ESPN-owned. The two ingests share the table
// via column-scoped upserts — each writes only its own columns, so neither clobbers the
// other (scripts/ingest-espn.mts's writeTeamStats is narrowed to the seed alone).

import type { GameInsert } from './games';

// Conference/division for one team — the input the division/conference splits need.
// Sourced from the `teams` table (ESPN-owned identity data), not from nflverse:
// games.csv names the two teams in a game but never their alignment.
export interface TeamAlignment {
  conference: string;
  division: string;
}

// One `team_stats` row's worth of record columns, keyed by (team_id, season) to match the
// table's composite conflict target. snake_case (not the camelCase domain `TeamStats`)
// because this is an upsert payload, exactly like GameInsert/TeamStatsInsert next door.
// No `playoff_seed` (ESPN's) and no `updated_at` (the ingest stamps it, as it does for
// every other write).
export interface TeamRecordInsert {
  team_id: string;
  season: number;
  overall_wins: number;
  overall_losses: number;
  overall_ties: number;
  win_percent: number;
  home_wins: number;
  home_losses: number;
  road_wins: number;
  road_losses: number;
  division_wins: number;
  division_losses: number;
  conference_wins: number;
  conference_losses: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  streak: string;
}

type Outcome = 'W' | 'L' | 'T';

// One team's view of one REG game. A games.csv row is shared by both teams, so each
// qualifying row fans out into two of these (one per perspective) before accumulation.
// An unplayed game carries `outcome: null` — it still establishes that the (team, season)
// exists, but contributes nothing to any total (see toTeamRecords' doc comment).
interface TeamGameView {
  teamId: string;
  season: number;
  opponentId: string;
  isHome: boolean;
  teamScore: number | null;
  oppScore: number | null;
  gameday: string | null;
  week: number | null;
  outcome: Outcome | null;
}

function outcome(teamScore: number, oppScore: number): Outcome {
  if (teamScore > oppScore) return 'W';
  if (teamScore < oppScore) return 'L';
  return 'T';
}

// Most-recent-first run length of identical outcomes, formatted ESPN-style ("W3", "L1")
// so the stored value stays byte-compatible with what the standings ingest wrote before
// the re-own — verified against ESPN's own `streak` displayValue (2025 Patriots "W3",
// Dolphins "L1"). A tie breaks both a win and a loss streak, per NFL convention.
function toStreak(chronological: TeamGameView[]): string {
  const played = chronological.filter((v) => v.outcome !== null);
  if (played.length === 0) return '';
  const latest = played[played.length - 1].outcome;
  let count = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    if (played[i].outcome !== latest) break;
    count++;
  }
  return `${latest}${count}`;
}

// True chronology first (gameday is an ISO `YYYY-MM-DD`, so a string compare is a date
// compare), week as the tiebreak for same-day games. Only `streak` depends on this
// ordering; every other column is a plain sum.
function chronologically(a: TeamGameView, b: TeamGameView): number {
  const dayA = a.gameday ?? '';
  const dayB = b.gameday ?? '';
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  return (a.week ?? 0) - (b.week ?? 0);
}

/**
 * Season records for every team with REG games in `games`, computed REG-only.
 *
 * A game contributes to the totals only once it has been *played* — both scores non-null,
 * the same signal the read layer uses to detect an upcoming game
 * (lib/utils/schedule/schedule.ts). An unplayed game never counts as a loss, but it does
 * still produce the (team, season) row: a scheduled-but-unstarted season is a real 0-0,
 * which is both what ESPN's regular-season standings return before Week 1 and what has to
 * be written to overwrite a stale preseason row left behind by the pre-DEP-146 ingest.
 * A preseason row contributes nothing and creates nothing.
 *
 * `alignments` is only needed for the division/conference splits. A team (or opponent)
 * missing from it still gets a full overall/home/road/points record; only that game's
 * div/conf contribution is skipped — degrade, never guess, never throw (invariant 6).
 */
export function toTeamRecords(
  games: GameInsert[],
  alignments: Map<string, TeamAlignment>
): TeamRecordInsert[] {
  const views: TeamGameView[] = [];

  for (const g of games) {
    if (g.game_type !== 'REG') continue;
    const played = g.home_score !== null && g.away_score !== null;

    const shared = { season: g.season, gameday: g.gameday, week: g.week };
    views.push({
      ...shared,
      teamId: g.home_team_id,
      opponentId: g.away_team_id,
      isHome: true,
      teamScore: g.home_score,
      oppScore: g.away_score,
      outcome: played ? outcome(g.home_score as number, g.away_score as number) : null,
    });
    views.push({
      ...shared,
      teamId: g.away_team_id,
      opponentId: g.home_team_id,
      isHome: false,
      teamScore: g.away_score,
      oppScore: g.home_score,
      outcome: played ? outcome(g.away_score as number, g.home_score as number) : null,
    });
  }

  const byTeamSeason = new Map<string, TeamGameView[]>();
  for (const v of views) {
    const key = `${v.teamId}|${v.season}`;
    const bucket = byTeamSeason.get(key);
    if (bucket) bucket.push(v);
    else byTeamSeason.set(key, [v]);
  }

  const rows: TeamRecordInsert[] = [];
  for (const bucket of byTeamSeason.values()) {
    bucket.sort(chronologically);
    const { teamId, season } = bucket[0];
    const mine = alignments.get(teamId);

    const row: TeamRecordInsert = {
      team_id: teamId,
      season,
      overall_wins: 0,
      overall_losses: 0,
      overall_ties: 0,
      win_percent: 0,
      home_wins: 0,
      home_losses: 0,
      road_wins: 0,
      road_losses: 0,
      division_wins: 0,
      division_losses: 0,
      conference_wins: 0,
      conference_losses: 0,
      points_for: 0,
      points_against: 0,
      point_differential: 0,
      streak: toStreak(bucket),
    };

    for (const v of bucket) {
      if (v.outcome === null) continue; // scheduled, not yet played
      row.points_for += v.teamScore as number;
      row.points_against += v.oppScore as number;

      if (v.outcome === 'W') row.overall_wins++;
      else if (v.outcome === 'L') row.overall_losses++;
      else row.overall_ties++;

      // Splits carry no tie column (ESPN's own home/road/vsdiv/vsconf displayValues are
      // W-L only, and the table matches), so a tie lands in the overall record alone.
      if (v.outcome !== 'T') {
        const won = v.outcome === 'W';
        if (v.isHome) {
          if (won) row.home_wins++;
          else row.home_losses++;
        } else {
          if (won) row.road_wins++;
          else row.road_losses++;
        }

        const theirs = alignments.get(v.opponentId);
        if (mine && theirs && mine.conference === theirs.conference) {
          // A division game is also a conference game — ESPN's aggregate nests them the
          // same way (2025 Patriots: vsconf 9-3 contains vsdiv 5-1), so conference counts
          // the superset rather than conference-excluding-division.
          if (won) row.conference_wins++;
          else row.conference_losses++;
          if (mine.division === theirs.division) {
            if (won) row.division_wins++;
            else row.division_losses++;
          }
        }
      }
    }

    row.point_differential = row.points_for - row.points_against;
    // Standard NFL win percentage, ties counted as half a win — verified against ESPN's
    // own `winpercent` for every 2022 tie team (Colts 4-12-1 -> .2647059, Commanders
    // 8-8-1 -> .5, etc.), so the re-own doesn't shift the league-rank ordering this
    // column feeds (TeamStatsView's rank context).
    const played = row.overall_wins + row.overall_losses + row.overall_ties;
    row.win_percent = played === 0 ? 0 : (row.overall_wins + 0.5 * row.overall_ties) / played;

    rows.push(row);
  }

  // Stable order (team then season) so a rerun writes the same batch — idempotent upserts
  // and deterministic tests, same rationale as toScheduleAndGameRows' schedules sort.
  return rows.sort((a, b) => a.team_id.localeCompare(b.team_id) || a.season - b.season);
}
