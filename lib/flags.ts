import { decideShowIsolatedSearchBarIcon } from '@/lib/flag-decisions';
import { flag } from 'flags/next';

// Launch gates, as Vercel Flags SDK flags (AGENTS.md §3). Flags are evaluated
// server-side (in the page) and threaded down as props — client components never read
// a flag directly. decide() must stay request-free (no cookies/headers/user targeting)
// so the per-team pages remain statically prerenderable; a production flip is an env
// var change + redeploy, which is the right cadence for a launch gate. The Vercel
// Toolbar can override any flag per-session in previews (via the discovery endpoint at
// app/.well-known/vercel/flags + FLAGS_SECRET) without touching the env.

// Isolated search bar icon was crowding the team page top bar. I don't think it's very important because
// we have the team picker search bar which is the exact same thing, just a little less visible.
export const showIsolatedSearchBarIcon = flag<boolean>({
  key: 'show-isolated-search-bar-icon',
  description: 'Expose the isolated search bar icon',
  defaultValue: false,
  options: [
    { value: false, label: 'Hidden' },
    { value: true, label: 'Visible' },
  ],
  decide: () =>
    decideShowIsolatedSearchBarIcon(process.env as { SHOW_ISOLATED_SEARCH_BAR_ICON?: string }),
});
