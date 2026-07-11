import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy policy · Depth',
  description: 'What Depth collects, what it does not, and how to delete your data.',
};

// Static privacy policy page (Phase C, P0 App Store requirement). Placeholder copy — pending
// legal review, per the account/settings redesign handoff brief.
export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-md px-5 py-12">
        <Link
          href="/signin"
          aria-label="Back to account"
          className="mb-6 flex w-fit items-center gap-1.5 text-sm font-semibold"
          style={{ color: '#A5ACAF' }}>
          <ArrowLeft size={18} /> Back to account
        </Link>

        <h1 className="text-2xl font-black" style={{ color: '#f0f4ff' }}>
          Privacy policy
        </h1>
        <p className="mt-1.5 mb-6 text-[12px]" style={{ color: '#5b6478' }}>
          Last updated July 2026 · placeholder copy, pending legal review
        </p>

        <div className="flex flex-col gap-4 text-[13px] leading-relaxed" style={{ color: '#c5cbd8' }}>
          <div>
            <div className="mb-1 text-[13px] font-bold" style={{ color: '#f0f4ff' }}>
              What we collect
            </div>
            <p className="m-0">
              Your email address, used only to sign you in via a one-time code or link. We
              don&apos;t collect names, payment details, or device identifiers.
            </p>
          </div>
          <div>
            <div className="mb-1 text-[13px] font-bold" style={{ color: '#f0f4ff' }}>
              Your settings
            </div>
            <p className="m-0">
              If you sign in, we store your favorite team and app preferences so they sync
              across your devices. Signed-out use stores nothing.
            </p>
          </div>
          <div>
            <div className="mb-1 text-[13px] font-bold" style={{ color: '#f0f4ff' }}>
              What we don&apos;t do
            </div>
            <p className="m-0">No ads, no trackers, no data sold or shared with third parties.</p>
          </div>
          <div>
            <div className="mb-1 text-[13px] font-bold" style={{ color: '#f0f4ff' }}>
              Deleting your data
            </div>
            <p className="m-0">
              You can permanently delete your account and all associated data at any time from
              the account page&apos;s Danger Zone.
            </p>
          </div>
          <div>
            <div className="mb-1 text-[13px] font-bold" style={{ color: '#f0f4ff' }}>
              Contact
            </div>
            <p className="m-0">
              Questions — reach us at <span style={{ color: '#69BE28' }}>privacy@[domain]</span>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
