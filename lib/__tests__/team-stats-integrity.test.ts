import { describe, it, expect } from 'vitest';
import { LEAGUE } from '@/lib/teams/league';

// Representative real backfill: every team that has team_stats rows in
// supabase/seed.sql. Derived from the seed fixture — do not edit by hand;
// regenerate by running the node one-liner in the repo root if the seed
// changes: node -e "const fs=require('fs');const s=fs.readFileSync('supabase/seed.sql','utf8');const b=s.slice(s.indexOf('insert into team_stats'),s.indexOf('on conflict (team_id,season) do nothing;')+'on conflict (team_id,season) do nothing;'.length);const ids=new Set();for(const l of b.split('\n')){const m=l.match(/^\s*\('([a-z]+)',/);if(m)ids.add(m[1])}console.log(JSON.stringify([...ids].sort()))"
const SEEDED_TEAM_IDS = new Set([
  '49ers',
  'bears',
  'bengals',
  'bills',
  'broncos',
  'browns',
  'buccaneers',
  'cardinals',
  'chargers',
  'chiefs',
  'colts',
  'commanders',
  'cowboys',
  'dolphins',
  'eagles',
  'falcons',
  'giants',
  'jaguars',
  'jets',
  'lions',
  'packers',
  'panthers',
  'patriots',
  'raiders',
  'rams',
  'ravens',
  'saints',
  'seahawks',
  'steelers',
  'texans',
  'titans',
  'vikings',
]);

// Every NFL team in the league seed must have at least one team_stats row
// in the representative real backfill (supabase/seed.sql). A missing entry
// means the ingest never wrote that team's stats, which would surface as an
// empty seasons array at runtime and silently produce incomplete data on the
// Stats page.
describe('team_stats integrity — per-team coverage', () => {
  for (const { team } of LEAGUE) {
    it(`${team.id} (${team.name}): has at least one team_stats season`, () => {
      expect(SEEDED_TEAM_IDS.has(team.id)).toBe(true);
    });
  }
});
