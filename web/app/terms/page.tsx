import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';
import { ProseBody, ProseList, ProseSection } from '@/components/ui/ProseSection';
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from '@/lib/utils/legal';

export const metadata: Metadata = {
  title: 'Terms of service · The Sticks',
  description: 'The terms for using The Sticks, including account use and shared content.',
};

// Static terms-of-service page. Structure follows the General Legal CC0 attorney-drafted
// Terms of Use template's section checklist; the prose is Depth-specific because the app has
// no payments, subscriptions, or third-party advertising for the template's corresponding
// sections to describe.
//
// Two of the template's sections are deliberately ABSENT, both by explicit decision
// (2026-08-28) rather than oversight — do not "restore" them as a completeness fix:
//   1. Binding arbitration + class-action waiver. Omitted: the app is free, so class
//      exposure is minimal, and a valid clause needs a published notice/opt-out mailing
//      address, which for a sole proprietor means a home address.
//   2. The California Civil Code §1789.3 consumer notice. Omitted for the same
//      address-exposure reason; §1789.3 is aimed at paid subscription services.
// Adding either back is a legal decision, not a formatting one.
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
          Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <ProseBody>
          <ProseSection title="Agreement">
            <p className="m-0">
              The Sticks — the iPhone app and this website — is operated by Cooper Harris, an
              individual (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;). By using it, you
              agree to these terms. If you don&apos;t agree, please don&apos;t use it.
            </p>
          </ProseSection>

          <ProseSection title="Not affiliated with the NFL">
            <p className="m-0">
              The Sticks is not endorsed by or affiliated with the National Football League. Any
              trademarks used in the app are used solely to identify the respective entities and
              remain the property of their respective owners.
            </p>
            <p className="m-0">
              Player, roster, and schedule information comes from publicly available sources and is
              provided for informational purposes only. It may be incomplete, out of date, or wrong.
              Depth-chart orderings you create are your own opinion, not an official team depth
              chart.
            </p>
          </ProseSection>

          <ProseSection title="Who can use The Sticks">
            <p className="m-0">
              You must be at least 13 years old to use The Sticks. If you are under 18, you may use
              it only with the involvement of a parent or guardian.
            </p>
          </ProseSection>

          <ProseSection title="Your account">
            <p className="m-0">
              You can browse every team&apos;s depth chart without an account. Signing in — with a
              one-time code sent to your email — lets you save a favorite team, save depth-chart
              reorders, and share them.
            </p>
            <p className="m-0">
              There is no password, so access to your account is access to your email. You&apos;re
              responsible for keeping that email account secure and for activity under your account.
              Tell us promptly if you think someone else has gotten in. You can delete your account
              at any time from the account page; our{' '}
              <Link href="/privacy" style={{ color: uiTokens.accent }}>
                privacy policy
              </Link>{' '}
              describes exactly what deletion removes.
            </p>
          </ProseSection>

          <ProseSection title="Using The Sticks">
            <p className="m-0">
              We grant you a limited, non-exclusive, non-transferable, revocable license to use The
              Sticks for your own personal, non-commercial use. You agree not to:
            </p>
            <ProseList>
              <li>scrape, bulk-download, or systematically extract data from the service;</li>
              <li>resell, redistribute, or commercially exploit the service or its content;</li>
              <li>
                reverse-engineer or decompile any part of it, except where that restriction is
                prohibited by law;
              </li>
              <li>use it to build a competing product;</li>
              <li>interfere with, overload, or attempt to gain unauthorized access to it;</li>
              <li>use it in violation of any law.</li>
            </ProseList>
            <p className="m-0">
              We may change, suspend, or discontinue any part of the service at any time, and
              we&apos;re not obligated to provide support — though we try.
            </p>
          </ProseSection>

          <ProseSection title="Content you create and share">
            <p className="m-0">
              You keep ownership of the depth-chart orderings you create. By creating a share link,
              you grant us the limited license needed to host that content and display it to anyone
              who has the link — that&apos;s simply what sharing does. Remember that a share link is
              public, and that the part of your email address before the @ appears publicly as the
              owner name; the privacy policy covers this in detail.
            </p>
            <p className="m-0">
              Don&apos;t use share links to distribute content that is unlawful, abusive, harassing,
              hateful, deceptive, or infringing. We may remove any share link or suspend an account
              for violating these terms, though we have no obligation to monitor shared content.
            </p>
          </ProseSection>

          <ProseSection title="Feedback">
            <p className="m-0">
              If you send us suggestions or feedback, we may use them freely, without compensation
              or attribution. Please don&apos;t send us anything you consider confidential.
            </p>
          </ProseSection>

          <ProseSection title="Our intellectual property">
            <p className="m-0">
              The service&apos;s software, design, original artwork — including the app&apos;s
              uniform illustrations — and branding are owned by us or our licensors. These terms
              don&apos;t transfer any ownership to you. Third-party marks shown in the app belong to
              their owners, as noted above.
            </p>
          </ProseSection>

          <ProseSection title="No warranty">
            <p className="m-0">
              The Sticks is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
              warranties of any kind, express or implied, including merchantability, fitness for a
              particular purpose, title, and non-infringement. We don&apos;t warrant that the
              service will be uninterrupted, secure, or error-free, or that any roster, statistical,
              or schedule information is accurate, complete, or current. Some jurisdictions
              don&apos;t allow these exclusions, so parts of this section may not apply to you.
            </p>
          </ProseSection>

          <ProseSection title="Limitation of liability">
            <p className="m-0">
              To the maximum extent permitted by law, we will not be liable for any indirect,
              incidental, special, consequential, exemplary, or punitive damages, or for lost
              profits or lost data, arising from your use of the service. Our total liability for
              all claims is limited to the greater of the amount you paid us in the six months
              before the claim arose and fifty U.S. dollars ($50). The Sticks is free, so in most
              cases that is $50. Some jurisdictions don&apos;t allow these limitations, so parts of
              this section may not apply to you.
            </p>
          </ProseSection>

          <ProseSection title="Indemnification">
            <p className="m-0">
              You agree to indemnify and hold us harmless from claims, damages, and reasonable costs
              arising out of your use of the service, your violation of these terms, or your
              violation of any law or third-party right.
            </p>
          </ProseSection>

          <ProseSection title="Termination">
            <p className="m-0">
              These terms apply as long as you use the service. You may stop at any time and delete
              your account. We may suspend or terminate access if you violate these terms or if we
              discontinue the service. Sections that by their nature should survive — intellectual
              property, disclaimers, limitation of liability, and indemnification — will survive.
            </p>
          </ProseSection>

          <ProseSection title="Governing law">
            <p className="m-0">
              These terms are governed by the laws of the State of Arizona, without regard to its
              conflict-of-law rules. Any dispute will be brought exclusively in the state or federal
              courts located in Maricopa County, Arizona, and you consent to their jurisdiction.
              Either party may still bring an individual claim in small claims court, or seek
              injunctive relief to protect intellectual property, in any court of competent
              jurisdiction.
            </p>
          </ProseSection>

          <ProseSection title="Changes">
            <p className="m-0">
              We may update these terms as the service changes. If a change is material, we&apos;ll
              update the effective date above and post notice before it takes effect. Continuing to
              use the service after that means you accept the updated terms.
            </p>
          </ProseSection>

          <ProseSection title="General">
            <p className="m-0">
              These terms, together with the{' '}
              <Link href="/privacy" style={{ color: uiTokens.accent }}>
                privacy policy
              </Link>
              , are the entire agreement between you and us regarding the service. If any provision
              is found unenforceable, it will be limited to the minimum extent necessary and the
              rest stays in effect. Our failure to enforce a provision isn&apos;t a waiver of it.
              You may not assign these terms; we may assign them freely. You consent to receive
              communications from us electronically, including sign-in codes and notices about these
              terms.
            </p>
          </ProseSection>

          <ProseSection title="Contact">
            <p className="m-0">
              Questions — reach us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: uiTokens.accent }}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </ProseSection>
        </ProseBody>
      </div>
    </main>
  );
}
