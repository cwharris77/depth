import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { colors as uiTokens } from '@/components/ui/tokens';
import { ProseBody, ProseSection } from '@/components/ui/ProseSection';
import { SUPPORT_EMAIL } from '@/lib/utils/legal';

export const metadata: Metadata = {
  title: 'Support · The Sticks',
  description: 'Get help with The Sticks, or reach out with a question or bug report.',
};

// Static support page (App Store Connect requires a Support URL). Shares /privacy's prose
// primitives and the single SUPPORT_EMAIL constant, so the address published here can't
// drift from the one in the legal pages or the iOS Settings → About feedback row.
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

        <div className="mt-6">
          <ProseBody>
            <ProseSection title="Contact us">
              <p className="m-0">
                Questions, bug reports, or feedback — reach us at{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: uiTokens.accent }}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </ProseSection>
            <ProseSection title="Signing in">
              <p className="m-0">
                The Sticks uses a one-time code sent to your email — no password to remember. If a
                code doesn&apos;t arrive, check your spam folder or email us and we&apos;ll help.
              </p>
            </ProseSection>
            <ProseSection title="Deleting your account">
              <p className="m-0">
                You can permanently delete your account from the account page&apos;s Danger Zone.
                This removes your saved depth-chart edits and any shared links immediately.
              </p>
            </ProseSection>
            <ProseSection title="Privacy &amp; terms">
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
            </ProseSection>
          </ProseBody>
        </div>
      </div>
    </main>
  );
}
