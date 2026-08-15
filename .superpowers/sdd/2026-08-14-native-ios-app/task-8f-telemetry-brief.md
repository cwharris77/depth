# Task 8F — Privacy-minimal crash reporting and analytics

## Outcome

Document and (for analytics) implement the two telemetry halves of design spec
Milestone 2B item 26 — "lightweight crash reporting and privacy-minimal analytics only
after documenting their App Privacy effects" — using approaches confirmed with Cooper
before writing any code (crash reporting: Apple-native, no dependency, no code; analytics:
a new privacy-minimal Supabase table, event name + timestamp only).

## Requirements

- Follow `docs/superpowers/plans/2026-08-14-native-ios-app.md` T8 and
  `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-design.md` Milestone 2B
  item 26. Product metrics named by the spec: launch, depth-chart reached, auth
  started/completed, override saved, non-sensitive error category.
- **Crash reporting is documentation only** — no SDK, no dependency, no code. Document
  in `docs/ios-privacy-telemetry.md` that Apple's own TestFlight/App Store Connect crash
  collection (user opt-in via device Settings, no third-party destination) satisfies this
  half of the requirement.
- **Analytics is a new Supabase table**, `app_events`, migrated the normal way (`db-migration`
  skill): event name + non-sensitive error category only, no user/device/session id, a
  `CHECK` constraint closing the schema against smuggled free text. RLS on; `anon`/
  `authenticated` insert-only, no read grant for either; `service_role` full access
  (bypasses RLS, so needs no read policy of its own — AGENTS.md invariant 10's "reader"
  here is the service role).
- Wire the five product events into existing view models via a small
  `AppEventsRecording` protocol/`SupabaseAppEventsRecorder`, threaded as a
  default-valued (`NoOpAppEventsRecorder()`) constructor parameter so every existing test
  call site keeps compiling untouched. Every real UI call site explicitly passes
  `DepthEnvironment.appEvents`.
- `depth_chart_reached` fires once per team-detail visit (first successful load only),
  not on every background/pull-to-refresh reload. `error` events use a shared
  `telemetryCategory` on both `DepthError` and `DepthAuthError` (auth errors reuse the
  same coarse vocabulary rather than adding new DB categories).
- Recording must be fire-and-forget: never throws to the caller, never blocks the UI,
  never retries/queues on failure — unlike roster reads, a dropped usage event has
  nothing to show a user.
- Write `docs/ios-privacy-telemetry.md` documenting exactly what's collected, what's
  never collected (and why the schema makes that structurally true, not just a policy),
  who can read it, and the intended (not-yet-submitted) App Store Connect App Privacy
  answers.
- Use TDD: pure `telemetryCategory` mapping tests, then per-view-model tests proving the
  right event fires exactly once (including the negative case — no double-fire on a
  reload, no `authStarted` mislabeled as fired on a failed send, etc.) before touching
  production code where practical.
- Add local Supabase RLS integration tests for `app_events`: anon can insert, anon
  cannot read, an invalid `event_name`/mismatched `error_category` is rejected by the
  `CHECK` constraint, service role can insert and read.
- Regenerate `lib/database.types.ts` (`npm run db:types` against local Postgres) and
  commit it in the same PR as the migration (AGENTS.md invariant 8).
- Do not add uniforms, sharing, a third-party SDK, or any column beyond what's named
  above.
- Before commit: self-review, full live Staging simulator suite on the booted iPhone 17
  Pro, `npx tsc --noEmit`, `npm test`, `npm run format:check`.

## Verification command

`xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`
