'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMyTeam, resolveHomeTeam } from '@/lib/my-team';

// The home route (app/page.tsx) server-renders the DEFAULT team. If the visitor has a
// saved team (roadmap 5a) that differs from the default, swap to it client-side after
// hydration. Default-team visitors — the common case — never navigate: they already see
// the right chart, which is the whole point of rendering it on the server (backlog:
// "Home-load feels slow", 2026-07-08). Renders nothing.
export default function HomeTeamSwap({
  teamIds,
  defaultId,
}: {
  teamIds: string[];
  defaultId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const target = resolveHomeTeam(getMyTeam(), teamIds, defaultId);
    if (target !== defaultId) {
      router.replace(`/team/${target}`);
    }
  }, [router, teamIds, defaultId]);

  return null;
}
