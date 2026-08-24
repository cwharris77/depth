// Orchestrates one nflverse snap-count season across fetch, parse, transform, and an
// optional idempotent writer. The writer is invoked only after a non-empty transform,
// preserving the previous good rows when the source or transform is unusable.
import { parseCsv } from './csv';
import {
  toRecentSnapSummaries,
  type RecentSnapSummaryInsert,
  type SnapCountsDiagnostics,
} from './snap-counts';

export interface SnapSeasonIngestResult {
  rows: RecentSnapSummaryInsert[];
  diagnostics: SnapCountsDiagnostics;
  rowsWritten: number;
}

export interface SnapSeasonsIngestResult {
  rows: RecentSnapSummaryInsert[];
  rowsWritten: number;
  diagnosticsBySeason: Record<number, SnapCountsDiagnostics>;
  failures: { season: number; message: string }[];
}

export class SnapSeasonIngestError extends Error {
  constructor(
    message: string,
    readonly diagnostics: SnapCountsDiagnostics
  ) {
    super(message);
    this.name = 'SnapSeasonIngestError';
  }
}

export async function ingestRecentSnapSeason(options: {
  season: number;
  fetchCsv: () => Promise<string>;
  pfrToEspn: ReadonlyMap<string, string>;
  resolveTeam: (code: string) => string | null;
  updatedAt: string;
  upsert?: (rows: Array<RecentSnapSummaryInsert & { updated_at: string }>) => Promise<void>;
}): Promise<SnapSeasonIngestResult> {
  const csv = await options.fetchCsv();
  const { rows, diagnostics } = toRecentSnapSummaries(
    parseCsv(csv),
    options.pfrToEspn,
    options.resolveTeam
  );
  if (rows.length === 0) {
    throw new SnapSeasonIngestError(
      `snap counts ${options.season} produced zero summaries`,
      diagnostics
    );
  }

  if (options.upsert) {
    try {
      await options.upsert(rows.map((row) => ({ ...row, updated_at: options.updatedAt })));
    } catch (error) {
      throw new SnapSeasonIngestError(
        error instanceof Error ? error.message : String(error),
        diagnostics
      );
    }
  }

  return { rows, diagnostics, rowsWritten: options.upsert ? rows.length : 0 };
}

export async function ingestRecentSnapSeasons(
  seasons: readonly number[],
  ingestSeason: (season: number) => Promise<SnapSeasonIngestResult>
): Promise<SnapSeasonsIngestResult> {
  const result: SnapSeasonsIngestResult = {
    rows: [],
    rowsWritten: 0,
    diagnosticsBySeason: {},
    failures: [],
  };

  for (const season of seasons) {
    try {
      const seasonResult = await ingestSeason(season);
      result.rows.push(...seasonResult.rows);
      result.rowsWritten += seasonResult.rowsWritten;
      result.diagnosticsBySeason[season] = seasonResult.diagnostics;
    } catch (error) {
      if (error instanceof SnapSeasonIngestError) {
        result.diagnosticsBySeason[season] = error.diagnostics;
      }
      result.failures.push({
        season,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
