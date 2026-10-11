import { describe, expect, it } from 'vitest';
import sample from './fixtures/everything-transactions.json';
import { rosterTransactionEvents, normalizeName } from './transactions';
const base = {
  teamIdByEspnId: new Map([['26', 'seahawks']]),
  teams: [{ id: 'seahawks', city: 'Seattle', name: 'Seahawks' }],
  playerIdByName: new Map([[normalizeName('A.J. Brown'), '42']]),
  now: '2026-10-10T15:00Z',
};
const events = (description: string, date = '2026-10-10T07:00Z') =>
  rosterTransactionEvents({ ...base, transactions: [{ description, date, team: { id: '26' } }] });
describe('explicit roster moves', () => {
  it.each(['Signed', 'SIgned', 'Re-signed', 'Re-Signed'])(
    'detects %s without guessed identity',
    (verb) => {
      const e = events(`${verb} WR A.J. Brown to the practice squad.`);
      expect(e).toHaveLength(1);
      expect(e[0].playerId).toBe('42');
      expect(e[0].type).toBe('signing');
      expect(e[0].detail).toBe('To the practice squad.');
    }
  );
  it('retains positions and suffixes across several waived players', () => {
    const e = events('Waived WR Kevin Austin Jr. and CB Decamerion Richardson.');
    expect(e.map((x) => x.payload.player_name)).toEqual([
      'Kevin Austin Jr.',
      'Decamerion Richardson',
    ]);
    expect(e.map((x) => x.payload.position)).toEqual(['WR', 'CB']);
    expect(e.every((x) => x.playerId === null && x.type === 'cut')).toBe(true);
  });
  it('supports a plural position list', () => {
    expect(
      events('Released WRs A.J. Brown, Kevin Austin Jr. and Bryce Oliver.').map(
        (x) => x.payload.player_name
      )
    ).toEqual(['A.J. Brown', 'Kevin Austin Jr.', 'Bryce Oliver']);
  });
  it.each([
    'Elevated WR A.J. Brown from the practice squad.',
    'Reverted WR A.J. Brown to the practice squad.',
    'Signed coach John Smith.',
    'Traded WR A.J. Brown to Dallas.',
    'Signed their draft picks.',
    'Claimed WR A.J. Brown off waivers.',
  ])('ignores unsupported %s', (text) => {
    expect(events(text)).toEqual([]);
  });
  it('dedupes same moves but keeps opposite verbs separate', () => {
    expect(
      events('Signed WR A.J. Brown. Signed WR A.J. Brown. Waived WR A.J. Brown.').map((x) => x.type)
    ).toEqual(['signing', 'cut']);
  });
  it.each(['invalid', '2026-10-11T07:00Z', '2026-10-01T07:00Z'])(
    'rejects unnewsworthy date %s',
    (date) => {
      expect(events('Signed WR A.J. Brown.', date)).toEqual([]);
    }
  );
  it('supports terminated contracts and preserves injury scope', () => {
    expect(events('Terminated the contract of WR A.J. Brown.')[0].headline).toBe(
      'Seahawks terminated the contract of WR A.J. Brown'
    );
    expect(
      events('Waived WR A.J. Brown from injured reserve with an injuy settlemant.')[0].detail
    ).toBe('From injured reserve with an injuy settlemant.');
  });
});

it('replays the minimized live page with stable identities and explicit scope', () => {
  const ids = [...new Set(sample.map((t) => t.team.id).filter((id): id is string => Boolean(id)))];
  const now = new Date(Math.max(...sample.map((t) => Date.parse(t.date)))).toISOString();
  const args = {
    transactions: sample,
    teamIdByEspnId: new Map(ids.map((id) => [id, id])),
    teams: ids.map((id) => ({ id, name: `Team ${id}`, city: `City ${id}` })),
    playerIdByName: new Map(),
    now,
  };
  const found = rosterTransactionEvents(args);
  expect(found.length).toBeGreaterThan(0);
  expect(new Set(found.map((e) => e.dedupeKey)).size).toBe(found.length);
  expect(found.every((e) => e.tier === 'everything' && ['signing', 'cut'].includes(e.type))).toBe(
    true
  );
  expect(rosterTransactionEvents(args)).toEqual(found);
});
