import { describe, it, expect } from 'vitest';
import { parseStandings } from './standings';

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
