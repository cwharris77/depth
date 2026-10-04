// Pre-publish guard: compare a rebuilt season against the checkpoint it replaces and refuse
// to publish a build that lost data. A source that silently drops rows or a column reads as
// a plausible build, so the comparison is the only thing standing between a bad upstream
// file and every client. Pure: the caller loads the previous checkpoint and decides what to
// do with the violations.

import type { PlayerSeasonRow, StatLine } from './player-seasons';

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

  const violations: ShrinkViolation[] = [];
  const maxRowDrop = inProgress ? 0 : SHRINK_THRESHOLDS.playerRows;
  const maxFieldDrop = inProgress ? 0 : SHRINK_THRESHOLDS.fieldNonNull;
  const limit = (fraction: number) => (inProgress ? 'any drop' : `${fraction * 100}% drop`);

  if (previous.length - next.length > previous.length * maxRowDrop) {
    violations.push({
      season,
      subject: 'player_rows',
      before: previous.length,
      after: next.length,
      message: `${season}: player rows ${previous.length} -> ${next.length} exceeds the ${limit(maxRowDrop)} limit`,
    });
  }

  const nextCounts = fieldCounts(next);
  for (const [field, before] of [...fieldCounts(previous)].sort(([a], [b]) => a.localeCompare(b))) {
    const after = nextCounts.get(field) ?? 0;
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
