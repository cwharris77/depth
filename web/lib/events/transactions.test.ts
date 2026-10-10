import { describe, expect, it } from 'vitest';
import {
  buildNameIndex,
  normalizeName,
  resolveTradeTeam,
  splitSentences,
  tradedPlayers,
  tradeEvents,
  type EspnTransaction,
} from './transactions';

const PHI =
  'Traded G Cam Jurgens and a conditional 2027 seventh-round pick to Baltimore in exchange for a 2027 fifth-round pick and a 2028 second-round pick. Signed C James Brockermeyer and WR Erik Ezukanma to the practice squad. Signed RB Dameon Pierce from the practice squad.';
const PIT =
  'Signed DB Doneiko Slaughter to the practice squad. Traded CB Joey Porter Jr. to Dallas in exchange for a 2027 sixth-round pick and a 2028 second-round pick.';
const BAL =
  'Traded a 2027 fifth-round pick and a 2028 second-round pick to Philadelphia Eagles for G Cam Jurgens and a conditional 2027 seventh-round pick.';

describe('splitSentences', () => {
  it('splits before each transaction verb', () => {
    expect(splitSentences(PHI)).toHaveLength(3);
    expect(splitSentences(PHI)[0]).toMatch(/^Traded G Cam Jurgens/);
  });

  it('does not split inside a name with initials or a suffix', () => {
    const text = 'Traded WR A.J. Brown to Denver. Signed QB John Doe Jr. Waived K Sam Lee.';
    expect(splitSentences(text)).toEqual([
      'Traded WR A.J. Brown to Denver',
      'Signed QB John Doe Jr.',
      'Waived K Sam Lee',
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(splitSentences('')).toEqual([]);
  });
});

describe('tradedPlayers', () => {
  it('reads an outgoing player and ignores the picks', () => {
    expect(tradedPlayers(PHI)).toEqual([{ direction: 'out', position: 'G', name: 'Cam Jurgens' }]);
  });

  it('keeps a suffix and finds a trade that is not the first sentence', () => {
    expect(tradedPlayers(PIT)).toEqual([
      { direction: 'out', position: 'CB', name: 'Joey Porter Jr.' },
    ]);
  });

  it('reads an incoming player after the for clause', () => {
    expect(tradedPlayers(BAL)).toEqual([{ direction: 'in', position: 'G', name: 'Cam Jurgens' }]);
  });

  it('reads players on both sides of one trade', () => {
    expect(tradedPlayers('Traded WR A.J. Brown to Denver for CB Pat Surtain II.')).toEqual([
      { direction: 'out', position: 'WR', name: 'A.J. Brown' },
      { direction: 'in', position: 'CB', name: 'Pat Surtain II' },
    ]);
  });

  it('reads an acquisition as incoming', () => {
    expect(
      tradedPlayers('Acquired QB Sam Howell from Seattle in exchange for a 2027 sixth-round pick.')
    ).toEqual([{ direction: 'in', position: 'QB', name: 'Sam Howell' }]);
  });

  it('returns nothing for a pick-only trade or a non-trade entry', () => {
    expect(
      tradedPlayers('Traded a 2027 fifth-round pick to Dallas for a 2028 fourth-round pick.')
    ).toEqual([]);
    expect(tradedPlayers('Signed WR Erik Ezukanma to the practice squad.')).toEqual([]);
    expect(tradedPlayers('')).toEqual([]);
  });
});

describe('buildNameIndex', () => {
  it('maps a normalized name to its id and a shared name to null', () => {
    const index = buildNameIndex([
      { id: '1', name: 'Cam Jurgens' },
      { id: '2', name: 'Josh Allen' },
      { id: '3', name: 'Josh Allen' },
    ]);
    expect(index.get(normalizeName('cam  JURGENS'))).toBe('1');
    expect(index.get(normalizeName('Josh Allen'))).toBeNull();
  });

  it('ignores punctuation and case', () => {
    expect(normalizeName("Ja'Marr Chase")).toBe(normalizeName('JaMarr chase'));
    expect(normalizeName('Joey Porter Jr.')).toBe('joeyporterjr');
  });
});

const TEAMS = [
  { id: 'eagles', city: 'Philadelphia', name: 'Eagles' },
  { id: 'ravens', city: 'Baltimore', name: 'Ravens' },
  { id: 'steelers', city: 'Pittsburgh', name: 'Steelers' },
  { id: 'cowboys', city: 'Dallas', name: 'Cowboys' },
  { id: 'giants', city: 'New York', name: 'Giants' },
  { id: 'jets', city: 'New York', name: 'Jets' },
  { id: '49ers', city: 'San Francisco', name: '49ers' },
];

describe('resolveTradeTeam', () => {
  it('resolves a city, a full name, or an abbreviated city with the nickname', () => {
    expect(resolveTradeTeam('Dallas', TEAMS)).toBe('cowboys');
    expect(resolveTradeTeam('Philadelphia Eagles', TEAMS)).toBe('eagles');
    expect(resolveTradeTeam('N.Y. Giants', TEAMS)).toBe('giants');
    expect(resolveTradeTeam('San Francisco 49ers', TEAMS)).toBe('49ers');
  });

  it('refuses a city two teams share and anything unknown', () => {
    expect(resolveTradeTeam('New York', TEAMS)).toBeNull();
    expect(resolveTradeTeam('Mars', TEAMS)).toBeNull();
    expect(resolveTradeTeam('', TEAMS)).toBeNull();
  });
});

describe('tradeEvents', () => {
  const NOW = '2026-10-09T15:00:00.000Z';
  const base = {
    teamIdByEspnId: new Map([
      ['21', 'eagles'],
      ['33', 'ravens'],
    ]),
    teams: TEAMS,
    playerIdByName: buildNameIndex([{ id: '4429', name: 'Cam Jurgens' }]),
    now: NOW,
  };
  const tx = (id: string, description: string, date = '2026-10-07T07:00Z'): EspnTransaction => ({
    date,
    description,
    team: { id },
  });

  it('writes one event per team per traded player', () => {
    const events = tradeEvents({ ...base, transactions: [tx('21', PHI), tx('33', BAL)] });
    expect(events).toEqual([
      {
        dedupeKey: 'trade:eagles:2026-10-07:out:camjurgens',
        type: 'trade',
        tier: 'big_moments',
        teamId: 'eagles',
        playerId: '4429',
        headline: 'Eagles traded G Cam Jurgens',
        detail: null,
        payload: { direction: 'out', position: 'G', player_name: 'Cam Jurgens' },
        source: 'espn_transactions',
        occurredAt: '2026-10-07T07:00:00.000Z',
      },
      {
        dedupeKey: 'trade:ravens:2026-10-07:in:camjurgens',
        type: 'trade',
        tier: 'big_moments',
        teamId: 'ravens',
        playerId: '4429',
        headline: 'Ravens acquired G Cam Jurgens',
        detail: null,
        payload: { direction: 'in', position: 'G', player_name: 'Cam Jurgens' },
        source: 'espn_transactions',
        occurredAt: '2026-10-07T07:00:00.000Z',
      },
    ]);
  });

  it('writes the other club an event when the feed has no entry for it', () => {
    const events = tradeEvents({
      ...base,
      teamIdByEspnId: new Map([['23', 'steelers']]),
      transactions: [tx('23', PIT)],
    });
    expect(events.map((event) => [event.teamId, event.headline])).toEqual([
      ['steelers', 'Steelers traded CB Joey Porter Jr.'],
      ['cowboys', 'Cowboys acquired CB Joey Porter Jr.'],
    ]);
    expect(events[1].dedupeKey).toBe('trade:cowboys:2026-10-07:in:joeyporterjr');
  });

  it('writes no mirrored event when the other club cannot be resolved', () => {
    const events = tradeEvents({
      ...base,
      transactions: [tx('21', 'Traded G Cam Jurgens to New York for a 2027 fifth-round pick.')],
    });
    expect(events.map((event) => event.teamId)).toEqual(['eagles']);
  });

  it('leaves playerId null when the name is unknown', () => {
    const events = tradeEvents({
      ...base,
      playerIdByName: new Map(),
      transactions: [tx('21', PHI)],
    });
    expect(events[0].playerId).toBeNull();
    expect(events[0].headline).toBe('Eagles traded G Cam Jurgens');
  });

  it('skips entries older than the window, for an unknown team, or with a bad date', () => {
    expect(
      tradeEvents({
        ...base,
        transactions: [
          tx('21', PHI, '2026-09-20T07:00Z'),
          tx('999', PHI),
          tx('21', PHI, 'not a date'),
          { date: '2026-10-07T07:00Z', description: PHI },
        ],
      })
    ).toEqual([]);
  });

  it('produces identical events when the same feed is read twice', () => {
    const args = { ...base, transactions: [tx('21', PHI)] };
    expect(tradeEvents({ ...args, now: '2026-10-09T20:00:00.000Z' })).toEqual(tradeEvents(args));
  });
});
