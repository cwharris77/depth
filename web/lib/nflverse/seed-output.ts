// Guards replacement of the committed nflverse seed at the final I/O boundary. Snap
// summaries are a required part of that snapshot, so any failed snap season leaves the
// previous on-disk seed untouched and turns seed generation into a failed command.
import { writeFileSync } from 'node:fs';

export interface SnapSeasonFailure {
  season: number | string;
  message: string;
}

export function writeNflverseSeedFile(
  path: string,
  contents: string,
  snapFailures: readonly SnapSeasonFailure[]
): void {
  if (snapFailures.length > 0) {
    throw new Error(
      snapFailures
        .map((failure) => `snap-count season ${failure.season} failed: ${failure.message}`)
        .join('; ')
    );
  }

  writeFileSync(path, contents);
}
