// Pre-publish guard: compare a rebuilt season against the checkpoint it replaces and refuse
// to publish a build that lost data. A source that silently drops rows or a column reads as
// a plausible build, so the comparison is the only thing standing between a bad upstream
// file and every client. Pure: the caller loads the previous checkpoint and decides what to
// do with the violations.

import type { PlayerSeasonRow, StatLine } from './player-seasons';
import type { TeamGameRow } from './team-seasons';

/** Every threshold in one place. Both are fractions of the previous checkpoint's count. */
export const SHRINK_THRESHOLDS = {
  /** A completed season may lose at most this share of its player rows. */
  playerRows: 0.02,
  /** A completed season may lose at most this share of any one field's non-null count. */
  fieldNonNull: 0.1,
} as const;

const SECTIONS = ['box', 'snaps', 'pfr', 'ngs', 'qbr'] as const;

export interface ShrinkViolation {
  season: number;
  /** `player_rows`, or `section.field` for a field's non-null count. */
  subject: string;
  before: number;
  after: number;
  message: string;
}

/** Rows that carry each `section.field`, so a field that vanishes shows up as a count of 0. */
export function fieldCounts(rows: readonly PlayerSeasonRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const section of SECTIONS) {
      const line: StatLine | undefined = row[section];
      if (!line) continue;
      for (const field of Object.keys(line)) {
        const key = `${section}.${field}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

function compareCounts(opts: {
  season: number;
  rowLabel: string;
  previousRows: number;
  nextRows: number;
  previousFields: ReadonlyMap<string, number>;
  nextFields: ReadonlyMap<string, number>;
  inProgress: boolean;
}): ShrinkViolation[] {
  const { season, rowLabel, previousRows, nextRows, previousFields, nextFields, inProgress } = opts;
  const violations: ShrinkViolation[] = [];
  const maxRowDrop = inProgress ? 0 : SHRINK_THRESHOLDS.playerRows;
  const maxFieldDrop = inProgress ? 0 : SHRINK_THRESHOLDS.fieldNonNull;
  const limit = (fraction: number) => (inProgress ? 'any drop' : `${fraction * 100}% drop`);

  if (previousRows - nextRows > previousRows * maxRowDrop) {
    violations.push({
      season,
      subject: rowLabel,
      before: previousRows,
      after: nextRows,
      message: `${season}: ${rowLabel.replace('_', ' ')} ${previousRows} -> ${nextRows} exceeds the ${limit(maxRowDrop)} limit`,
    });
  }

  for (const [field, before] of [...previousFields].sort(([a], [b]) => a.localeCompare(b))) {
    const after = nextFields.get(field) ?? 0;
    if (before - after > before * maxFieldDrop) {
      violations.push({
        season,
        subject: field,
        before,
        after,
        message: `${season}: ${field} non-null ${before} -> ${after} exceeds the ${limit(maxFieldDrop)} limit`,
      });
    }
  }
  return violations;
}

/**
 * Violations for one rebuilt season. A completed season may lose up to the thresholds; an
 * in-progress season is still being filled in, so it may only grow. No previous checkpoint
 * means a first build, which has nothing to shrink from.
 */
export function checkSeasonShrink(opts: {
  season: number;
  previous: readonly PlayerSeasonRow[] | null;
  next: readonly PlayerSeasonRow[];
  inProgress: boolean;
}): ShrinkViolation[] {
  const { season, previous, next, inProgress } = opts;
  if (!previous) return [];
  return compareCounts({
    season,
    rowLabel: 'player_rows',
    previousRows: previous.length,
    nextRows: next.length,
    previousFields: fieldCounts(previous),
    nextFields: fieldCounts(next),
    inProgress,
  });
}

/** Team-games that carry each `offense.field` / `allowed.field`. */
export function teamFieldCounts(rows: readonly TeamGameRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const section of ['offense', 'allowed'] as const) {
      for (const field of Object.keys(row[section] ?? {})) {
        const key = `${section}.${field}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** The same guard over a season's team-games: row count, and each field's non-null count. */
export function checkTeamSeasonShrink(opts: {
  season: number;
  previous: readonly TeamGameRow[] | null;
  next: readonly TeamGameRow[];
  inProgress: boolean;
}): ShrinkViolation[] {
  const { season, previous, next, inProgress } = opts;
  if (!previous) return [];
  return compareCounts({
    season,
    rowLabel: 'team_games',
    previousRows: previous.length,
    nextRows: next.length,
    previousFields: teamFieldCounts(previous),
    nextFields: teamFieldCounts(next),
    inProgress,
  });
}
