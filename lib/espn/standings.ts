import type { Conference, Division } from '../types';

// Minimal shape of ESPN's site standings endpoint (?level=3) — only what we read.
interface StandingsEntry {
  team?: { id?: string };
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
