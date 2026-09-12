// Generic Layer-1 transform for nflverse source tables (DEP-541, full-stat-surface
// design). Unlike the curated transforms in this directory, it keeps EVERY source column
// and never drops a row for a missing crosswalk match — the row lands with a null ESPN
// `player_id`. That is the design's separation rule: a source's data is preserved intact
// and identity is resolved once, in the canonical layer (never name-matched here).
import type { PlayerRawSpec, PlayRawSpec } from './raw-tables.generated';
export type { PlayerRawSpec, PlayRawSpec, RawColumn, RawColumnType } from './raw-tables.generated';

export interface RawSourceRow {
  source_player_id: string;
  player_id: string | null;
  season: number;
  season_type: string;
  week?: number;
  [column: string]: unknown;
}

export interface RawTransformResult {
  rows: RawSourceRow[];
  /** Rows with no usable source id / season / week — dropped, never guessed. */
  skipped: number;
  /** Rows landed with a null `player_id` (no crosswalk match) — visible, not dropped. */
  unresolved: number;
}

/** The crosswalks a player-grain source may resolve through. `espn` needs none. */
export interface RawCrosswalks {
  gsis: ReadonlyMap<string, string>;
  pfr: ReadonlyMap<string, string>;
}

type Scalar = string | number | boolean | null;

// '' -> null (nflverse's empty-cell convention); numbers coerce, a malformed cell degrades
// to null rather than throwing; booleans accept nflverse's TRUE/FALSE (and 1/0). Lists were
// classified as text, so they are preserved verbatim here and parsed during consolidation.
function coerce(value: string | undefined, type: 'text' | 'numeric' | 'boolean'): Scalar {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') return null;
  if (type === 'text') return trimmed;
  if (type === 'numeric') {
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const lowered = trimmed.toLowerCase();
  if (lowered === 'true' || lowered === 't' || lowered === '1') return true;
  if (lowered === 'false' || lowered === 'f' || lowered === '0') return false;
  return null;
}

function resolvePlayerId(
  spec: PlayerRawSpec,
  rawId: string | undefined,
  crosswalks: RawCrosswalks
): { sourcePlayerId: string | null; playerId: string | null } {
  const sourcePlayerId = rawId?.trim() ?? '';
  if (!sourcePlayerId) return { sourcePlayerId: null, playerId: null };
  if (spec.idKind === 'espn') return { sourcePlayerId, playerId: sourcePlayerId };
  return { sourcePlayerId, playerId: crosswalks[spec.idKind].get(sourcePlayerId) ?? null };
}

/**
 * Player-grain (season/week) source rows. `partition` is the caller's value for a source
 * whose file is split into families (e.g. pfr_advstats pass/def/rush/rec) and whose spec
 * declares a `partition` column.
 */
export function toPlayerRawRows(
  spec: PlayerRawSpec,
  csvRows: Record<string, string>[],
  crosswalks: RawCrosswalks,
  partition?: string
): RawTransformResult {
  const rows: RawSourceRow[] = [];
  let skipped = 0;
  let unresolved = 0;

  for (const row of csvRows) {
    const { sourcePlayerId, playerId } = resolvePlayerId(spec, row[spec.idColumn], crosswalks);
    const seasonRaw = row.season?.trim();
    const season = Number(seasonRaw);
    if (!sourcePlayerId || !seasonRaw || !Number.isInteger(season) || season < 1) {
      skipped++;
      continue;
    }
    if (!playerId) unresolved++;

    const out: RawSourceRow = {
      source_player_id: sourcePlayerId,
      player_id: playerId,
      season,
      season_type: row.season_type?.trim() || 'REG',
    };
    if (spec.grain === 'week') {
      const weekRaw = row[spec.weekColumn ?? 'week']?.trim();
      const week = Number(weekRaw);
      if (!weekRaw || !Number.isInteger(week)) {
        skipped++;
        continue;
      }
      out.week = week;
    }
    if (spec.partition) {
      if (!partition) throw new Error(`${spec.table}: missing partition value`);
      out[spec.partition] = partition;
    }
    for (const column of spec.columns) out[column.name] = coerce(row[column.name], column.type);
    rows.push(out);
  }

  return { rows, skipped, unresolved };
}

/** Play-grain source rows (FTN charting), keyed on the spec's `keyColumns`. */
export function toPlayRawRows(
  spec: PlayRawSpec,
  csvRows: Record<string, string>[]
): { rows: Record<string, Scalar>[]; skipped: number } {
  const rows: Record<string, Scalar>[] = [];
  let skipped = 0;
  for (const row of csvRows) {
    const key = spec.keyColumns.map((column) => row[column]?.trim());
    if (key.some((value) => !value)) {
      skipped++;
      continue;
    }
    const out: Record<string, Scalar> = {};
    for (const column of spec.columns) out[column.name] = coerce(row[column.name], column.type);
    rows.push(out);
  }
  return { rows, skipped };
}

/** The conflict target for a player source table's idempotent upsert. */
export function playerRawConflictTarget(spec: PlayerRawSpec): string {
  const parts = ['source_player_id', 'season', 'season_type'];
  if (spec.grain === 'week') parts.push('week');
  if (spec.partition) parts.push(spec.partition);
  return parts.join(',');
}

/** The conflict target for a play source table's idempotent upsert. */
export function playRawConflictTarget(spec: PlayRawSpec): string {
  return spec.keyColumns.join(',');
}
