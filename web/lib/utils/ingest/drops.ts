// A source row an ingest transform read but did not write. Transforms return these instead
// of a bare count so the run record says *why* rows went missing, and so the conservation
// check below can prove no row disappeared without a reason.
export interface Drop<Reason extends string = string> {
  reason: Reason;
  // The source row's identifying key (e.g. a gsis_id, or `row:<index>` when the row has no
  // usable key), so a reported drop can be traced back to its input.
  key: string;
  // The offending source value when the reason is about a value, e.g. an unmapped
  // position code.
  value?: string;
}

// Per-reason counts with sorted keys, for the run record's diagnostics.
export function countByReason(dropped: readonly Drop[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const d of dropped) counts.set(d.reason, (counts.get(d.reason) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

// Per-value counts for one reason (e.g. every unmapped position code and how often it
// appeared), sorted by value.
export function countValues(dropped: readonly Drop[], reason: string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const d of dropped) {
    if (d.reason !== reason) continue;
    const value = d.value ?? '';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

// Every input row must be either written or dropped with a reason. A mismatch means a code
// path discarded rows without recording them, so the caller fails that unit of work
// instead of recording success.
export function assertConserved(
  label: string,
  input: number,
  written: number,
  dropped: readonly Drop[]
): void {
  if (written + dropped.length !== input) {
    throw new Error(
      `${label}: conservation check failed (${written} written + ${dropped.length} dropped ` +
        `!= ${input} input)`
    );
  }
}
