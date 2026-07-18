// Launch gates, as Vercel Flags SDK flags (AGENTS.md §3). Flags are evaluated
// server-side (in the page) and threaded down as props — client components never read
// a flag directly. decide() must stay request-free (no cookies/headers/user targeting)
// so the per-team pages remain statically prerenderable; a production flip is an env
// var change + redeploy, which is the right cadence for a launch gate. The Vercel
// Toolbar can override any flag per-session in previews (via the discovery endpoint at
// app/.well-known/vercel/flags + FLAGS_SECRET) without touching the env.
//
// No flags defined right now. The `flags/next` `flag()` wrapper reads headers()/
// cookies() on every evaluation (to support Toolbar overrides) regardless of whether
// decide() itself touches the request — that alone opts a route out of static
// generation. The last flag here (show-isolated-search-bar-icon) was removed
// 2026-07-17 specifically to let /team/[id] prerender again; see "Flags SDK forces
// team pages off static generation" in the vault before adding a new one.

export {};
