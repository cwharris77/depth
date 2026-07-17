import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AccountView from '@/components/AccountView';
import Logo from '@/components/Logo';
import { MARK_WORDMARK_GAP } from '@/components/DepthMark';
import { dbRosterSource } from '@/lib/roster-source.db';
import { safeNext } from '@/lib/auth-redirect';

export const metadata: Metadata = {
  title: 'Sign in · Depth',
  description: 'Optionally sign in to sync your favorite team and settings across devices.',
};

// Dedicated sign-in / account page (Phase C, auth pass 1), reached from the nav drawer's
// account item. Server component: resolves the team list here (for the favorite picker) and
// hands it to the client AccountView. `next` is the ?next= return path — where the user came
// from — used by the Back arrow below. Sign-in itself no longer navigates (it shows an in-page
// success confirmation), so `next` is only the manual way back out.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  const teams = await dbRosterSource.listTeams();
  const options = teams
    .map((t) => ({ id: t.id, label: `${t.city} ${t.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-md px-5 py-12">
        {/* Explicit back arrow to where the user came from (falls back home) — the primary way
            out of this page, so it isn't a dead end. */}
        <Link
          href={next}
          aria-label="Go back"
          className="mb-6 flex w-fit items-center gap-1.5 text-sm font-semibold"
          style={{ color: '#A5ACAF' }}>
          <ArrowLeft size={18} /> Back
        </Link>
        {/* Logo + wordmark, centered branding. */}
        <Link
          href="/"
          aria-label="Depth home"
          className={`mx-auto mb-8 flex w-fit items-center ${MARK_WORDMARK_GAP}`}>
          <Logo size={36} color="#69BE28" />
          <span className="text-xl font-bold tracking-widest" style={{ color: '#A5ACAF' }}>
            depth
          </span>
        </Link>
        <AccountView teams={options} />
      </div>
    </main>
  );
}
