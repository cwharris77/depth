import { flag } from 'flags/next';
import { decideShowUniformPicker } from '@/lib/flag-decisions';

// Launch gates, as Vercel Flags SDK flags (AGENTS.md §3). Flags are evaluated
// server-side (in the page) and threaded down as props — client components never read
// a flag directly. decide() must stay request-free (no cookies/headers/user targeting)
// so the per-team pages remain statically prerenderable; a production flip is an env
// var change + redeploy, which is the right cadence for a launch gate. The Vercel
// Toolbar can override any flag per-session in previews (via the discovery endpoint at
// app/.well-known/vercel/flags + FLAGS_SECRET) without touching the env.

// Phase 7 uniform picker. Off until the launch spec's preconditions are met (curated
// kits seeded — see 2026-07-07-phase-7-uniform-launch-design.md). That spec
// ultimately *deletes* this gate in favor of data-driven visibility
// (uniforms.length > 1); until then, this is the switch.
export const showUniformPicker = flag<boolean>({
  key: 'show-uniform-picker',
  description: 'Expose the header jersey button + uniform selector (Phase 7)',
  defaultValue: false,
  options: [
    { value: false, label: 'Hidden' },
    { value: true, label: 'Visible' },
  ],
  decide: () => decideShowUniformPicker(process.env as { SHOW_UNIFORM_PICKER?: string }),
});
