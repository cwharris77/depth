'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyTeam, resolveHomeTeam } from '@/lib/my-team';

// Home route's client redirect (roadmap 5a). Sends the visitor to their saved team (or
// the default) on mount. The visible fallback keeps no-JS visitors and crawlers from
// getting stuck on a blank page.
export default function HomeRedirect({
  teamIds,
  defaultId,
}: {
  teamIds: string[];
  defaultId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const target = resolveHomeTeam(getMyTeam(), teamIds, defaultId);
    router.replace(`/team/${target}`);
  }, [router, teamIds, defaultId]);

  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6"
      style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#f0f4ff' }}>
      <div className="text-[11px] font-semibold tracking-widest" style={{ color: '#A5ACAF' }}>
        LOADING YOUR TEAM
      </div>
      <Link
        href={`/team/${defaultId}`}
        className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f4ff' }}>
        Continue to a depth chart
      </Link>
    </div>
  );
}
