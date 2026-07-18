import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { colors as uiTokens } from '@/components/ui/tokens';

export const metadata: Metadata = {
  title: 'Privacy policy · Depth',
  description: 'What Depth collects, what it does not, and how to delete your data.',
};

// Static privacy policy page (Phase C, P0 App Store requirement). Copy is grounded in what the
// app actually does (verified against lib/share.ts, the shared_boards migration, and the
// absence of any analytics/tracking dependency) — not a substitute for an actual attorney's
// review, but not a generic template either. Still needs a real contact address before ship.
export default function PrivacyPage() {
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
          Privacy policy
        </h1>
        <p className="mt-1.5 mb-6 text-[12px]" style={{ color: uiTokens.textFaint }}>
          Last updated July 2026
        </p>

        <div
          className="flex flex-col gap-4 text-[13px] leading-relaxed"
          style={{ color: '#c5cbd8' }}>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              What we collect
            </h2>
            <p className="m-0">
              Your email address, used only to sign you in via a one-time code. If you sign in, we
              also store your favorite team, app preferences, and depth-chart edits so they sync
              across your devices. We don&apos;t collect names, payment details, or device
              identifiers.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              Without signing in
            </h2>
            <p className="m-0">
              Your depth-chart edits and last-viewed team are saved in your browser&apos;s local
              storage on your device only — we don&apos;t receive or store them on our servers
              unless you sign in.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              Sharing a depth chart
            </h2>
            <p className="m-0">
              If you share a custom depth chart, anyone with the link can view it, and the part of
              your email before the <span style={{ color: uiTokens.textPrimary }}>@</span> (not your
              full address) is shown publicly as the chart&apos;s owner name. Deleting your account
              removes all your shared links.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              What we don&apos;t do
            </h2>
            <p className="m-0">
              No ads, no analytics or tracking scripts, no data sold or shared with third parties.
              We use Supabase to host our database and handle sign-in.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              Children&apos;s privacy
            </h2>
            <p className="m-0">
              Depth isn&apos;t directed at children under 13, and we don&apos;t knowingly collect
              data from them.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              Deleting your data
            </h2>
            <p className="m-0">
              You can permanently delete your account — including your settings, saved depth-chart
              edits, and shared links — at any time from the account page&apos;s Danger Zone.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: uiTokens.textPrimary }}>
              Contact
            </h2>
            <p className="m-0">
              Questions — reach us at{' '}
              <span style={{ color: uiTokens.accent }}>privacy@[domain]</span>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
