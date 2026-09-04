# Native iOS privacy telemetry (crash reporting + analytics)

Design spec Milestone 2B item 26: "Add lightweight crash reporting and privacy-minimal
analytics only after documenting their App Privacy effects." This doc is that
documentation — read it before touching either half of this feature, and update it in
the same PR as any change to what's collected.

## Crash reporting: Apple-native only, zero code

Depth adds **no crash-reporting SDK and no crash-reporting code**. Crash reports are
collected automatically once the app is distributed through TestFlight/App Store Connect:

- The user opts in (or out) via **Settings → Privacy & Security → Analytics &
  Improvements → Share With App Developers** on their device — this is an OS-level
  setting, not something Depth's code can see, control, or override.
- When enabled, iOS uploads a symbolicated crash log directly to Apple; Apple makes it
  available to us in App Store Connect → Xcode → Organizer → Crashes. Depth never
  receives, stores, or transmits this data itself.
- No third-party destination exists in this pipeline — the data never leaves Apple's
  infrastructure before reaching us.

This satisfies "lightweight crash reporting" without a new dependency (AGENTS.md's "no
new dependencies without asking" — a third-party crash SDK was considered and declined)
and without adding any code path that could leak PII into a crash payload.

**App Privacy declaration:** none required from Depth's side — Apple's own
crash-collection pipeline is documented under Apple's own privacy terms, not the
developer's App Privacy "nutrition label." Nothing to declare here.

## Analytics: `app_events` — five counters, nothing else

A single Supabase table, `app_events`
(`supabase/migrations/20260815084146_add_app_events.sql`), records exactly the five
product metrics the design spec asks for:

| Event | Fired when |
| --- | --- |
| `app_launch` | Once per app launch, from `ContentView`'s root `.task` |
| `depth_chart_reached` | The first successful team-snapshot load per team-detail visit (not on background/pull-to-refresh reloads) |
| `auth_started` | A native email-OTP send succeeds |
| `auth_completed` | A native email-OTP verify succeeds |
| `override_saved` | A position-group override write succeeds |
| `error` | A load/auth/override failure, tagged with a non-sensitive `error_category` |

### What is stored, and what is deliberately not

| Column | Contents |
| --- | --- |
| `event_name` | One of the six names above — a Postgres `CHECK` constraint rejects anything else |
| `error_category` | Present only when `event_name = 'error'`; one of `DepthError`/`DepthAuthError`'s case names (`offline`, `validation`, `server`, …) — never the associated diagnostic string, never free text |
| `app_version` | Full marketing app version from `CFBundleShortVersionString` (for example, `1.4.2`), without build number or OS version; nullable for older clients and unavailable metadata. Numeric dot-separated version only, at most three components and 32 bytes. |
| `created_at` | Server-assigned insert timestamp (`default now()`) |

**Never stored, by construction (not by policy):** user id, device id, session id,
email, IP address, precise or coarse location, advertising identifier, OS version, build number,
or any free-text field. The schema itself has no column to put any of that in — there is
nowhere for it to leak to even by accident. Two rows recorded seconds apart, or from the
same device, or from the same signed-in user, cannot be linked to each other through this
table.

DEP-322 (decision 2026-08-27) adds release attribution via
`supabase/migrations/20260903201727_add_app_event_version.sql`. Apply the migration
before distributing the updated app. Existing rows and inserts from already-submitted
clients keep `app_version = NULL`; do not backfill a guessed release. Compare release
counts/error rates by `app_version`, retaining unknown versions as a separate group.
The recorder omits missing or malformed version metadata and keeps its existing
background, drop-on-failure behavior.

This field does not expand App Privacy disclosure: it describes a shared app release,
not a person or device. Product Interaction remains unlinked, used only for internal
analytics, and not used for tracking. No identifiers or other telemetry are added.

### Access

- `anon`/`authenticated` (the roles every app install runs as, signed in or not) may
  only **insert**. There is no `SELECT` grant for either role — reading is a privilege
  error, not merely an RLS-filtered empty result (same shape as `app_config`'s
  anon-write denial; see `SupabaseRLSIntegrationTests.swift`).
- `service_role` (server-side only, never shipped in the app) has full access for
  aggregate analysis. RLS is enabled with one `INSERT` policy for `anon, authenticated`;
  the service role bypasses RLS by design, so it needs no policy of its own (AGENTS.md
  invariant 10 — the "reader" the invariant requires a policy for is `service_role`
  here, and it doesn't need one because it isn't subject to RLS).

### Client behavior

`SupabaseAppEventsRecorder` (`ios/Depth/Support/AppEventsRecorder.swift`) is
fire-and-forget: `record(_:)` never blocks the caller, never throws, never retries, and
silently drops the event on any failure (offline, transient server error, …). Telemetry
must never affect what a user sees or does — unlike roster data, there is nothing to
show for a dropped usage event, so it isn't queued or retried like a real user action
would be.

### Intended App Privacy answers (App Store Connect)

DEP-160: the app record now exists, so these are the nutrition-label answers to enter.
This doc is the source of truth for what to enter. The full label covers three data
types (only the third lives in this doc's table — the other two are account-feature
data in Supabase, documented here so the label is accurate as a whole):

| Data type (category) | Collected when | Linked to identity | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info → Email Address | User signs in (account created via Supabase Auth email OTP) | Yes — the email is the account | No | App functionality (sign-in) |
| User Content → depth-chart overrides, saved/shared boards, favorite team | User saves an override, a board, or a preference while signed in | Yes — tied to the account (`auth.uid()`-scoped rows) | No | App functionality (core saved-boards feature) |
| Usage Data → Product Interaction | Each of the six `app_events` fires | No — the table has no column capable of linking an event to a person or device | No | Analytics (internal product metrics only) |

Notes for the "Data Not Collected" screen: **no** third-party advertising/analytics/crash
SDK is shipped. Crash reporting is Apple-native only (see above) and is not declared as
developer-collected data. Supabase is backend infrastructure, not a separate label entry —
the data it stores is the rows above.

The Product Interaction answers (from the analytics table only):
- **Linked to the user's identity:** No — the table has no column capable of linking an
  event to a person or device.
- **Used for tracking (cross-app/cross-site):** No.
- **Purpose:** App functionality / analytics (internal product metrics only).

## What this explicitly does not cover

- Roster/depth-chart data reads and writes — unrelated to this doc; see the design spec's
  own "Data and state contract" and `DepthError`.
- Account deletion reauthentication (`AccountDeletionViewModel`) — intentionally not
  instrumented; it already has its own typed error/correlation-id handling for support,
  and adding a usage counter to a destructive-action flow wasn't part of the five named
  metrics.
- Any future addition to this table (a new event, a new column) must update this doc in
  the same PR — the whole point of "documented before implemented" is that this file
  never lags the schema.
