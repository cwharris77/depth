import Link from 'next/link';
import { DEFAULT_TEAM_ID } from '@/lib/teams';
import { colors as uiTokens } from '@/components/ui/tokens';
import SectionLabel from '@/components/ui/SectionLabel';

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6"
      style={{ minHeight: '100dvh', background: uiTokens.bg, color: uiTokens.textPrimary }}>
      <SectionLabel className="">404 · NO SUCH TEAM</SectionLabel>
      <h1 className="text-2xl font-black mt-2" style={{ letterSpacing: '-0.02em' }}>
        That team isn&apos;t on the field
      </h1>
      <p className="text-sm mt-2" style={{ color: 'rgba(240,244,255,0.65)' }}>
        The team you&apos;re looking for doesn&apos;t exist (yet).
      </p>
      <Link
        href={`/team/${DEFAULT_TEAM_ID}`}
        className="mt-6 px-4 py-2 rounded-xl text-sm font-bold"
        style={{ background: uiTokens.borderDefault, color: uiTokens.textPrimary }}>
        Go to a depth chart
      </Link>
    </div>
  );
}
