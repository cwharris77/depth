import type { Conference, Division, TeamStats } from '../types';

// Minimal shape of ESPN's site standings endpoint (?level=3) — only what we read.
interface EspnStatEntry {
  type?: string;
  value?: number;
  displayValue?: string;
}
interface StandingsEntry {
  team?: { id?: string };
  stats?: EspnStatEntry[];
}
interface DivisionNode {
  name: string;
  standings?: { entries?: StandingsEntry[] };
}
interface ConferenceNode {
  name: string;
  children?: DivisionNode[] | { items?: DivisionNode[] };
}
export interface EspnStandings {
  children?: ConferenceNode[] | { items?: ConferenceNode[] };
}

// ESPN wraps children as either a plain array or { items: [...] } depending on endpoint.
function kids<T>(children: T[] | { items?: T[] } | undefined): T[] {
  if (Array.isArray(children)) return children;
  return children?.items ?? [];
}

const DIVISIONS: Division[] = ['North', 'South', 'East', 'West'];

// "AFC West" / "National Football Conference West" → the Division enum value (last word).
function divisionFromName(name: string): Division | null {
  const last = name.trim().split(/\s+/).pop() ?? '';
  return DIVISIONS.find((d) => d === last) ?? null;
}

// One standings fetch → every ESPN team id mapped to its conference + division, so
// conf/div is sourced from ESPN rather than hand-curated in lib/teams/league.ts.
export function parseStandings(
  json: EspnStandings
): Map<string, { conference: Conference; division: Division }> {
  const out = new Map<string, { conference: Conference; division: Division }>();
  for (const conf of kids(json.children)) {
    const conference: Conference = conf.name.includes('American') ? 'AFC' : 'NFC';
    for (const div of kids(conf.children)) {
      const division = divisionFromName(div.name);
      if (!division) continue;
      for (const entry of div.standings?.entries ?? []) {
        const id = entry.team?.id;
        if (id) out.set(String(id), { conference, division });
      }
    }
  }
  return out;
}

function statNum(stats: EspnStatEntry[], type: string): number | undefined {
  const s = stats.find((e) => e.type === type);
  return typeof s?.value === 'number' ? s.value : undefined;
}

function statStr(stats: EspnStatEntry[], type: string): string | undefined {
  return stats.find((e) => e.type === type)?.displayValue;
}

// ESPN's W-L record fields ("6-3") aren't split into wins/losses server-side.
// Ties are optional ("5-1-1") but only captured if present; split-record ties aren't stored.
function splitRecord(display: string | undefined): { wins: number; losses: number } | undefined {
  const m = display?.match(/^(\d+)-(\d+)(?:-\d+)?$/);
  return m ? { wins: Number(m[1]), losses: Number(m[2]) } : undefined;
}

// Same standings fetch parseStandings reads, mapped to the fuller stat block instead of
// just conference/division. A team whose stats array is missing or partial (bye-week
// ingest gap, mid-season expansion) is left out of the map entirely -- never a
// half-filled TeamStats (invariant 6) -- so the caller's "no entry -> skip the upsert"
// logic (scripts/ingest-espn.mts) has a clean signal.
export function parseTeamStats(json: EspnStandings): Map<string, TeamStats> {
  const out = new Map<string, TeamStats>();
  for (const conf of kids(json.children)) {
    for (const div of kids(conf.children)) {
      for (const entry of div.standings?.entries ?? []) {
        const id = entry.team?.id;
        if (!id) continue;
        const stats = entry.stats ?? [];

        const wins = statNum(stats, 'wins');
        const losses = statNum(stats, 'losses');
        const ties = statNum(stats, 'ties');
        const winPercent = statNum(stats, 'winpercent');
        const pointsFor = statNum(stats, 'pointsfor');
        const pointsAgainst = statNum(stats, 'pointsagainst');
        const pointDifferential = statNum(stats, 'pointdifferential');
        const playoffSeed = statNum(stats, 'playoffseed');
        const streak = statStr(stats, 'streak');
        const home = splitRecord(statStr(stats, 'home'));
        const road = splitRecord(statStr(stats, 'road'));
        const division = splitRecord(statStr(stats, 'vsdiv'));
        const conference = splitRecord(statStr(stats, 'vsconf'));

        if (
          wins === undefined ||
          losses === undefined ||
          ties === undefined ||
          winPercent === undefined ||
          pointsFor === undefined ||
          pointsAgainst === undefined ||
          pointDifferential === undefined ||
          playoffSeed === undefined ||
          streak === undefined ||
          !home ||
          !road ||
          !division ||
          !conference
        ) {
          continue;
        }

        out.set(String(id), {
          overallWins: wins,
          overallLosses: losses,
          overallTies: ties,
          winPercent,
          homeWins: home.wins,
          homeLosses: home.losses,
          roadWins: road.wins,
          roadLosses: road.losses,
          divisionWins: division.wins,
          divisionLosses: division.losses,
          conferenceWins: conference.wins,
          conferenceLosses: conference.losses,
          pointsFor,
          pointsAgainst,
          pointDifferential,
          streak,
          playoffSeed,
        });
      }
    }
  }
  return out;
}
