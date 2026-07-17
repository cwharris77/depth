// Joins nflverse's player-stats rows (keyed by gsis_id) to our players table (keyed
// by ESPN athlete id) via nflverse's own id crosswalk (players.csv). Name-matching is
// where silent data corruption comes from -- a row with no espn_id just isn't in the
// map, and transform.ts counts it as a skip rather than guessing.

export function buildCrosswalk(playersCsvRows: Record<string, string>[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of playersCsvRows) {
    const gsisId = row.gsis_id?.trim();
    const espnId = row.espn_id?.trim();
    if (!gsisId || !espnId) continue;
    if (map.has(gsisId)) continue; // first row for a gsis_id wins
    map.set(gsisId, espnId);
  }
  return map;
}
