// Derives team-level offensive-line metrics from nflverse play-by-play
// (`play_by_play_<season>.csv`). Pure: no fetch, no DB. This is Part 2 of the
// full-stat-surface design — offensive-line play has no free per-player source
// (PFR is CAPTCHA-gated, ESPN block win rates are proprietary, PFF/SIS/FTN-Data are
// paid), so we derive the *unit's* metrics rather than grading individual linemen.
// The results land in team_line_stats, the canonical team layer the app already reads.
//
// Run metrics (Football Outsiders' published definitions — the escalation boundary in
// the ticket allows the published set, so no divergence to confirm):
//   - Adjusted Line Yards (ALY): each carry's yards are weighted by distance past the
//     line — losses count 120% (a 3-yard loss is -3.6), 0-4 yards count 100%, 5-10
//     yards count 50%, and 11+ yards count 0% (the back is past the line, so the line
//     gets no credit). ALY is the weighted total over carries.
//   - Stuffed Rate: carries that gain 0 or fewer yards, over carries.
//   - Power Success: carries on 3rd/4th down with <= 2 yards to go that convert a first
//     down or score, over those short-yardage carries.
//   - 2nd-level / open-field yards: carries gaining 5-10 / 11+ yards, reported as the
//     FO totals and per carry (the app ranks volume-neutral rates).
// Pass protection (pressure is FTN-charted, surfaced on pbp — source attribution is
// required wherever these show):
//   - sack rate, pressure rate allowed (`was_pressure`), average time to throw, and
//     average pass rushers faced.
//
// Sparse coverage never becomes a partial metric: a team below the games-with-data
// coverage bar is dropped entirely (no row), the same gate the formations fold uses
// (participation.ts). Within a kept row, a family with no sample (no short-yardage
// carries, no charted pressure) yields nil, never a zero dressed up as a real rate.

import { resolveTeamCode } from './team-codes';

// A team/season is "no data" (never built from a sparse sample) when its charted games
// cover fewer than half its actual games that season — the same bar as the formations
// fold. `gamesPlayedByTeam` is the team's real game count for the season (from the
// already-ingested `games`/`schedules` tables); a team missing from that map has an
// unknown total, so it's included rather than guessed out.
const MIN_COVERAGE = 0.5;

// Football Outsiders' Adjusted Line Yards distance weights.
const LOSS_WEIGHT = 1.2;
const SHORT_YARD_MAX = 4;
const SECOND_LEVEL_MIN = 5;
const SECOND_LEVEL_MAX = 10;
const OPEN_FIELD_MIN = 11;

// The pbp columns the derivation reads. Kept here so the source contract
// (source-contract.ts) and the parser stay in lockstep: a renamed column is caught at
// the header check rather than silently landing nil.
export const PBP_REQUIRED_COLUMNS = [
  'game_id',
  'posteam',
  'rush_attempt',
  'qb_dropback',
  'sack',
  'yards_gained',
  'down',
  'ydstogo',
  'first_down',
  'touchdown',
  'qb_kneel',
  'qb_spike',
] as const;

// FTN-charted pass-pro columns, present only from the charted era. Optional in the
// contract (their absence degrades the pressure columns to nil, never to zero).
export const PBP_CHARTED_COLUMNS = [
  'was_pressure',
  'time_to_throw',
  'number_of_pass_rushers',
] as const;

// One play-by-play row, already coerced from its CSV strings. A rush carries the
// down/distance needed for power success; a dropback carries the charted pass-pro fields.
export interface PlayByPlayRow {
  game_id: string;
  posteam: string;
  rush_attempt: boolean;
  qb_dropback: boolean;
  sack: boolean;
  yards_gained: number | null;
  down: number | null;
  ydstogo: number | null;
  first_down: boolean;
  touchdown: boolean;
  // null when the play is outside the charted era (or the charting is absent).
  was_pressure: boolean | null;
  time_to_throw: number | null;
  number_of_pass_rushers: number | null;
  qb_kneel: boolean;
  qb_spike: boolean;
}

export interface TeamLineStatsInsert {
  team_id: string;
  season: number;
  updated_at?: string;
  rushes: number;
  /** FO weighted total (losses 120%, 0-4 100%, 5-10 50%, 11+ 0%). */
  line_yards: number;
  adjusted_line_yards: number | null;
  stuffed_rate: number | null;
  power_success_rate: number | null;
  second_level_yards: number;
  second_level_yards_per_rush: number | null;
  open_field_yards: number;
  open_field_yards_per_rush: number | null;
  dropbacks: number;
  sacks_allowed: number;
  sack_rate: number | null;
  pressures_allowed: number | null;
  pressure_rate: number | null;
  avg_time_to_throw: number | null;
  avg_pass_rushers: number | null;
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// pbp booleans arrive as `1`/`0` (sometimes `true`/`false`); '' is "not charted".
function toBool(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

function toNullableBool(value: string | undefined): boolean | null {
  if (value === undefined || value.trim() === '') return null;
  return value.trim() === '1' || value.trim().toLowerCase() === 'true';
}

/** Coerces one streamed pbp CSV record into the typed row the accumulator folds. */
export function parsePlayByPlayRow(record: Record<string, string>): PlayByPlayRow {
  return {
    game_id: record.game_id ?? '',
    posteam: record.posteam ?? '',
    rush_attempt: toBool(record.rush_attempt),
    qb_dropback: toBool(record.qb_dropback),
    sack: toBool(record.sack),
    yards_gained: toNullableNumber(record.yards_gained),
    down: toNullableNumber(record.down),
    ydstogo: toNullableNumber(record.ydstogo),
    first_down: toBool(record.first_down),
    touchdown: toBool(record.touchdown),
    was_pressure: toNullableBool(record.was_pressure),
    time_to_throw: toNullableNumber(record.time_to_throw),
    number_of_pass_rushers: toNullableNumber(record.number_of_pass_rushers),
    qb_kneel: toBool(record.qb_kneel),
    qb_spike: toBool(record.qb_spike),
  };
}

/** FO line-yards value for a single carry. Exported for the hand-computed tests. */
export function lineYardsFor(gain: number): number {
  if (gain < 0) return gain * LOSS_WEIGHT;
  if (gain <= SHORT_YARD_MAX) return gain;
  if (gain <= SECOND_LEVEL_MAX) return gain * 0.5;
  return 0;
}

function secondLevelYardsFor(gain: number): number {
  return gain >= SECOND_LEVEL_MIN && gain <= SECOND_LEVEL_MAX ? gain : 0;
}

function openFieldYardsFor(gain: number): number {
  return gain >= OPEN_FIELD_MIN ? gain : 0;
}

interface TeamAccumulator {
  games: Set<string>;
  rushes: number;
  lineYards: number;
  stuffed: number;
  secondLevelYards: number;
  openFieldYards: number;
  powerAttempts: number;
  powerSuccesses: number;
  dropbacks: number;
  sacks: number;
  chartedDropbacks: number;
  pressures: number;
  timeToThrowSum: number;
  timeToThrowCount: number;
  passRushersSum: number;
  passRushersCount: number;
}

function emptyAccumulator(): TeamAccumulator {
  return {
    games: new Set(),
    rushes: 0,
    lineYards: 0,
    stuffed: 0,
    secondLevelYards: 0,
    openFieldYards: 0,
    powerAttempts: 0,
    powerSuccesses: 0,
    dropbacks: 0,
    sacks: 0,
    chartedDropbacks: 0,
    pressures: 0,
    timeToThrowSum: 0,
    timeToThrowCount: 0,
    passRushersSum: 0,
    passRushersCount: 0,
  };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

// Streams pbp rows (the season file is tens of MB — never materialize the whole row
// set) into per-team lines, then emits one row per team that clears the coverage bar.
export class LineMetricsAccumulator {
  private byTeam = new Map<string, TeamAccumulator>();
  skipped = 0;

  constructor(private resolveCode: (code: string) => string | null = resolveTeamCode) {}

  addRow(record: Record<string, string>): void {
    this.addPlay(parsePlayByPlayRow(record));
  }

  addPlay(row: PlayByPlayRow): void {
    const code = row.posteam.trim();
    const teamId = code ? this.resolveCode(code) : null;
    if (!teamId) {
      this.skipped++;
      return;
    }
    // Kneel-downs and spikes are not line play: exclude them before they can count as
    // carries, charted plays, or coverage.
    if (row.qb_kneel || row.qb_spike) {
      this.skipped++;
      return;
    }

    const acc = this.byTeam.get(teamId) ?? emptyAccumulator();
    this.byTeam.set(teamId, acc);

    if (row.rush_attempt) {
      if (row.yards_gained === null) {
        this.skipped++; // a carry with no yardage can't be weighted — refuse it
        return;
      }
      const gain = row.yards_gained;
      acc.games.add(row.game_id);
      acc.rushes += 1;
      acc.lineYards += lineYardsFor(gain);
      if (gain <= 0) acc.stuffed += 1;
      acc.secondLevelYards += secondLevelYardsFor(gain);
      acc.openFieldYards += openFieldYardsFor(gain);
      if ((row.down === 3 || row.down === 4) && row.ydstogo !== null && row.ydstogo <= 2) {
        acc.powerAttempts += 1;
        if (row.first_down || row.touchdown) acc.powerSuccesses += 1;
      }
      return;
    }

    if (row.qb_dropback) {
      acc.games.add(row.game_id);
      acc.dropbacks += 1;
      if (row.sack) acc.sacks += 1;
      if (row.was_pressure !== null) {
        acc.chartedDropbacks += 1;
        if (row.was_pressure) acc.pressures += 1;
      }
      if (row.time_to_throw !== null) {
        acc.timeToThrowSum += row.time_to_throw;
        acc.timeToThrowCount += 1;
      }
      if (row.number_of_pass_rushers !== null) {
        acc.passRushersSum += row.number_of_pass_rushers;
        acc.passRushersCount += 1;
      }
      return;
    }

    // Neither a rush nor a dropback (kick, penalty, no-play, ...): not line data.
    this.skipped++;
  }

  finish(
    season: number,
    gamesPlayedByTeam: Map<string, number>,
    options: { updatedAt?: string } = {}
  ): { rows: TeamLineStatsInsert[]; skippedTeams: string[] } {
    const rows: TeamLineStatsInsert[] = [];
    const skippedTeams: string[] = [];

    for (const [teamId, acc] of this.byTeam) {
      // No valid play ever landed (every row was excluded/skipped): no data, no row —
      // never an all-null metric line dressed up as a season.
      if (acc.games.size === 0) {
        skippedTeams.push(teamId);
        continue;
      }
      const totalGames = gamesPlayedByTeam.get(teamId);
      if (totalGames && acc.games.size / totalGames < MIN_COVERAGE) {
        skippedTeams.push(teamId);
        continue;
      }

      rows.push({
        team_id: teamId,
        season,
        ...(options.updatedAt ? { updated_at: options.updatedAt } : {}),
        rushes: acc.rushes,
        line_yards: acc.lineYards,
        adjusted_line_yards: ratio(acc.lineYards, acc.rushes),
        stuffed_rate: ratio(acc.stuffed, acc.rushes),
        power_success_rate: ratio(acc.powerSuccesses, acc.powerAttempts),
        second_level_yards: acc.secondLevelYards,
        second_level_yards_per_rush: ratio(acc.secondLevelYards, acc.rushes),
        open_field_yards: acc.openFieldYards,
        open_field_yards_per_rush: ratio(acc.openFieldYards, acc.rushes),
        dropbacks: acc.dropbacks,
        sacks_allowed: acc.sacks,
        sack_rate: ratio(acc.sacks, acc.dropbacks),
        pressures_allowed: acc.chartedDropbacks > 0 ? acc.pressures : null,
        pressure_rate: ratio(acc.pressures, acc.chartedDropbacks),
        avg_time_to_throw: ratio(acc.timeToThrowSum, acc.timeToThrowCount),
        avg_pass_rushers: ratio(acc.passRushersSum, acc.passRushersCount),
      });
    }

    return { rows, skippedTeams };
  }
}

// In-memory convenience for tests and small callers; the ingest streams through
// LineMetricsAccumulator directly.
export function toTeamLineStatsRows(
  rows: Record<string, string>[],
  season: number,
  resolveCode: (code: string) => string | null,
  gamesPlayedByTeam: Map<string, number>
): { rows: TeamLineStatsInsert[]; skippedTeams: string[]; skipped: number } {
  const acc = new LineMetricsAccumulator(resolveCode);
  for (const row of rows) acc.addRow(row);
  const { rows: out, skippedTeams } = acc.finish(season, gamesPlayedByTeam);
  return { rows: out, skippedTeams, skipped: acc.skipped };
}
