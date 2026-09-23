// The fetch-and-guard step of the ingest's Layer-1 raw loop, pulled out of
// scripts/ingest-nflverse.mts so the wiring itself is testable: fetch every file in a
// (table, season) group, check the union of their headers against the source contract,
// and turn a missing asset into a skip or a failure. The caller transforms and writes
// rows only for an `ok` result, so a shape change writes nothing.

import { parseCsvHeader } from './csv';
import { assertHeader, sourceContract, type SourceId } from './source-contract';
import { classifyMissingAsset } from './source-coverage';

export interface RawGroup<Task extends { url: string }> {
  source: SourceId;
  table: string;
  season: number;
  tasks: Task[];
}

export type RawGroupResult<Task> =
  | { status: 'ok'; fetched: { task: Task; csv: string }[] }
  | { status: 'skip' }
  | { status: 'failure'; message: string };

export async function fetchRawGroup<Task extends { url: string }>(
  group: RawGroup<Task>,
  options: {
    fetchCsv: (url: string) => Promise<string>;
    latestCompletedSeason: number;
    loggedNewColumns?: Set<string>;
  }
): Promise<RawGroupResult<Task>> {
  try {
    const fetched = await Promise.all(
      group.tasks.map(async (task) => ({ task, csv: await options.fetchCsv(task.url) }))
    );
    // Partitioned sources split one contract across several files, so check the union.
    const headerUnion = [...new Set(fetched.flatMap(({ csv }) => parseCsvHeader(csv)))];
    assertHeader(sourceContract(group.source), headerUnion, options.loggedNewColumns);
    return { status: 'ok', fetched };
  } catch (e) {
    const message = (e as Error).message;
    // A missing asset is a skip only outside the source's published range (or for the
    // in-progress season before its first release); inside the range it is a renamed
    // release asset -- an error that names the URL.
    if (/^404\b/.test(message)) {
      if (
        classifyMissingAsset(group.source, group.season, options.latestCompletedSeason) === 'skip'
      ) {
        return { status: 'skip' };
      }
      return { status: 'failure', message: `${group.source}: ${message}` };
    }
    return { status: 'failure', message: `${group.table}: ${message}` };
  }
}
