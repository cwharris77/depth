import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assetUrl } from '@/lib/nflverse/assets';
import { SOURCE_SEASONS } from './contracts';

const GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';
const TEAM_STATS_TAG = 'stats_team';

export interface ForecastSourceSpec {
  key: 'games' | `team-week-${number}`;
  season: number | null;
  url: string;
  cacheFile: string;
}

export interface ForecastSourceFile extends ForecastSourceSpec {
  text: string;
  sha256: string;
}

export interface LoadForecastSourcesOptions {
  cacheDir: string;
  refresh?: boolean;
  fetchImpl?: typeof fetch;
}

export interface ForecastSourceBundle {
  sources: ForecastSourceFile[];
  games: ForecastSourceFile;
  teamWeeks: ForecastSourceFile[];
}

export function forecastSourceSpecs(): ForecastSourceSpec[] {
  return [
    {
      key: 'games',
      season: null,
      url: GAMES_URL,
      cacheFile: 'games.csv',
    },
    ...SOURCE_SEASONS.map((season) => ({
      key: `team-week-${season}` as `team-week-${number}`,
      season,
      url: assetUrl(TEAM_STATS_TAG, `stats_team_week_${season}.csv`),
      cacheFile: `stats_team_week_${season}.csv`,
    })),
  ];
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function loadSource(
  spec: ForecastSourceSpec,
  options: LoadForecastSourcesOptions,
  fetchImpl: typeof fetch
): Promise<ForecastSourceFile> {
  const path = join(options.cacheDir, spec.cacheFile);
  let text: string;

  if (!options.refresh) {
    try {
      text = await readFile(path, 'utf8');
    } catch {
      text = await fetchSource(spec, fetchImpl);
      await writeFile(path, text, 'utf8');
    }
  } else {
    text = await fetchSource(spec, fetchImpl);
    await writeFile(path, text, 'utf8');
  }

  if (!text) throw new Error(`Forecast source ${spec.key} has an empty body`);
  return { ...spec, text, sha256: sha256(text) };
}

async function fetchSource(spec: ForecastSourceSpec, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(spec.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast source ${spec.key}: HTTP ${response.status}`);
  }
  const text = await response.text();
  if (!text) throw new Error(`Forecast source ${spec.key} has an empty body`);
  return text;
}

export async function loadForecastSources(
  options: LoadForecastSourcesOptions
): Promise<ForecastSourceBundle> {
  await mkdir(options.cacheDir, { recursive: true });
  const fetchImpl = options.fetchImpl ?? fetch;
  const sources: ForecastSourceFile[] = [];
  for (const spec of forecastSourceSpecs()) {
    sources.push(await loadSource(spec, options, fetchImpl));
  }

  return {
    sources,
    games: sources[0],
    teamWeeks: sources.slice(1),
  };
}
