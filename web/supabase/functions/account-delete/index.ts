// Narrow privileged adapter for native account deletion. The platform verifies the user
// JWT before invocation; this handler verifies it again to read its subject and AMR claim,
// then exposes the service-role client only to the single admin delete operation.
import { createClient } from '@supabase/supabase-js';
import { handleAccountDeletion } from './handler.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const supabaseUrl = requiredEnvironmentValue('SUPABASE_URL');
const publishableKey = requiredEnvironmentValue('SUPABASE_ANON_KEY');
const serviceRoleKey = requiredEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY');

const authClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

Deno.serve((request) =>
  handleAccountDeletion(request, {
    nowSeconds: () => Math.floor(Date.now() / 1_000),
    newCorrelationId: () => crypto.randomUUID(),
    verifyJwt: async (jwt) => {
      const { data, error } = await authClient.auth.getClaims(jwt);
      if (error || !data?.claims) throw error ?? new Error('JWT claims unavailable');
      return { sub: data.claims.sub, amr: data.claims.amr };
    },
    deleteUser: async (userId) => {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  })
);

function requiredEnvironmentValue(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
