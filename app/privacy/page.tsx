import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';
import { ProseBody, ProseList, ProseSection } from '@/components/ui/ProseSection';
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from '@/lib/utils/legal';

export const metadata: Metadata = {
  title: 'Privacy policy · The Sticks',
  description: 'What The Sticks collects, what it does not, and how to delete your data.',
};

// Static privacy policy page (App Store submission requirement — App Store Connect needs a
// reachable Privacy Policy URL, and the iOS app links here from Settings → About).
//
// Copy is grounded in what the app actually does, verified against the code rather than
// adapted from a template: the share-link email exposure (supabase/migrations/
// 20260710130000_shared_boards.sql's denormalized `owner_name`), the cascade behavior of
// account deletion (the `on delete cascade` FKs on user_settings/depth_overrides/
// shared_boards), the iOS-only analytics counters (docs/ios-privacy-telemetry.md and
// ios/Depth/Support/AppEventsRecorder.swift), and the IP-keyed search rate limiter
// (lib/utils/rate-limit.ts). Structure follows the General Legal CC0 attorney-drafted
// template's section checklist; the prose is Depth-specific because the template describes
// practices this app does not have (ads, payments, marketing, geolocation).
//
// IMPORTANT: the analytics section is not optional garnish — ios/Depth/PrivacyInfo.xcprivacy
// declares NSPrivacyCollectedDataTypeProductInteraction, so a policy claiming "no analytics"
// directly contradicts the manifest Apple reads. Keep the two in sync.
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
        <p className="mt-1.5 mb-6" style={{ color: uiTokens.textFaint, fontSize: typeScale.body }}>
          Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <ProseBody>
          <ProseSection title="The short version">
            <p className="m-0">
              You can browse every team&apos;s depth chart without an account, and without sending
              us anything. If you sign in, we store your email address and the things you save —
              your favorite team, your depth-chart edits, and any share links you create. We show no
              ads, run no advertising or tracking SDKs, and never sell or share your personal
              information. You can delete your account and everything attached to it from inside the
              app at any time.
            </p>
          </ProseSection>

          <ProseSection title="Who we are">
            <p className="m-0">
              The Sticks is an NFL depth-chart app for iPhone and the web, operated by Cooper
              Harris, an individual. This policy covers both the app and the website.
            </p>
          </ProseSection>

          <ProseSection title="Browsing without an account">
            <p className="m-0">
              Nothing about you reaches our servers. Your depth-chart edits, last-viewed team,
              uniform selection, and dismissed hints are stored only on your own device — in your
              browser&apos;s local storage on the web, and in app preferences on iPhone. We
              can&apos;t read any of it. The iPhone app also caches public roster and schedule data
              so it works offline; that cache holds team and player information, never anything
              about you.
            </p>
          </ProseSection>

          <ProseSection title="If you sign in">
            <p className="m-0">
              Signing in uses a one-time code sent to your email. We store that address because it{' '}
              <em>is</em> your account — there is no password and no username. We do not collect
              your name, phone number, mailing address, date of birth, payment details, or any
              government identifier. While signed in, we also store:
            </p>
            <ProseList>
              <li>
                your favorite team, last-viewed team, and whether the app opens on your favorite;
              </li>
              <li>your depth-chart reorders, per team and position;</li>
              <li>any share links you create, including the team shared and the date created.</li>
            </ProseList>
          </ProseSection>

          <ProseSection title="Anonymous usage counters (iPhone app only)">
            <p className="m-0">
              The iPhone app records a small, fixed set of counters so we can tell whether the app
              is working: app launches, depth charts loaded, sign-in started, sign-in completed, an
              edit saved, and errors. An error record carries only a general category — such as
              &ldquo;offline&rdquo; or &ldquo;server&rdquo; — never a message, a stack trace, or any
              free text.
            </p>
            <p className="m-0">
              These records contain no user ID, device ID, session ID, email address, IP address,
              location, or advertising identifier. That isn&apos;t a promise about how we behave:
              the database table has no column capable of holding any of it. Two events cannot be
              connected to each other, to a device, or to a person — including by us. The website
              records no analytics at all and loads no third-party scripts.
            </p>
          </ProseSection>

          <ProseSection title="Technical data">
            <p className="m-0">
              Like any internet service, our hosting and database providers process technical data —
              including IP addresses — to deliver and secure the service. We also apply a
              short-lived, in-memory rate limit to the public player-search endpoint, keyed on the
              requesting IP address, to prevent abuse. Those entries expire on their own, are never
              written to a database, and are never associated with an account.
            </p>
          </ProseSection>

          <ProseSection title="Crash reports">
            <p className="m-0">
              We ship no crash-reporting SDK. If you enable Settings → Privacy &amp; Security →
              Analytics &amp; Improvements → Share With App Developers on your iPhone, Apple
              collects crash logs and makes them available to us through App Store Connect. That is
              Apple&apos;s pipeline under Apple&apos;s terms — the data never passes through our
              servers, and the app cannot see, change, or override your choice.
            </p>
          </ProseSection>

          <ProseSection title="What we don't do">
            <ProseList>
              <li>No advertising, ad networks, or advertising identifiers.</li>
              <li>No third-party analytics, attribution, or crash SDKs.</li>
              <li>No tracking of you across other apps or websites, by us or anyone else.</li>
              <li>No location collection, precise or coarse.</li>
              <li>No access to your contacts, photos, microphone, or camera.</li>
              <li>No sale of personal information, and no sharing of it for advertising.</li>
              <li>No use of your information to train AI models.</li>
            </ProseList>
          </ProseSection>

          <ProseSection title="Sharing a depth chart">
            <p className="m-0">
              When you create a share link, anyone who has the link can view that depth chart
              without signing in, and{' '}
              <span style={{ color: uiTokens.textPrimary }}>
                the portion of your email address before the @ is displayed publicly
              </span>{' '}
              as the chart&apos;s owner name. For example, jane.doe@example.com appears as
              &ldquo;jane.doe&rdquo;. Your full address is never shown.
            </p>
            <p className="m-0">
              A share link stays live: it always resolves to whatever you currently have saved for
              that team, so it keeps updating as you keep editing. Deleting the link, or deleting
              your account, removes it. Once a link exists, others can copy, screenshot, or archive
              what it shows — so don&apos;t share a chart you wouldn&apos;t want public.
            </p>
          </ProseSection>

          <ProseSection title="How we use your information">
            <p className="m-0">We use what we collect only to:</p>
            <ProseList>
              <li>sign you in and keep you signed in;</li>
              <li>save and sync your preferences and depth-chart edits across your devices;</li>
              <li>resolve share links you create;</li>
              <li>understand whether core flows work, using the anonymous counters above;</li>
              <li>keep the service secure and prevent abuse;</li>
              <li>respond when you contact us for support, and comply with the law.</li>
            </ProseList>
            <p className="m-0">
              We send no promotional email. The only email we send is your sign-in code, plus a
              reply if you write to us.
            </p>
          </ProseSection>

          <ProseSection title="Who we share it with">
            <p className="m-0">
              We do not sell your information or share it for advertising. We disclose it only to
              Supabase (our database and authentication provider), Vercel (our website host), and
              Apple (App Store distribution and, if you opt in, crash reports). Each acts as a
              service provider processing data on our instructions, not for its own purposes.
            </p>
            <p className="m-0">
              We may also disclose information if legally required, or to protect our rights or
              someone&apos;s safety. If we are ever involved in a sale of the business, your
              information may transfer as part of it. Roster and schedule information is drawn from
              public sources — that is data flowing in about NFL players, not user data flowing out.
            </p>
          </ProseSection>

          <ProseSection title="How long we keep it">
            <p className="m-0">
              Account data is kept until you delete your account. If you stop using the app without
              deleting it, the data stays until you do. The anonymous counters are retained in
              aggregate; because they cannot be linked to any person, deleting your account
              doesn&apos;t remove them, and there is nothing in them to identify.
            </p>
          </ProseSection>

          <ProseSection title="Deleting your account">
            <p className="m-0">
              You can permanently delete your account at any time from the account page&apos;s
              Danger Zone. For safety, deletion requires a fresh one-time code, so an unattended
              signed-in device can&apos;t be used to wipe your account.
            </p>
            <p className="m-0">
              Deleting removes your sign-in record and, automatically with it, your settings, every
              depth-chart edit you&apos;ve saved, and every share link you&apos;ve created — all
              links stop working immediately. This is immediate and cannot be undone. If you&apos;d
              rather we did it for you, email us from the address you signed in with.
            </p>
          </ProseSection>

          <ProseSection title="Your privacy rights">
            <p className="m-0">
              Depending on where you live, you may have the right to access, correct, delete, or
              obtain a copy of your personal information. Because your account holds so little, most
              of these are built into the app: your email address is on the account screen, your
              saved data is visible in the app, and deletion is one screen away. For anything else,
              email us and we&apos;ll respond within the time your state&apos;s law requires.
            </p>
            <p className="m-0">
              We verify requests by replying to the email address on the account. We do not sell or
              share personal information for targeted advertising, so there is nothing to opt out
              of, and we do not profile you or make automated decisions about you.
            </p>
          </ProseSection>

          <ProseSection title="Children">
            <p className="m-0">
              The Sticks is not directed at children under 13, and we do not knowingly collect
              personal information from them. If you believe a child has given us personal
              information, email us and we&apos;ll delete it.
            </p>
          </ProseSection>

          <ProseSection title="Security">
            <p className="m-0">
              We protect your information with encrypted connections, database-level row security
              that scopes your saved data to your own account, and passwordless sign-in that leaves
              no password to steal. Even so, no internet service is perfectly secure, and we
              can&apos;t guarantee absolute security.
            </p>
          </ProseSection>

          <ProseSection title="Where your data is stored">
            <p className="m-0">
              We operate in the United States, and our providers store data there. If you use the
              app from outside the U.S., your information will be transferred to and processed in
              the U.S., where privacy laws may differ from your own.
            </p>
          </ProseSection>

          <ProseSection title="Changes to this policy">
            <p className="m-0">
              We may update this policy as the app changes. If a change materially affects how we
              handle your information, we&apos;ll update the effective date above and post a notice
              before it takes effect. Continued use after a change means you accept the updated
              policy.
            </p>
          </ProseSection>

          <ProseSection title="Contact">
            <p className="m-0">
              Questions, requests, or privacy concerns — reach us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: uiTokens.accent }}>
                {SUPPORT_EMAIL}
              </a>
              . See also our{' '}
              <Link href="/terms" style={{ color: uiTokens.accent }}>
                terms of service
              </Link>
              .
            </p>
          </ProseSection>
        </ProseBody>
      </div>
    </main>
  );
}
