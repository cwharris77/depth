import { describe, it, expect } from 'vitest';
import { parseStandings, parseTeamStats } from './standings';

// Shape mirrors ESPN's site standings endpoint (?level=3): conferences → divisions →
// standings.entries[].team. One fetch maps every team id to its conference + division,
// so conf/div come from ESPN instead of being hand-curated in lib/teams/league.ts.
const FIXTURE = {
  children: [
    {
      name: 'American Football Conference',
      children: [
        {
          name: 'AFC West',
          standings: {
            entries: [
              { team: { id: '12', abbreviation: 'KC' } },
              { team: { id: '7', abbreviation: 'DEN' } },
            ],
          },
        },
      ],
    },
    {
      name: 'National Football Conference',
      children: [
        {
          name: 'NFC West',
          standings: { entries: [{ team: { id: '26', abbreviation: 'SEA' } }] },
        },
      ],
    },
  ],
};

describe('parseStandings', () => {
  it('maps each ESPN team id to its conference and division', () => {
    const map = parseStandings(FIXTURE);
    expect(map.get('12')).toEqual({ conference: 'AFC', division: 'West' });
    expect(map.get('7')).toEqual({ conference: 'AFC', division: 'West' });
    expect(map.get('26')).toEqual({ conference: 'NFC', division: 'West' });
  });

  it('covers every team exactly once', () => {
    const map = parseStandings(FIXTURE);
    expect(map.size).toBe(3);
  });
});

function statEntry(type: string, value: number | undefined, displayValue: string) {
  return { type, value, displayValue };
}

const STATS_FIXTURE = {
  children: [
    {
      name: 'American Football Conference',
      children: [
        {
          name: 'AFC East',
          standings: {
            entries: [
              {
                team: { id: '12' },
                stats: [
                  statEntry('wins', 14, '14'),
                  statEntry('losses', 3, '3'),
                  statEntry('ties', 0, '0'),
                  statEntry('winpercent', 0.8235294, '.824'),
                  statEntry('streak', 3, 'W3'),
                  statEntry('playoffseed', 2, '2'),
                  statEntry('pointsfor', 490, '490'),
                  statEntry('pointsagainst', 320, '320'),
                  statEntry('pointdifferential', 170, '+170'),
                  statEntry('total', undefined, '14-3'),
                  statEntry('home', undefined, '6-3'),
                  statEntry('road', undefined, '8-0'),
                  statEntry('vsdiv', undefined, '5-1'),
                  statEntry('vsconf', undefined, '9-3'),
                ],
              },
              {
                // No standings entry -> no team id at all, must not appear in the map.
                team: { id: '7' },
                // stats array missing entirely.
              },
              {
                team: { id: '9' },
                // Partial: missing 'road' -> the whole team must be skipped, not
                // half-filled.
                stats: [
                  statEntry('wins', 5, '5'),
                  statEntry('losses', 12, '12'),
                  statEntry('ties', 0, '0'),
                  statEntry('winpercent', 0.294, '.294'),
                  statEntry('streak', 1, 'L1'),
                  statEntry('playoffseed', 16, '16'),
                  statEntry('pointsfor', 280, '280'),
                  statEntry('pointsagainst', 400, '400'),
                  statEntry('pointdifferential', -120, '-120'),
                  statEntry('total', undefined, '5-12'),
                  statEntry('home', undefined, '3-5'),
                  statEntry('vsdiv', undefined, '2-4'),
                  statEntry('vsconf', undefined, '4-8'),
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('parseTeamStats', () => {
  it('parses a full standings entry into a TeamStats record', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.get('12')).toEqual({
      overallWins: 14,
      overallLosses: 3,
      overallTies: 0,
      winPercent: 0.8235294,
      homeWins: 6,
      homeLosses: 3,
      roadWins: 8,
      roadLosses: 0,
      divisionWins: 5,
      divisionLosses: 1,
      conferenceWins: 9,
      conferenceLosses: 3,
      pointsFor: 490,
      pointsAgainst: 320,
      pointDifferential: 170,
      streak: 'W3',
      playoffSeed: 2,
    });
  });

  it('skips a team with no stats array at all', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.has('7')).toBe(false);
  });

  it('skips a team with a partial stats array rather than storing a half-filled row', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.has('9')).toBe(false);
  });

  it('covers exactly the teams with a complete stats block', () => {
    const map = parseTeamStats(STATS_FIXTURE);
    expect(map.size).toBe(1);
  });
});
