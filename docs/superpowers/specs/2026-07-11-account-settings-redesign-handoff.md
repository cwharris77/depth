# Handoff: account/settings page — delete account, privacy policy, design pass

**For:** design-focused session picking up `components/AccountView.tsx`.
**Priority driver:** [depth ticket] Delete-account button and privacy policy — **P0**, blocks
App Store submission (Apple requires in-app account deletion + a reachable privacy policy).
Bundled with two lower-priority tickets that touch the same surface so it's one coherent pass,
not three separate diffs on the same file.

## Scope (three tickets, one page)

1. **P0 — Delete-account button and privacy policy** (blocking, do this first)
   - "Delete my account" action with a confirm step, removes the `auth.users` row (and
     `user_settings` if not cascade-deleted — verify).
   - Static privacy policy page, linked from the account page.
2. **P2 — Settings section inside the account page**
   - Interim IA: no dedicated `/settings` route yet. Add a clearly labeled "Settings" section
     *within* the existing account page so favorite-team, delete-account, and (later) other
     prefs have a home that reads as settings, not just loose controls under "Signed in as."
3. **P2 — Account page design pass**
   - Hierarchy, spacing, typography, on-brand accents. The page currently reads as
     functional-but-rough (inline hex styles, no section structure).

Do 1 first and land it independently if needed (App Store blocker). 2 and 3 are the redesign
wrapper around it — natural to do in the same pass since you're already restructuring the JSX,
but not required to unblock submission.

## Current state — read before touching the file

`components/AccountView.tsx` has **uncommitted local changes** (not yet committed, not on
`origin/main`): a fix for the two-submit magic-link bug, adding a 6-digit OTP code input as the
primary sign-in path (magic link kept as fallback). This is verified working in prod per
`Projects/depth/Decisions.md` (2026-07-11 entries) but the diff itself is still local/uncommitted
as of this handoff. **Do not discard it** — build on top, or coordinate with Cooper if it needs
to land as its own commit first.

The file today (signed-in branch) has three flat sections in a `flex-col gap-6`: "Signed in as"
(email), favorite-team picker (`<select>`), and a start-on-favorite toggle. No section headers,
no visual grouping — that flatness is exactly what the design-pass ticket wants fixed.

## What exists to build on

- **No design system / component library.** No `components/ui/`, no existing
  `AlertDialog`/`ConfirmDialog`, no Tailwind config file (Tailwind v4, tokens live in
  `app/globals.css` under `:root` / `@theme inline`). Styling elsewhere is inline `style={{}}`
  with hardcoded hex — match that pattern, don't introduce a new one for this page alone.
- **Color tokens in use on this page today:** `--background:#0a0e1a`, `--foreground:#f0f4ff`,
  card/border `rgba(255,255,255,0.06–0.15)`, muted text `#A5ACAF`, brand accent `#69BE28`
  (green — used for the primary CTA and the star icon), error `#ff6b6b`.
- **No confirm/destructive-action pattern anywhere in the codebase yet.** Delete-account is the
  first one — whatever pattern you pick here becomes the precedent. Two-step disclosure (click
  "Delete account" → inline expands to a confirm state with a second button) is a good fit
  given there's no modal/dialog primitive to reach for; a full modal is heavier than this app
  has needed so far. Type-to-confirm is probably overkill for a single-item destructive action —
  reserve that pattern for something with wider blast radius.
- **Nav entry point:** `components/NavDrawer.tsx:174-180` — "Account" (signed in) / "Sign in"
  (signed out) links to the sign-in/account page. No separate settings nav item; settings lives
  inside the account page per ticket 2's interim decision.
- **API route pattern:** `app/api/settings/` (see `lib/settings-client.ts`) is the existing
  client → route-handler → Supabase pattern for authenticated per-user actions. Match this for
  the delete endpoint (e.g. `app/api/account/delete/route.ts`) rather than inventing an RPC.

## Open technical question to resolve before building delete

`user_settings` (and `depth_overrides` if still live — `Schema.md` may be stale, verify against
`origin/main`/actual schema) may already `on delete cascade` from `auth.users`. If so, deleting
the `auth.users` row via the service-role client is sufficient and no manual per-table cleanup
is needed. Check with `list_tables`/`execute_sql` (Supabase MCP) before writing delete logic.

## Privacy policy content

No existing draft. Needs actual policy text (what's collected — email via magic-link auth,
favorite-team/settings prefs; no third-party tracking/ads as far as this session knows — confirm)
before the page is real, not just a design shell. Flag this back to Cooper if content isn't
supplied — don't fabricate legal copy.

## Done when

- A signed-in user can delete their account (and associated data) from the account page, with a
  confirm step, and lands signed-out afterward.
- A privacy policy page exists and is linked from the account page.
- The account page has a labeled "Settings" section containing favorite-team, start-on-favorite,
  and delete-account.
- The page reads as polished and on-brand — real hierarchy/spacing/typography, not a flat stack
  of controls.

## Related

- Depth repo tickets (vault): `Delete-account button and privacy policy.md`,
  `Settings section inside the account page.md`, `Account page design pass.md`.
- `Projects/depth/Decisions.md` (vault) — 2026-07-10 auth entries, 2026-07-11 two-submit fix.
- `docs/superpowers/specs/2026-07-09-auth-account-and-user-settings-design.md` (this repo) —
  original auth/settings design this page was built from.
