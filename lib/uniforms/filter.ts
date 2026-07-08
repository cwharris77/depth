// Pure archive filtering + grouping (roadmap Phase 7 archive page). Kept out of the
// client component so every rule is unit-tested and the component stays state-only.
// Era and current-only are independent axes: a reintroduced throwback (yearStart 1976,
// isCurrent true) sits in the '1970s' bucket AND passes current-only.

import type { Conference, Division, UniformKind } from './../types';
import type { UniformListing } from './../roster-source';

export interface UniformFilters {
  kind: UniformKind | 'all';
  era: string; // 'all' | a bucket from eraBucket
  currentOnly: boolean;
}

export function eraBucket(yearStart: number | null): string {
  if (yearStart === null) return 'Undated';
  return `${Math.floor(yearStart / 10) * 10}s`;
}

// Distinct buckets present, decades ascending, 'Undated' last.
export function eraOptions(kits: UniformListing[]): string[] {
  const buckets = new Set(kits.map((k) => eraBucket(k.yearStart)));
  const undated = buckets.delete('Undated');
  const decades = Array.from(buckets).sort();
  return undated ? [...decades, 'Undated'] : decades;
}

export function matchesFilters(kit: UniformListing, f: UniformFilters): boolean {
  if (f.kind !== 'all' && kit.kind !== f.kind) return false;
  if (f.era !== 'all' && eraBucket(kit.yearStart) !== f.era) return false;
  if (f.currentOnly && !kit.isCurrent) return false;
  return true;
}

export interface TeamGroup {
  teamId: string;
  teamName: string;
  kits: UniformListing[];
}
export interface DivisionGroup {
  conference: Conference;
  division: Division;
  teams: TeamGroup[];
}

const CONFERENCES: Conference[] = ['AFC', 'NFC'];
const DIVISIONS: Division[] = ['East', 'North', 'South', 'West'];

// Stable conference→division→team order (matches the switcher convention). Preserves
// each team's incoming kit order (the DB returns them in a deterministic order).
export function groupByDivision(kits: UniformListing[]): DivisionGroup[] {
  const groups: DivisionGroup[] = [];
  for (const conference of CONFERENCES) {
    for (const division of DIVISIONS) {
      const inDiv = kits.filter((k) => k.conference === conference && k.division === division);
      if (inDiv.length === 0) continue;
      const byTeam = new Map<string, TeamGroup>();
      for (const k of inDiv) {
        let g = byTeam.get(k.teamId);
        if (!g) {
          g = { teamId: k.teamId, teamName: k.teamName, kits: [] };
          byTeam.set(k.teamId, g);
        }
        g.kits.push(k);
      }
      const teams = Array.from(byTeam.values()).sort((a, b) =>
        a.teamName.localeCompare(b.teamName)
      );
      groups.push({ conference, division, teams });
    }
  }
  return groups;
}
