import { expect, it } from 'vitest';
import { assertFixtureHost, fixtureEventKeys } from './fixture-replay';
it('refuses production and validates the actual URL', () => {
  for (const host of ['localhost', '127.0.0.1', 'djwrecczgudktgsooxti.supabase.co'])
    expect(() => assertFixtureHost(`https://${host}`)).not.toThrow();
  for (const url of [
    'https://production.supabase.co',
    'https://djwrecczgudktgsooxti.supabase.co.attacker.test',
    'invalid',
  ])
    expect(() => assertFixtureHost(url)).toThrow();
});
it('uses exact protected identities for good and historic fixture events', () => {
  expect(fixtureEventKeys('seahawks', '1')).toEqual({
    historic: 'historic_week:rushing_yards:1900:1:1',
    good: 'good_week:1900:1:seahawks:1',
  });
});
