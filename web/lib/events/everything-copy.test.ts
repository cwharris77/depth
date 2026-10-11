import { describe, expect, it } from 'vitest';
import { depthChangeCopy, injuryChangeCopy, rosterTransactionCopy, goodWeekCopy } from './copy';

describe('Everything event facts', () => {
  it('states both source ranks and a removed slot', () => {
    expect(
      depthChangeCopy({
        teamName: 'Seahawks',
        playerName: 'Player B',
        position: 'WR',
        rank: 2,
        previousRank: 3,
      })
    ).toEqual({ headline: 'Seahawks: Player B is now #2 at WR', detail: 'Previously #3.' });
    expect(
      depthChangeCopy({
        teamName: 'Seahawks',
        playerName: 'Player A',
        position: 'WR',
        rank: null,
        previousRank: 4,
      })
    ).toEqual({
      headline: 'Seahawks: Player A is no longer listed at WR',
      detail: 'Previously #4.',
    });
  });
  it('reports injury clearance without a medical claim', () => {
    expect(
      injuryChangeCopy({
        teamName: 'Seahawks',
        playerName: 'Player A',
        designations: [],
        previous: ['Out'],
      })
    ).toEqual({
      headline: 'Seahawks: Player A is no longer listed on the injury report',
      detail: 'Previously Out.',
    });
    expect(
      injuryChangeCopy({
        teamName: 'Seahawks',
        playerName: 'Player A',
        designations: ['Out'],
        previous: ['Questionable'],
      })
    ).toEqual({
      headline: 'Seahawks: Player A is listed as Out',
      detail: 'Previously Questionable.',
    });
  });
  it('preserves the transaction verb and scope', () => {
    expect(
      rosterTransactionCopy({
        teamName: 'Seahawks',
        playerName: 'Player A',
        position: 'WR',
        verb: 'waived',
        scope: 'from injured reserve',
      })
    ).toEqual({ headline: 'Seahawks waived WR Player A', detail: 'From injured reserve.' });
  });
  it('joins qualifying stats in fixed order', () => {
    expect(
      goodWeekCopy({
        playerName: 'Player A',
        week: 5,
        stats: { rushing_yards: 100, passing_tds: 3 },
      })
    ).toEqual({
      headline: 'Player A had 3 passing touchdowns and 100 rushing yards in Week 5',
      detail: null,
    });
  });
});
