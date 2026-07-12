import type { Metadata } from 'next';
import AuthConfirm from '@/components/AuthConfirm';
import { safeNext } from '@/lib/auth-redirect';

export const metadata: Metadata = {
  title: 'Signing in · Depth',
};

// Server wrapper for the magic-link landing (Phase C, auth pass 2). No server data to fetch —
// session tokens arrive in the URL fragment, which only the client can read (see
// components/AuthConfirm.tsx) — so this just validates `next` server-side (same safeNext check
// as /signin) and hands off.
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  return <AuthConfirm next={next} />;
}
