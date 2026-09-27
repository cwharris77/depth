// Mirrors `participation.ts`'s FormationAccumulator for the defensive side: aggregates
// nflverse participation rows into every defensive front ({DL}-{LB}-{DB} shorthand) a
// team ran that season, with a usage share (no top-N cap). See
// defense-personnel.ts for the parsing/labeling rules.
//
// Key difference from the offense accumulator: `possession_team` names the team WITH
// the ball, i.e. the OPPOSING defense's data lives in this row. The defending team isn't
// a column in the CSV — it's derived from `nflverse_game_id`, whose nflverse convention
// is `${season}_${week}_${away}_${home}` (verified against the real 2024 file,
// 2026-08-03: e.g. "2024_01_TEN_CHI" on a TEN-possession row = TEN away, CHI home, so
// CHI's defense was on the field).

import {
  defenseAlignmentLabel,
  defensePersonnelCode,
  parseDefensePersonnel,
} from './defense-personnel';
import type { Drop } from '../utils/ingest/drops';
import type { FormationFoldResult, ParticipationRow } from './participation';

// Same conservation contract as FormationAccumulator (participation.ts): rows seen =
// rows consumed + rows dropped, with `below_coverage` for rows counted into a team the
// coverage gate rejects.
export type DefenseFormationDropReason =
  | 'underivable_defense_team'
  | 'unknown_team'
  | 'blank_formation'
  | 'invalid_personnel'
  | 'below_coverage';

export interface DefenseFormationTally {
  team_id: string;
  season: number;
  rank: number;
  alignment: string;
  personnel: string;
  pct: number;
}

const MIN_COVERAGE = 0.5;

// Pulls the two team codes out of `nflverse_game_id` and returns whichever isn't
// `possessionTeam` (raw, unresolved codes — same vocabulary participation.csv uses for
// both). Null if the id doesn't match the expected shape or `possessionTeam` isn't one
// of the two codes found (malformed row — never guessed).
export function deriveDefenseTeamCode(gameId: string, possessionTeam: string): string | null {
  const parts = gameId?.trim().split('_') ?? [];
  if (parts.length < 4) return null;
  const away = parts[parts.length - 2];
  const home = parts[parts.length - 1];
  if (possessionTeam === away) return home;
  if (possessionTeam === home) return away;
  return null;
}

export class DefenseFormationAccumulator {
  private gamesByTeam = new Map<string, Set<string>>();
  private countsByTeam = new Map<string, Map<string, number>>(); // key = "dl-lb-db"
  private totalByTeam = new Map<string, number>();
  private consumedKeysByTeam = new Map<string, string[]>();
  private dropped: Drop<DefenseFormationDropReason>[] = [];
  rowsSeen = 0;

  constructor(private resolveCode: (code: string) => string | null) {}

  addRow(row: ParticipationRow): void {
    const rowKey = `${row.nflverse_game_id}#${this.rowsSeen++}`;
    const defenseCodeRaw = deriveDefenseTeamCode(
      row.nflverse_game_id,
      row.possession_team?.trim() ?? ''
    );
    if (!defenseCodeRaw) {
      this.dropped.push({
        reason: 'underivable_defense_team',
        key: rowKey,
        value: row.possession_team?.trim() ?? '',
      });
      return;
    }
    const teamId = this.resolveCode(defenseCodeRaw);
    if (!teamId) {
      this.dropped.push({ reason: 'unknown_team', key: rowKey, value: defenseCodeRaw });
      return;
    }
    if (!this.gamesByTeam.has(teamId)) this.gamesByTeam.set(teamId, new Set());
    this.gamesByTeam.get(teamId)!.add(row.nflverse_game_id);

    // Same play-validity gate as the offense accumulator: a blank offense_formation
    // means a kneel-down / non-charted play, and defense_personnel is noisy on those
    // rows too (see defense-personnel.ts's header comment).
    if (!row.offense_formation?.trim()) {
      this.dropped.push({ reason: 'blank_formation', key: rowKey });
      return;
    }

    const counts = parseDefensePersonnel(row.defense_personnel ?? '');
    if (!counts || counts.dl + counts.lb + counts.db !== 11) {
      // Malformed, or noise leaked through despite the gate above.
      this.dropped.push({
        reason: 'invalid_personnel',
        key: rowKey,
        value: row.defense_personnel ?? '',
      });
      return;
    }

    const key = defensePersonnelCode(counts);
    const teamCounts = this.countsByTeam.get(teamId) ?? new Map<string, number>();
    teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
    this.countsByTeam.set(teamId, teamCounts);
    this.totalByTeam.set(teamId, (this.totalByTeam.get(teamId) ?? 0) + 1);
    const consumedKeys = this.consumedKeysByTeam.get(teamId) ?? [];
    consumedKeys.push(rowKey);
    this.consumedKeysByTeam.set(teamId, consumedKeys);
  }

  finish(
    season: number,
    gamesPlayedByTeam: Map<string, number>
  ): FormationFoldResult<DefenseFormationTally, DefenseFormationDropReason> {
    const tallies: DefenseFormationTally[] = [];
    const skippedTeams: string[] = [];
    const dropped = [...this.dropped];
    let consumed = 0;

    for (const [teamId, teamCounts] of this.countsByTeam) {
      const totalGames = gamesPlayedByTeam.get(teamId);
      const gamesWithData = this.gamesByTeam.get(teamId)?.size ?? 0;
      const consumedKeys = this.consumedKeysByTeam.get(teamId) ?? [];
      if (totalGames && gamesWithData / totalGames < MIN_COVERAGE) {
        skippedTeams.push(teamId);
        for (const key of consumedKeys)
          dropped.push({ reason: 'below_coverage', key, value: teamId });
        continue;
      }
      consumed += consumedKeys.length;

      const total = this.totalByTeam.get(teamId) ?? 0;
      const ranked = [...teamCounts.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      );
      ranked.forEach(([key, count], i) => {
        const db = Number(key.split('-')[2]);
        tallies.push({
          team_id: teamId,
          season,
          rank: i + 1,
          alignment: defenseAlignmentLabel(db),
          personnel: key,
          pct: Math.round((count / total) * 100),
        });
      });
    }

    return { tallies, skippedTeams, consumed, dropped };
  }
}

export function tallyDefenseFormations(
  rows: ParticipationRow[],
  season: number,
  resolveCode: (code: string) => string | null,
  gamesPlayedByTeam: Map<string, number>
): FormationFoldResult<DefenseFormationTally, DefenseFormationDropReason> {
  const acc = new DefenseFormationAccumulator(resolveCode);
  for (const row of rows) acc.addRow(row);
  return acc.finish(season, gamesPlayedByTeam);
}
