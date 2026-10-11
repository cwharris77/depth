// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { stagingE2EConfig } from './staging-e2e';

const STAGING_URL = 'https://djwrecczgudktgsooxti.supabase.co';

describe('stagingE2EConfig', () => {
  it('permits one enabled staging send for an exact fixture event', () => {
    expect(
      stagingE2EConfig({
        SUPABASE_URL: STAGING_URL,
        PUSH_SENDER_TARGET: 'staging',
        PUSH_SENDER_ENABLED: 'true',
        PUSH_EVENT_ID: '00000000-0000-4000-8000-000000000001',
      })
    ).toEqual({ eventId: '00000000-0000-4000-8000-000000000001' });
  });

  it.each([
    [{ PUSH_SENDER_TARGET: 'production' }, 'PUSH_SENDER_TARGET must be "staging"'],
    [{ SUPABASE_URL: 'https://production.example.com' }, 'refusing staging sender for host'],
    [{ PUSH_SENDER_ENABLED: 'false' }, 'PUSH_SENDER_ENABLED must be "true"'],
    [{ PUSH_EVENT_ID: 'not-an-event-id' }, 'PUSH_EVENT_ID must be a UUID'],
  ])('rejects unsafe configuration %#', (override, message) => {
    expect(() =>
      stagingE2EConfig({
        SUPABASE_URL: STAGING_URL,
        PUSH_SENDER_TARGET: 'staging',
        PUSH_SENDER_ENABLED: 'true',
        PUSH_EVENT_ID: '00000000-0000-4000-8000-000000000001',
        ...override,
      })
    ).toThrow(message);
  });
});
