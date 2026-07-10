'use client';

import { useEffect } from 'react';
import { useUser } from '@/lib/use-user';
import { putSettings } from '@/lib/settings-client';

// Records the team currently being viewed as the signed-in user's last-viewed team
// (Phase C, auth pass 1), so the home route can reopen it. Persistence is account-gated:
// signed out, this is a no-op — we store nothing about anonymous visitors, by design.
// Renders nothing.
export default function RememberTeam({ id }: { id: string }) {
  const { user } = useUser();
  useEffect(() => {
    if (user) putSettings({ lastTeamId: id });
  }, [user, id]);
  return null;
}
