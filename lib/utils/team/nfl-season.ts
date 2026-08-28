// Next-cached access to the canonical season state (lib/utils/team/season-state.ts
// owns the definition — the calendar; see its header for why sources must never
// re-derive a season from their own labels). `new Date()` can't be read directly
// in a prerendered scope — Next requires either request-time data (cookies/headers/
// searchParams/connection()) or a `'use cache'` boundary first. The season/offseason
// boundary only flips twice a year, so a cache is the right tool here, not a dynamic
// hole: 'hours' comfortably re-evaluates well within a day of the actual Sep/Feb
// transition, which is the only time a stale read would ever be visibly wrong.
//
// Scripts (ingest) import the pure functions from ./season-state instead of this
// module so they never pull `next/cache` into a non-Next process.
import { cacheLife } from 'next/cache';
import { nflSeasonState } from './season-state';

export { currentSeasonOf, nflSeasonState } from './season-state';
export type { SeasonState } from './season-state';

export async function getNflSeasonState(): Promise<ReturnType<typeof nflSeasonState>> {
  'use cache';
  cacheLife('hours');
  return nflSeasonState();
}
