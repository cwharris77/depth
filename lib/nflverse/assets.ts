// nflverse release assets are plain CSV files attached to tagged GitHub releases —
// one tag per dataset (`players`, `player_stats`, `rosters`, ...), see
// docs/nflverse.md. No API, no auth: a predictable URL per (tag, file).

const RELEASE_BASE = 'https://github.com/nflverse/nflverse-data/releases/download';

export function assetUrl(tag: string, file: string): string {
  return `${RELEASE_BASE}/${tag}/${file}`;
}

// Season-suffixed files (e.g. `stats_player_reg_2025.csv`) aren't published the
// instant a calendar year starts — nflverse publishes once the season's data exists.
// Rather than hard-code "this year", HEAD-check the current year and walk back up to
// `maxYearsBack` years until one exists. `fetchImpl` is injectable so tests can fake
// network responses without hitting GitHub.
export async function latestAvailableSeason(
  tag: string,
  prefix: string,
  fetchImpl: typeof fetch = fetch,
  maxYearsBack = 3
): Promise<number | null> {
  const currentYear = new Date().getUTCFullYear();
  for (let year = currentYear; year > currentYear - maxYearsBack; year--) {
    const url = assetUrl(tag, `${prefix}${year}.csv`);
    try {
      const res = await fetchImpl(url, { method: 'HEAD' });
      if (res.ok) return year;
    } catch {
      // network blip on this year's HEAD check — treat as unavailable, try the prior year
    }
  }
  return null;
}
