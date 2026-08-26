import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';

export const metadata: Metadata = {
  title: 'Terms of service · The Sticks',
  description: 'The terms for using The Sticks, including account use and shared content.',
};

// Static terms-of-service page. Mirrors app/privacy's structure and tokens. Grounded in what
// the app actually does (accounts via Supabase Auth email OTP, user-generated shared depth
// charts, in-app account deletion) — not a substitute for an attorney's review.
export default function TermsPage() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-md px-5 py-12">
        <Link
          href="/signin"
          aria-label="Back to account"
          className="mb-6 flex w-fit items-center gap-1.5 text-sm font-semibold"
          style={{ color: uiTokens.textMuted }}>
          <ArrowLeft size={18} /> Back to account
        </Link>

        <h1 className="text-2xl font-black" style={{ color: uiTokens.textPrimary }}>
          Terms of service
        </h1>
        <p className="mt-1.5 mb-6" style={{ color: uiTokens.textFaint, fontSize: typeScale.body }}>
          Last updated August 2026
        </p>

        <div
          className="flex flex-col gap-4 leading-relaxed"
          style={{ color: '#c5cbd8', fontSize: typeScale.title }}>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Using The Sticks
            </h2>
            <p className="m-0">
              The Sticks is an NFL depth-chart viewer. You can browse team rosters without an
              account. Signing in (via a one-time email code) lets you save a favorite team,
              personal depth-chart reorders, and share them with others.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Your account
            </h2>
            <p className="m-0">
              You&apos;re responsible for the email address you sign in with and for any activity
              under your account. You must be able to access that email to sign in — The Sticks has
              no password to reset.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Shared depth charts
            </h2>
            <p className="m-0">
              If you share a depth chart, anyone with the link can view it. The Sticks&apos;s roster
              and player data comes from public NFL sources and may contain errors or be out of date
              — your reorders reflect your own opinion, not an official source. Don&apos;t use
              shared links to post content that&apos;s abusive, illegal, or infringes someone
              else&apos;s rights; we may remove links that violate this.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              No warranty
            </h2>
            <p className="m-0">
              The Sticks is provided as-is, without warranty of any kind. We don&apos;t guarantee
              the roster data is accurate, complete, or available at all times.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Ending your account
            </h2>
            <p className="m-0">
              You can delete your account at any time from the account page&apos;s Danger Zone,
              which removes your saved edits and shared links. We may suspend or terminate access
              for violations of these terms.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Changes
            </h2>
            <p className="m-0">
              We may update these terms as The Sticks changes. Continued use after an update means
              you accept the revised terms.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Contact
            </h2>
            <p className="m-0">
              Questions — reach us at{' '}
              <a href="mailto:cwharris365@gmail.com" style={{ color: uiTokens.accent }}>
                cwharris365@gmail.com
              </a>
              . See also our{' '}
              <Link href="/privacy" style={{ color: uiTokens.accent }}>
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
