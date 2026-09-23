import { describe, it, expect } from 'vitest';
import roster from './fixtures/roster-sea.json';
import depthcharts from './fixtures/depthchart-sea.json';
import {
  belongsToTeam,
  missingRosterAthleteIds,
  parseAthleteId,
  toBrandColors,
  toCoach,
  toDepthChartRows,
  toTeamRoster,
} from './transform';
import type { Player } from '../types';
import type { EspnRoster, EspnDepthcharts, EspnTeamInfo } from './types';
import type { Team, TeamColors } from '../types';

const CURATED: TeamColors = {
  primary: '#001',
  secondary: '#002',
  accent: '#003',
  uiAccent: '#4CC3FF',
  onAccent: '#0a0e1a',
};
const META: Team = {
  id: 'seahawks',
  city: 'Seattle',
  name: 'Seahawks',
  abbrev: 'SEA',
  conference: 'NFC',
  division: 'West',
  colors: CURATED,
};
const TEAM_INFO: EspnTeamInfo = {
  id: '26',
  abbreviation: 'SEA',
  color: '002a5c',
  alternateColor: '69be28',
  logos: [{ href: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png' }],
};

describe('parseAthleteId', () => {
  it('extracts the id from a $ref', () => {
    expect(
      parseAthleteId(
        'http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/2473037?lang=en'
      )
    ).toBe('2473037');
  });
  it('returns null for a junk ref', () => {
    expect(parseAthleteId('not-a-url')).toBeNull();
  });
});

describe('toCoach', () => {
  const typedRoster = roster as unknown as EspnRoster;

  it('extracts the head coach from the roster payload', () => {
    expect(toCoach(typedRoster)).toEqual({
      name: 'Mike Macdonald',
      espnId: '5044374',
      experience: 2,
    });
  });

  it('returns null when the coach array is missing', () => {
    const { coach: _coach, ...withoutCoach } = typedRoster;
    expect(toCoach(withoutCoach as EspnRoster)).toBeNull();
  });

  it('returns null when the coach array is empty', () => {
    expect(toCoach({ ...typedRoster, coach: [] })).toBeNull();
  });
});

describe('toBrandColors', () => {
  it('uses the real ESPN brand colors, with the secondary as the UI accent', () => {
    const c = toBrandColors(TEAM_INFO);
    expect(c.primary.toLowerCase()).toBe('#002a5c');
    expect(c.secondary.toLowerCase()).toBe('#69be28');
    // The accent is the team's real secondary (the pop color) — Seahawks green,
    // matching the dot ring — never invented or lightened.
    expect(c.uiAccent.toLowerCase()).toBe('#69be28');
    // onAccent is just legible text painted on that accent (light green → dark).
    expect(c.onAccent.toLowerCase()).toBe('#15161a');
  });

  it('uses the primary as the accent for teams whose secondary is black or white', () => {
    // Falcons: red primary + black secondary. Cardinals: red primary + white secondary.
    // Black/white are neutral, not distinguishing accents, so use the real primary.
    const falcons: EspnTeamInfo = {
      id: '1',
      abbreviation: 'ATL',
      color: 'a71930',
      alternateColor: '000000',
      logos: [],
    };
    const cardinals: EspnTeamInfo = {
      id: '22',
      abbreviation: 'ARI',
      color: 'a40227',
      alternateColor: 'ffffff',
      logos: [],
    };
    expect(toBrandColors(falcons).uiAccent.toLowerCase()).toBe('#a71930');
    expect(toBrandColors(cardinals).uiAccent.toLowerCase()).toBe('#a40227');
  });

  it('overrides the Ravens accent to official gold (purple + black both fail on the dark UI)', () => {
    const ravens: EspnTeamInfo = {
      id: '33',
      abbreviation: 'BAL',
      color: '29126f',
      alternateColor: '000000',
      logos: [],
    };
    expect(toBrandColors(ravens).uiAccent.toLowerCase()).toBe('#9e7c0c');
  });
});

describe('toTeamRoster', () => {
  const result = toTeamRoster({
    meta: META,
    roster: roster as unknown as EspnRoster,
    depthcharts: depthcharts as unknown as EspnDepthcharts,
    teamInfo: TEAM_INFO,
  });

  it('carries team metadata + merged logo', () => {
    expect(result.team.id).toBe('seahawks');
    expect(result.team.logo).toContain('espncdn.com');
  });
  it('produces players with valid positions and depthRank 1-3', () => {
    expect(result.players.length).toBeGreaterThan(20);
    for (const p of result.players) {
      expect([1, 2, 3]).toContain(p.depthRank);
      expect(p.name).toBeTruthy();
      expect(p.photoUrl).toContain('espncdn.com');
    }
  });
  it('has a QB1 and at least two WRs', () => {
    expect(result.players.some((p) => p.position === 'QB' && p.depthRank === 1)).toBe(true);
    expect(result.players.filter((p) => p.position === 'WR').length).toBeGreaterThanOrEqual(2);
  });
  it('fills special-teams returners from the ST depthchart', () => {
    const kr = result.specialTeams.find((s) => s.label === 'KR');
    if (!kr) throw new Error('expected a KR special-teams slot');
    expect(kr.playerId).toBeTruthy();
  });
  it("never references a special player id that isn't in the roster", () => {
    const ids = new Set(result.players.map((p) => p.id));
    for (const slot of result.specialTeams) {
      if (slot.playerId) expect(ids.has(slot.playerId)).toBe(true);
    }
  });

  it('derives bio from birthplace (city, state) rather than restating position/team', () => {
    const withBio = result.players.find((p) => p.bio);
    if (!withBio) throw new Error('expected at least one player with a bio');
    expect(withBio.bio).toMatch(/^Born in .+/);
  });

  it("doesn't collide on depth_chart_entries rank", () => {
    // Guards the DB write path: depth_chart_entries has a unique (team_id, position,
    // depth_rank) constraint. Real ESPN depth charts now map every raw key to its own
    // granular Position (no more lde+rde -> DE collapsing), so toDepthChartRows'
    // collision handling is exercised below with a synthetic still-collapsed pair
    // (lb + mlb both -> LB) instead.
    const rows = toDepthChartRows(result.players);
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.position}:${row.depthRank}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
  });
});

describe('toTeamRoster: returner ranked outside the top-3 cap', () => {
  // Regression test: a KR/PR can be a WR/RB ranked well below our top-3-per-position
  // cap (e.g. WR7), so they're dropped from `players` by the normal offense loop but
  // still a valid special-teams reference. Without the fallback, specialTeams would
  // point at a playerId absent from `players` -- breaking the app's lookup and the
  // DB's special_teams_slots.player_id FK.
  // parseAthleteId pulls a numeric id out of the $ref URL — ids must be numeric.
  const ref = (id: string) => ({
    $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/${id}?lang=en`,
  });
  const WR7_ID = '9990001';

  const roster: EspnRoster = {
    season: { year: 2025 },
    athletes: [
      {
        position: 'offense',
        items: [
          {
            id: WR7_ID,
            fullName: 'Deep Bench Wideout',
            jersey: '19',
            position: { abbreviation: 'WR' },
            headshot: { href: 'https://a.espncdn.com/i/headshots/nfl/players/full/wr7.png' },
          } as EspnRoster['athletes'][number]['items'][number],
        ],
      },
    ],
  };

  const depthcharts: EspnDepthcharts = {
    items: [
      {
        name: '3WR 1TE',
        positions: {
          wr: {
            athletes: Array.from({ length: 7 }, (_, i) => ({
              rank: i + 1,
              athlete: i === 6 ? ref(WR7_ID) : ref(`900000${i}`),
            })),
          },
        },
      },
      {
        name: 'Special Teams',
        positions: {
          kr: { athletes: [{ rank: 1, athlete: ref(WR7_ID) }] },
        },
      },
    ],
  };

  it('adds the returner to players even when ranked outside the top-3 cap', () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });
    const kr = result.specialTeams.find((s) => s.label === 'KR');
    expect(kr?.playerId).toBe(WR7_ID);
    const player = result.players.find((p) => p.id === WR7_ID);
    if (!player) throw new Error('expected the returner to be present in players');
    expect(player.position).toBe('WR');
  });

  it('suppresses the bio (empty string) rather than falling back to filler when birthplace is missing', () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });
    const player = result.players.find((p) => p.id === WR7_ID);
    if (!player) throw new Error('expected the returner to be present in players');
    expect(player.bio).toBe('');
  });
});

describe('toTeamRoster: still-collapsed raw keys (e.g. lb + mlb -> LB)', () => {
  // Most granular defensive keys now map 1:1 to their own Position (SS/FS/LDE/RDE/NT/
  // WLB/LILB/RILB/SLB/LCB/RCB/NB), but a few generic fallback keys (lb, mlb) still
  // collapse onto the same Position — real depth chart data for a team scheme this
  // repo hasn't sampled could still produce that shape, so toTeamRoster/toDepthChartRows
  // must keep handling it (exhaustive Record<Position,...>/switch call sites,
  // not this collision guard specifically — but the guard itself still needs a live key
  // pair to exercise it since the real fixture no longer has one).
  const ref = (id: string) => ({
    $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/${id}?lang=en`,
  });

  const roster: EspnRoster = {
    season: { year: 2025 },
    athletes: [
      {
        position: 'defense',
        items: [
          {
            id: '1001',
            fullName: 'Weakside Backer',
            jersey: '55',
            position: { abbreviation: 'LB' },
          } as EspnRoster['athletes'][number]['items'][number],
          {
            id: '1002',
            fullName: 'Mike Backer',
            jersey: '56',
            position: { abbreviation: 'LB' },
          } as EspnRoster['athletes'][number]['items'][number],
        ],
      },
    ],
  };

  const depthcharts: EspnDepthcharts = {
    items: [
      {
        name: 'Base D',
        positions: {
          lb: { athletes: [{ rank: 1, athlete: ref('1001') }] },
          mlb: { athletes: [{ rank: 1, athlete: ref('1002') }] },
        },
      },
    ],
  };

  it("both raw keys land on Position 'LB' at depthRank 1, and toDepthChartRows re-ranks them apart", () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });
    const lb1 = result.players.filter((p) => p.position === 'LB' && p.depthRank === 1);
    expect(lb1).toHaveLength(2);

    const rows = toDepthChartRows(result.players);
    const keys = rows.map((r) => `${r.position}:${r.depthRank}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('toDepthChartRows', () => {
  const player = (over: Partial<Player>): Player => ({
    id: over.id ?? 'p',
    name: 'Name',
    number: over.number ?? 0,
    position: over.position ?? 'DE',
    depthRank: over.depthRank ?? 1,
    status: 'starter',
    age: 25,
    college: '—',
    experience: 3,
    height: '6\'0"',
    weight: 200,
    bio: 'bio',
  });

  it('re-ranks a collapsed position group 1..3 by (depthRank, number), unique per position', () => {
    const players = [
      player({ id: 'lde1', position: 'DE', depthRank: 1, number: 90 }),
      player({ id: 'rde1', position: 'DE', depthRank: 1, number: 91 }),
      player({ id: 'lde2', position: 'DE', depthRank: 2, number: 92 }),
      player({ id: 'rde2', position: 'DE', depthRank: 2, number: 93 }),
    ];
    const rows = toDepthChartRows(players);
    expect(rows).toHaveLength(3); // capped at 3, one extra dropped
    const keys = rows.map((r) => `${r.position}:${r.depthRank}`);
    expect(new Set(keys).size).toBe(keys.length); // no duplicates
    expect(rows[0]).toEqual({ position: 'DE', depthRank: 1, playerId: 'lde1' });
    expect(rows[1]).toEqual({ position: 'DE', depthRank: 2, playerId: 'rde1' });
    expect(rows[2]).toEqual({ position: 'DE', depthRank: 3, playerId: 'lde2' });
  });

  it('keeps independent positions separate', () => {
    const players = [
      player({ id: 'qb1', position: 'QB', depthRank: 1 }),
      player({ id: 'wr1', position: 'WR', depthRank: 1 }),
    ];
    const rows = toDepthChartRows(players);
    expect(rows).toHaveLength(2);
  });
});

describe('toTeamRoster: an athlete cross-listed at two positions (DEP-585)', () => {
  // ESPN routinely lists the same lineman under both sides -- a swing tackle at `lt` and
  // `rt`, an interior lineman at `lg` and `rg`. The depth-chart loop's team-wide `seen`
  // set used to let the first key iterated claim the athlete permanently, so the second
  // slot emitted nothing. In production that left the Chiefs with zero RT entries (a
  // ten-man offense) and the league 15-18 entries short at RT and RG versus LT and LG,
  // while cross-list-free positions (LDE/RDE, LCB/RCB) stayed balanced.
  const ref = (id: string) => ({
    $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/${id}?lang=en`,
  });

  const roster: EspnRoster = {
    season: { year: 2025 },
    athletes: [
      {
        position: 'offense',
        items: [
          {
            id: '2001',
            fullName: 'Swing Tackle',
            jersey: '70',
            position: { abbreviation: 'OT' },
          } as EspnRoster['athletes'][number]['items'][number],
          {
            id: '2002',
            fullName: 'Starting Left Tackle',
            jersey: '71',
            position: { abbreviation: 'OT' },
          } as EspnRoster['athletes'][number]['items'][number],
        ],
      },
    ],
  };

  const depthcharts: EspnDepthcharts = {
    items: [
      {
        name: 'Base O',
        positions: {
          lt: {
            athletes: [
              { rank: 1, athlete: ref('2002') },
              { rank: 2, athlete: ref('2001') },
            ],
          },
          // The swing tackle is the only right tackle ESPN lists -- exactly the Chiefs' shape.
          rt: { athletes: [{ rank: 1, athlete: ref('2001') }] },
        },
      },
    ],
  };

  it('emits a depth-chart slot for every position ESPN lists him at, not just the first', () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });

    const slots = result.depthChartSlots.map((s) => `${s.position}:${s.depthRank}:${s.playerId}`);
    expect(slots).toContain('LT:1:2002');
    expect(slots).toContain('LT:2:2001');
    // The regression: RT used to be empty because 2001 was already in `seen` from `lt`.
    expect(slots).toContain('RT:1:2001');
  });

  it('still lists the athlete only once in players, with one canonical position', () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });
    expect(result.players.filter((p) => p.id === '2001')).toHaveLength(1);
  });
});

describe('depth-chart athletes the site roster omits (DEP-585)', () => {
  const ref = (id: string) => ({
    $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/${id}?lang=en`,
  });
  const ON_ROSTER = '7000001';
  const CHART_ONLY = '7000002';
  const TOO_DEEP = '7000003';

  const thinRoster: EspnRoster = {
    season: { year: 2025 },
    athletes: [
      {
        position: 'offense',
        items: [
          {
            id: ON_ROSTER,
            fullName: 'Listed Tackle',
            jersey: '70',
            position: { abbreviation: 'OT' },
          } as EspnRoster['athletes'][number]['items'][number],
        ],
      },
    ],
  };

  const thinCharts: EspnDepthcharts = {
    items: [
      {
        name: '3WR 1TE',
        positions: {
          lt: {
            athletes: [
              { rank: 1, athlete: ref(CHART_ONLY) },
              { rank: 2, athlete: ref(ON_ROSTER) },
              { rank: 4, athlete: ref(TOO_DEEP) },
            ],
          },
        },
      },
    ],
  };

  it('reports only the athletes the roster never names', () => {
    expect(missingRosterAthleteIds({ roster: thinRoster, depthcharts: thinCharts })).toEqual([
      CHART_ONLY,
    ]);
  });

  it('ignores athletes ranked past the top-3 cap the transform applies', () => {
    const missing = missingRosterAthleteIds({ roster: thinRoster, depthcharts: thinCharts });
    expect(missing).not.toContain(TOO_DEEP);
  });

  it('records an unseatable athlete instead of dropping him silently', () => {
    const result = toTeamRoster({
      meta: META,
      roster: thinRoster,
      depthcharts: thinCharts,
      teamInfo: TEAM_INFO,
    });
    expect(result.unseatedAthleteIds).toContain(CHART_ONLY);
    expect(result.unseatedAthleteIds).not.toContain(ON_ROSTER);
  });

  it('seats the athlete once the ingest hydrates him into the roster', () => {
    const hydrated: EspnRoster = {
      ...thinRoster,
      athletes: [
        ...thinRoster.athletes,
        {
          position: 'depthchart-only',
          items: [
            {
              id: CHART_ONLY,
              fullName: 'Chart Only Tackle',
              jersey: '71',
              position: { abbreviation: 'OT' },
            } as EspnRoster['athletes'][number]['items'][number],
          ],
        },
      ],
    };
    const result = toTeamRoster({
      meta: META,
      roster: hydrated,
      depthcharts: thinCharts,
      teamInfo: TEAM_INFO,
    });
    expect(result.unseatedAthleteIds).toEqual([]);
    expect(
      result.depthChartSlots.find((s) => s.position === 'LT' && s.depthRank === 1)?.playerId
    ).toBe(CHART_ONLY);
  });
});

describe('belongsToTeam: ESPN must place the athlete on this team (DEP-585)', () => {
  const teamRef = (id: string) => ({
    $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/teams/${id}?lang=en`,
  });

  it('admits a stale "Free Agent" whose own record still points at the team', () => {
    // Josh Simmons' real shape: ESPN's depth chart starts him at LT for Kansas City and
    // his record's team ref agrees, while status.type lags at free-agent.
    expect(
      belongsToTeam(
        {
          id: '4569659',
          fullName: 'Josh Simmons',
          active: true,
          status: { type: 'free-agent' },
          team: teamRef('12'),
        },
        '12'
      )
    ).toBe(true);
  });

  it('rejects an athlete ESPN places on another team', () => {
    expect(
      belongsToTeam({ id: '1', fullName: 'Traded Away', active: true, team: teamRef('21') }, '12')
    ).toBe(false);
  });

  it('rejects a record carrying no team ref at all', () => {
    expect(belongsToTeam({ id: '2', fullName: 'Unattached', active: true }, '12')).toBe(false);
  });

  it('admits an `active: false` record whose team ref still points at the team', () => {
    // Chamarri Conner's real shape: chiefs.com lists him as the starting safety while
    // ESPN's athlete record reads active: false. Gating on `active` dropped a starter.
    expect(
      belongsToTeam(
        { id: '4361964', fullName: 'Chamarri Conner', active: false, team: teamRef('12') },
        '12'
      )
    ).toBe(true);
  });
});

describe('statusOf: injury comes from injuries, not status.type (DEP-585)', () => {
  const ref = (id: string) => ({
    $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/${id}?lang=en`,
  });
  const PRACTICE_SQUAD = '8000001';
  const HURT_STARTER = '8000002';

  const roster: EspnRoster = {
    season: { year: 2025 },
    athletes: [
      {
        position: 'offense',
        items: [
          {
            id: PRACTICE_SQUAD,
            fullName: 'Practice Squad Guard',
            jersey: '60',
            position: { abbreviation: 'OG' },
            experience: { years: 3 },
            status: { type: 'practice-squad' },
          },
          {
            id: HURT_STARTER,
            fullName: 'Questionable Guard',
            jersey: '61',
            position: { abbreviation: 'OG' },
            experience: { years: 5 },
            status: { type: 'active' },
            injuries: [{ status: 'Questionable' }],
          },
        ] as EspnRoster['athletes'][number]['items'],
      },
    ],
  };

  const depthcharts: EspnDepthcharts = {
    items: [
      {
        name: '3WR 1TE',
        positions: {
          lg: {
            athletes: [
              { rank: 1, athlete: ref(HURT_STARTER) },
              { rank: 2, athlete: ref(PRACTICE_SQUAD) },
            ],
          },
        },
      },
    ],
  };

  it('does not badge a healthy practice-squad player as injured', () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });
    expect(result.players.find((p) => p.id === PRACTICE_SQUAD)?.status).toBe('backup');
  });

  it('badges an active player who is actually carrying an injury', () => {
    const result = toTeamRoster({ meta: META, roster, depthcharts, teamInfo: TEAM_INFO });
    expect(result.players.find((p) => p.id === HURT_STARTER)?.status).toBe('injured');
  });
});
