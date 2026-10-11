const STAGING_SUPABASE_HOST = 'djwrecczgudktgsooxti.supabase.co';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stagingE2EConfig(environment: Record<string, string | undefined>): {
  eventId: string;
} {
  if (environment.PUSH_SENDER_TARGET !== 'staging') {
    throw new Error('PUSH_SENDER_TARGET must be "staging"');
  }
  if (environment.PUSH_SENDER_ENABLED !== 'true') {
    throw new Error('PUSH_SENDER_ENABLED must be "true"');
  }
  const url = environment.SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL is required');
  const host = new URL(url).hostname;
  if (host !== STAGING_SUPABASE_HOST) {
    throw new Error(`refusing staging sender for host ${host}`);
  }
  const eventId = environment.PUSH_EVENT_ID;
  if (!eventId || !UUID.test(eventId)) throw new Error('PUSH_EVENT_ID must be a UUID');
  return { eventId };
}
