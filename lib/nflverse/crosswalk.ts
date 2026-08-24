// Builds nflverse's GSIS- and PFR-to-ESPN identity crosswalks from players.csv.
// Name-matching is where silent data corruption comes from, so a row with no ESPN id
// is absent from the map and each caller can count or skip it rather than guessing.

function buildIdCrosswalk(
  rows: Record<string, string>[],
  sourceColumn: 'gsis_id' | 'pfr_id'
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const sourceId = row[sourceColumn]?.trim();
    const espnId = row.espn_id?.trim();
    if (!sourceId || !espnId || map.has(sourceId)) continue;
    map.set(sourceId, espnId);
  }
  return map;
}

export function buildCrosswalk(rows: Record<string, string>[]): Map<string, string> {
  return buildIdCrosswalk(rows, 'gsis_id');
}

export function buildPfrCrosswalk(rows: Record<string, string>[]): Map<string, string> {
  return buildIdCrosswalk(rows, 'pfr_id');
}
