// Aggregates nflverse participation rows (`pbp_participation_<season>.csv`, FTN-era
// 2023+ — docs/superpowers/specs/2026-07-07-phase-e-real-formations-design.md) into
// each team's top-3 most-used (qbAlignment, personnelCode) combos with a usage share.
// FormationAccumulator carries the fold's running state so the ingest script can feed
// it one streamed row at a time (the participation file is ~50MB — never materialize
// the whole row set in memory); tallyFormations is the same fold over an in-memory
// array, for tests and any other small-input caller.

import { parsePersonnel, personnelCode } from './personnel';

export interface ParticipationRow {
  nflverse_game_id: string;
  possession_team: string;
  offense_formation: string;
  offense_personnel: string;
}

export interface FormationTally {
  team_id: string;
  season: number;
  rank: number;
  alignment: string;
  personnel: string;
  pct: number;
}

// A team/season is "no data" (never built from a sparse sample) when charted games
// cover fewer than half its actual games that season — coverage is thin off-season and
// mid-week during an in-progress week. `gamesPlayedByTeam` is the team's real game
// count for the season (from the already-ingested `games`/`schedules` tables); a team
// missing from that map has an unknown total, so it's included rather than guessed out.
const MIN_COVERAGE = 0.5;

export class FormationAccumulator {
  private gamesByTeam = new Map<string, Set<string>>();
  private countsByTeam = new Map<string, Map<string, number>>(); // key = `${alignment}|${personnelCode}`
  private totalByTeam = new Map<string, number>();
  skipped = 0;

  constructor(private resolveCode: (code: string) => string | null) {}

  addRow(row: ParticipationRow): void {
    const teamId = this.resolveCode(row.possession_team?.trim() ?? '');
    if (!teamId) {
      this.skipped++;
      return;
    }
    if (!this.gamesByTeam.has(teamId)) this.gamesByTeam.set(teamId, new Set());
    this.gamesByTeam.get(teamId)!.add(row.nflverse_game_id);

    const alignment = row.offense_formation?.trim();
    if (!alignment) {
      this.skipped++; // blank alignment: kneel-downs / no-charting, excluded
      return;
    }

    const counts = parsePersonnel(row.offense_personnel);
    if (!counts || counts.rb + counts.te + counts.wr !== 5) {
      this.skipped++; // malformed or non-offensive-personnel row (e.g. a mislabeled ST snap)
      return;
    }

    const key = `${alignment}|${personnelCode(counts)}`;
    const teamCounts = this.countsByTeam.get(teamId) ?? new Map<string, number>();
    teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
    this.countsByTeam.set(teamId, teamCounts);
    this.totalByTeam.set(teamId, (this.totalByTeam.get(teamId) ?? 0) + 1);
  }

  finish(
    season: number,
    gamesPlayedByTeam: Map<string, number>
  ): { tallies: FormationTally[]; skippedTeams: string[] } {
    const tallies: FormationTally[] = [];
    const skippedTeams: string[] = [];

    for (const [teamId, teamCounts] of this.countsByTeam) {
      const totalGames = gamesPlayedByTeam.get(teamId);
      const gamesWithData = this.gamesByTeam.get(teamId)?.size ?? 0;
      if (totalGames && gamesWithData / totalGames < MIN_COVERAGE) {
        skippedTeams.push(teamId);
        continue;
      }

      const total = this.totalByTeam.get(teamId) ?? 0;
      const top3 = [...teamCounts.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      );
      top3.slice(0, 3).forEach(([key, count], i) => {
        const [alignment, personnel] = key.split('|');
        tallies.push({
          team_id: teamId,
          season,
          rank: i + 1,
          alignment,
          personnel,
          pct: Math.round((count / total) * 100),
        });
      });
    }

    return { tallies, skippedTeams };
  }
}

export function tallyFormations(
  rows: ParticipationRow[],
  season: number,
  resolveCode: (code: string) => string | null,
  gamesPlayedByTeam: Map<string, number>
): { tallies: FormationTally[]; skippedTeams: string[]; skipped: number } {
  const acc = new FormationAccumulator(resolveCode);
  for (const row of rows) acc.addRow(row);
  const { tallies, skippedTeams } = acc.finish(season, gamesPlayedByTeam);
  return { tallies, skippedTeams, skipped: acc.skipped };
}
