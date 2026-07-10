// Auth-state hook (Phase C, auth pass 1). Exposes the signed-in user (or null) to client
// components and keeps it live via onAuthStateChange, so the sign-in UI and RememberTeam
// react to sign in/out without a reload. `loading` distinguishes "not signed in" from
// "haven't checked yet" so the UI doesn't flash the signed-out state on first paint.
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
