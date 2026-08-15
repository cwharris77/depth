# Task 8D — Settings, About, and data timestamps

## Outcome

Complete the native Settings/About surface and expose honest on-device data timestamps, without inventing the still-unresolved production support contact or privacy/support URLs.

## Requirements

- Follow T8/Milestone 2B and the native design/QA specs. Preserve T7 account, sign-out, deletion, and public-browse behavior.
- Expand the existing standard SwiftUI `SettingsView`; do not create a parallel settings screen.
- Add an About section containing:
  - display name;
  - semantic version and build number from bundle metadata, with graceful `—` fallback when absent;
  - the required non-affiliation/fair-use disclaimer, verbatim in spirit: “This app is not endorsed by or affiliated with the National Football League. Any trademarks used in the app are used solely to identify the respective entities and remain the property of their respective owners.”
- Add a Data section that reports the team-list cache timestamp when available. Label it honestly as “Saved on this device”; do not imply it is the upstream ingestion/source `updated_at`. Explain in concise secondary copy what the timestamp means. Show `Not saved yet` when no valid cache exists.
- On the current team-detail view, expose that snapshot’s existing `cachedAt` as an explicit “Saved on this device” timestamp. Keep the existing >24-hour stale treatment, but include the real timestamp in both fresh and stale states. Historical rosters are on-demand and must not display a fabricated cache timestamp.
- Thread timestamps through existing feature-local state and cache metadata accessors only. Do not change DTO/domain shapes, cache schema, cache write cadence, Supabase queries, or force-refresh behavior.
- Add a small pure/testable formatter or display model for version/build and timestamp copy. Date formatting must use the user locale/time zone in production and allow deterministic locale/time-zone injection in tests.
- Keep Settings accessible to anonymous users. Account actions and any existing sign-out/deletion error states remain first and unchanged.
- Accessibility: semantic `LabeledContent`, readable multiline disclaimer at Accessibility XXXL, deterministic VoiceOver order, and existing 44×44 Done/account actions.
- Do **not** add placeholder or guessed privacy/support links, email addresses, domains, App Store URLs, uniforms, sharing, telemetry, third-party SDKs, schema changes, or unrelated refactors. Privacy/support entry points are a separate focused task and remain blocked until a real production support contact/domain and accurate policy destination are confirmed.
- Use TDD. Before production changes, observe focused failures for:
  - version/build formatting with full and missing bundle values;
  - deterministic timestamp formatting and nil fallback;
  - team-list view model captures only a valid cache timestamp after load;
  - team detail fresh/stale timestamp display semantics.
- Strengthen the live Settings XCUITest to verify About, version/build, disclaimer, and Data timestamp/fallback content before entering auth. Keep the existing auth journey intact.
- Regenerate with `xcodegen generate` only if source membership changes.
- Before commit: self-review, `git diff --check`, and exact full live Staging simulator suite on the booted iPhone 17 Pro.

## Verification command

`xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`
