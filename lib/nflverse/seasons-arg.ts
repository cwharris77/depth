// Parses the `--seasons` CLI flag shared by the nflverse backfill scripts
// (scripts/ingest-nflverse-rosters.mts, scripts/ingest-nflverse.mts's games/schedules
// step) into an explicit season list. Pure -- no I/O, no env reads.

// `--seasons 1999-2025` (a range) or `--seasons 2013` (one season). No flag -> null,
// meaning "the weekly job's default: whatever season is currently live".
export function parseSeasonsArg(argv: string[]): number[] | null {
  const flagIndex = argv.indexOf('--seasons');
  if (flagIndex === -1) return null;
  const value = argv[flagIndex + 1];
  if (!value) throw new Error('--seasons requires a value, e.g. --seasons 1999-2025');
  const rangeMatch = value.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    const [, startStr, endStr] = rangeMatch;
    const start = Number(startStr);
    const end = Number(endStr);
    if (start > end) throw new Error(`--seasons range is backwards: ${value}`);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const single = Number(value);
  if (!Number.isInteger(single))
    throw new Error(`--seasons value is not a year or range: ${value}`);
  return [single];
}
