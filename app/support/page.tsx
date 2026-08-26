import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';

export const metadata: Metadata = {
  title: 'Support · The Sticks',
  description: 'Get help with The Sticks, or reach out with a question or bug report.',
};

// Static support page (App Store Connect requires a Support URL). Mirrors app/privacy's
// structure and tokens.
export default function SupportPage() {
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
          Support
        </h1>

        <div
          className="mt-6 flex flex-col gap-4 leading-relaxed"
          style={{ color: '#c5cbd8', fontSize: typeScale.title }}>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Contact us
            </h2>
            <p className="m-0">
              Questions, bug reports, or feedback — reach us at{' '}
              <a href="mailto:cwharris365@gmail.com" style={{ color: uiTokens.accent }}>
                cwharris365@gmail.com
              </a>
              .
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Signing in
            </h2>
            <p className="m-0">
              The Sticks uses a one-time code sent to your email — no password to remember. If a code
              doesn&apos;t arrive, check your spam folder or email us and we&apos;ll help.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Deleting your account
            </h2>
            <p className="m-0">
              You can permanently delete your account from the account page&apos;s Danger Zone. This
              removes your saved depth-chart edits and any shared links immediately.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
              Privacy &amp; terms
            </h2>
            <p className="m-0">
              See our{' '}
              <Link href="/privacy" style={{ color: uiTokens.accent }}>
                privacy policy
              </Link>{' '}
              for what we collect and how it&apos;s used, or our{' '}
              <Link href="/terms" style={{ color: uiTokens.accent }}>
                terms of service
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
