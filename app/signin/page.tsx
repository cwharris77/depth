import type { Metadata } from 'next';
import Link from 'next/link';
import AccountView from '@/components/AccountView';
import Logo from '@/components/Logo';
import { dbRosterSource } from '@/lib/roster-source.db';

export const metadata: Metadata = {
  title: 'Sign in · Depth',
  description: 'Optionally sign in to sync your favorite team and settings across devices.',
};

// Dedicated sign-in / account page (Phase C, auth pass 1), reached from the nav drawer's
// account item. Server component: resolves the team list here (for the favorite picker)
// and hands it to the client AccountView, which owns the auth + settings interaction.
export default async function SignInPage() {
  const teams = await dbRosterSource.listTeams();
  const options = teams
    .map((t) => ({ id: t.id, label: `${t.city} ${t.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-md px-5 py-12">
        {/* Large centered logo — links home so it doubles as a way back. */}
        <Link
          href="/"
          aria-label="Back to depth charts"
          className="mx-auto mb-8 flex w-fit flex-col items-center gap-2">
          <Logo size={44} color="#69BE28" />
          <span className="text-sm font-bold tracking-widest" style={{ color: '#A5ACAF' }}>
            depth
          </span>
        </Link>
        <AccountView teams={options} />
      </div>
    </main>
  );
}
