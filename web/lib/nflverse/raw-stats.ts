// Generic Layer-1 transform for nflverse source tables (DEP-541, full-stat-surface
// design). Unlike the curated transforms in this directory, it keeps EVERY source column
// and never drops a row for a missing crosswalk match — the row lands with a null ESPN
// `player_id`. That is the design's separation rule: a source's data is preserved intact
// and identity is resolved once, in the canonical layer (never name-matched here).
import type { RawTableSpec } from './raw-tables.generated';
export type { RawTableSpec } from './raw-tables.generated';

export interface RawSourceRow {
  source_player_id: string;
  player_id: string | null;
  season: number;
  season_type: string;
  week?: number;
  // Every remaining source column, typed by the generated spec.
  [column: string]: unknown;
}

export interface RawTransformResult {
  rows: RawSourceRow[];
  /** Rows with no usable source id / season / week — dropped, never guessed. */
  skipped: number;
  /** Rows landed with a null `player_id` (no crosswalk match) — visible, not dropped. */
  unresolved: number;
}

// '' -> null (nflverse's empty-cell convention); numeric cells coerce, a malformed one
// degrades to null rather than throwing. Lists were classified as text by the generator,
// so they are preserved verbatim here and parsed during consolidation.
function coerce(value: string | undefined, type: 'text' | 'numeric'): string | number | null {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') return null;
  if (type === 'text') return trimmed;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function toRawSourceRows(
  spec: RawTableSpec,
  csvRows: Record<string, string>[],
  crosswalk: ReadonlyMap<string, string>
): RawTransformResult {
  const rows: RawSourceRow[] = [];
  let skipped = 0;
  let unresolved = 0;

  for (const row of csvRows) {
    const sourcePlayerId = row.player_id?.trim();
    const seasonRaw = row.season?.trim();
    const season = Number(seasonRaw);
    if (!sourcePlayerId || !seasonRaw || !Number.isInteger(season) || season < 1) {
      skipped++;
      continue;
    }

    const playerId = crosswalk.get(sourcePlayerId) ?? null;
    if (!playerId) unresolved++;

    const out: RawSourceRow = {
      source_player_id: sourcePlayerId,
      player_id: playerId,
      season,
      season_type: row.season_type?.trim() || 'REG',
    };
    if (spec.grain === 'week') {
      const weekRaw = row.week?.trim();
      const week = Number(weekRaw);
      if (!weekRaw || !Number.isInteger(week)) {
        skipped++;
        continue;
      }
      out.week = week;
    }
    for (const column of spec.columns) out[column.name] = coerce(row[column.name], column.type);
    rows.push(out);
  }

  return { rows, skipped, unresolved };
}

/** The conflict target for a source table's idempotent upsert. */
export function rawConflictTarget(spec: RawTableSpec): string {
  return spec.grain === 'week'
    ? 'source_player_id,season,season_type,week'
    : 'source_player_id,season,season_type';
}
