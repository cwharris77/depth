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
    throw new Error(`snap counts ${options.season} produced zero summaries`);
  }

  if (options.upsert) {
    await options.upsert(rows.map((row) => ({ ...row, updated_at: options.updatedAt })));
  }

  return { rows, diagnostics, rowsWritten: options.upsert ? rows.length : 0 };
}
