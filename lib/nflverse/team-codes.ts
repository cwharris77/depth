// nflverse's team codes -> our team.id. nflverse uses its own abbreviations, which are
// NOT our ESPN `abbrev` column: the Rams are `LA` (our abbrev is `LAR`), and historic
// relocations appear under old codes (`OAK`, `SD`, `STL`). A plain join on `abbrev` would
// silently miss the Rams and every relocated franchise, so this is a hand-reviewed static
// map. Historic codes fold into the current franchise's id so pre-move seasons land on the
// right team (docs/superpowers/specs/2026-07-17-team-schedule-design.md). An unknown code
// resolves to null and its game is skipped-and-counted at ingest, never guessed.

export const NFLVERSE_TEAM_CODES: Record<string, string> = {
  ARI: 'cardinals',
  ATL: 'falcons',
  BAL: 'ravens',
  BUF: 'bills',
  CAR: 'panthers',
  CHI: 'bears',
  CIN: 'bengals',
  CLE: 'browns',
  DAL: 'cowboys',
  DEN: 'broncos',
  DET: 'lions',
  GB: 'packers',
  HOU: 'texans',
  IND: 'colts',
  JAX: 'jaguars',
  KC: 'chiefs',
  LA: 'rams', // nflverse's current Rams code
  LAC: 'chargers',
  LV: 'raiders',
  MIA: 'dolphins',
  MIN: 'vikings',
  NE: 'patriots',
  NO: 'saints',
  NYG: 'giants',
  NYJ: 'jets',
  PHI: 'eagles',
  PIT: 'steelers',
  SEA: 'seahawks',
  SF: '49ers',
  TB: 'buccaneers',
  TEN: 'titans',
  WAS: 'commanders',
  // Historic relocation codes + safety aliases -> current franchise id.
  OAK: 'raiders', // Oakland Raiders (-> Las Vegas 2020)
  SD: 'chargers', // San Diego Chargers (-> Los Angeles 2017)
  STL: 'rams', // St. Louis Rams (-> Los Angeles 2016)
  LAR: 'rams', // ESPN-style alias, in case a nflverse asset ever emits it
};

export function resolveTeamCode(code: string): string | null {
  return NFLVERSE_TEAM_CODES[code] ?? null;
}
