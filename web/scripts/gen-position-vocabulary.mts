// Snapshots every position code nflverse has published in the two files the roster ingest
// reads -- roster_<season>.csv and depth_charts_<season>.csv -- into
// fixtures/positions/nflverse-vocabulary.json. The position-mapping tests classify every
// code in that file, so a code nflverse starts publishing fails a test once the snapshot
// is regenerated instead of silently dropping players.
//
// Run with `npm run gen:position-vocabulary`. Reads only; never touches the DB.

import { writeFileSync } from 'node:fs';
import { assetUrl, latestAvailableSeason } from '@/lib/nflverse/assets';
import { parseCsv } from '@/lib/nflverse/csv';
import { depthChartUnit, type DepthChartUnit } from '@/lib/nflverse/positions';

const OUT = 'fixtures/positions/nflverse-vocabulary.json';
const ROSTERS_MIN_SEASON = 1999;
const DEPTH_CHARTS_MIN_SEASON = 2001;
// Legacy depth charts carry `formation` + `depth_position`; the 2025+ files carry
// `pos_grp` + `pos_abb`.
const DEPTH_CHARTS_LEGACY_MAX_SEASON = 2024;

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function main() {
  const latest = await latestAvailableSeason('rosters', 'roster_');
  if (latest === null) throw new Error('no roster_<season>.csv found');

  const rosterCodes = new Set<string>();
  // Keyed by unit: the same code means a different position on each side of the ball.
  const depthChartCodes: Record<DepthChartUnit, Set<string>> = {
    offense: new Set(),
    defense: new Set(),
    special: new Set(),
  };
  for (let season = ROSTERS_MIN_SEASON; season <= latest; season++) {
    for (const row of parseCsv(await getText(assetUrl('rosters', `roster_${season}.csv`)))) {
      rosterCodes.add(
        (row.depth_chart_position?.trim() || row.position?.trim() || '').toUpperCase()
      );
    }
    if (season < DEPTH_CHARTS_MIN_SEASON) continue;
    const legacy = season <= DEPTH_CHARTS_LEGACY_MAX_SEASON;
    const csv = await getText(assetUrl('depth_charts', `depth_charts_${season}.csv`));
    for (const row of parseCsv(csv)) {
      if (legacy && row.game_type !== 'REG') continue;
      const label = (legacy ? row.formation : row.pos_grp) ?? '';
      const unit = depthChartUnit(label, legacy);
      if (!unit) throw new Error(`${season}: unrecognized depth-chart formation "${label}"`);
      const code = (legacy ? row.depth_position : row.pos_abb) ?? '';
      depthChartCodes[unit].add(code.trim().toUpperCase());
    }
    console.log(`${season}: done`);
  }

  const sorted = (codes: Set<string>) => [...codes].sort();
  const vocabulary = {
    seasons: { from: ROSTERS_MIN_SEASON, to: latest },
    rosterCodes: sorted(rosterCodes),
    depthChartCodes: {
      offense: sorted(depthChartCodes.offense),
      defense: sorted(depthChartCodes.defense),
      special: sorted(depthChartCodes.special),
    },
  };
  writeFileSync(OUT, JSON.stringify(vocabulary, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
