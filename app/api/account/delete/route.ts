// Rollback-window compatibility adapter for account deletion. The web client proxies its
// signed-in JWT to the same fresh-OTP Edge Function as native iOS so no legacy route can
// bypass the destructive-action reauthentication boundary.
import { getServerClient } from '@/lib/supabase/server';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/utils/env';

export async function POST() {
  try {
    const supabase = await getServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/account-delete`, {
      method: 'POST',
      headers: {
        apikey: getSupabaseAnonKey(),
        authorization: `Bearer ${session.access_token}`,
      },
    });
    return new Response(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return Response.json({ error: 'delete failed' }, { status: 500 });
  }
}
