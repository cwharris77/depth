// Chunk sizing for the nflverse ingest's upserts (DEP-557 follow-up). A PostgREST upsert's
// cost scales with rows x columns, so the widest sources (`nflverse_player_week`,
// ~150 columns) must use far fewer rows per statement than the narrow curated tables.
// Bounding cells per statement keeps each write under Postgres's statement_timeout and
// spreads the write stream, so a full backfill can't saturate the instance's disk I/O.
//
// Pure, so the rule is testable without the ingest script (which runs `main()` on import).

/** Hard ceiling on rows per upsert statement. */
export const MAX_UPSERT_CHUNK = 1000;
/** Target cells (rows x columns) per upsert statement. */
export const UPSERT_CELL_BUDGET = 30_000;

/** Cell count of a row; 1 for a non-object so a malformed row can't yield a zero chunk. */
export function rowCellCount(row: unknown): number {
  return typeof row === 'object' && row !== null ? Object.keys(row).length : 1;
}

/** Width-aware chunk size: min(MAX_UPSERT_CHUNK rows, ~UPSERT_CELL_BUDGET cells), floor 1. */
export function upsertChunkSize(row: unknown): number {
  return Math.max(
    1,
    Math.min(MAX_UPSERT_CHUNK, Math.floor(UPSERT_CELL_BUDGET / rowCellCount(row)))
  );
}
