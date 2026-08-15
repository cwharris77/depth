# SDD ledger — plan: docs/superpowers/plans/2026-08-14-native-ios-app.md

## T8 execution split

| Task | Concern | Shared interfaces/files | Preflight finding |
| --- | --- | --- | --- |
| 8A | Native schedule | `DepthRepository`, `SupabaseDepthRepository`, `CachingDepthRepository`, `TeamDetailView` | Adds a public read and one team-detail destination; keep current team snapshot/cache behavior unchanged. |
| 8B | Complete player profiles | `Player`, `TeamSnapshotMapper`, `PlayerDetailView` | Must land before history so historical players can reuse the complete profile shape. |
| 8C | Historical roster | `DepthRepository`, repositories, `Player`, `TeamDetailView` | Consumes 8B's player fields; read-only, season-scoped, no editing or public sharing. |
| 8D | Settings/About/timestamps/privacy/support | `SettingsView`, team list/detail presentation | May consume existing cache timestamps; must not expose private data or invent unresolved release URLs. |
| 8E | Local image/text sharing | `TeamDetailView`, current snapshot/domain | Local-only `ImageRenderer` output and native share sheet; no URL creation or backend writes. |
| 8F | Privacy telemetry decision/implementation | app lifecycle plus auth/override success surfaces | App Privacy effects must be documented before any instrumentation; no third-party SDK or sensitive fields. |
| 8G | T8 completion docs | implementation plan only | Separate PR after every implementation PR is merged and final verification passes. |

Ruling: T8 uses the documented uniform fallback and ships no native uniform surface — Gate 0 still says uniform/headshot/logo data rights are unresolved — cost if wrong: a cleared uniform feature is deferred to a later focused PR.

Ruling: Complete player profiles land before historical rosters — both share `Player`, and history should consume the final profile contract rather than forcing a second migration — cost if wrong: PR order differs from the user's list but not its delivered scope.

Ruling: Every implementation PR runs the full Staging `xcodebuild ... test` suite on the booted iPhone 17 Pro simulator and inspects Greptile's initial review before squash merge; later pushes receive explicit self-review — cost if wrong: simulator coverage is current-device only until T9 adds the device matrix.

Baseline: `xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test` — 51/51 Swift tests and 3/3 XCUITests passed after restarting the local Supabase stack from this checkout (the first run's deletion failure was an Edge Runtime mount to a removed T7 worktree).

Task 8A: minor (deferred): schedule W/L/T color is non-essential because the visible result letter and combined VoiceOver label already convey the outcome without color.

Task 8A: fix round 1/5 (4 addressed, 0 open — stale request state, missing-opponent recovery, mapping coverage, live card assertion; commits 3ba4bc3..64093d5)

Task 8A: complete (commits 87365ff..64093d5, review clean)

Task 8A: Greptile initial review P1 fixed in 85c177b — failed historical schedule state retains season selection and can recover; self-reviewed later push; PR #362 squash-merged as e019aae.

Task 8B: independent review Important fixed in 71b33cc — trims and suppresses the ingestion `—` sentinel so missing college is not rendered as meaningful content; reviewer re-approved; exact final simulator suite passed 72/72.

Task 8B: Greptile initial P2 (fallback unknown player status to backup) intentionally declined because the native design/QA contract requires malformed nested enum data to fail explicitly, reject the transaction, and retain the last-good cached snapshot; rationale replied inline; PR #363 squash-merged as f1cf512.

Task 8C ruling: native history mirrors web D1 read-only behavior, but unresolved image rights use the number fallback and do not surface historical `headshot_url`; K/P/LS resolve from rank-1 historical players while KR/PR remain explicitly empty.

Task 8C: fix round 1/1 (historical stats team context and strict synthetic-ID parsing; two independent instances of a same-season multi-team `maybeSingle()` ambiguity risk) fixed before merge; PR #364 squash-merged as a4eb8d6.

Task 8D: mid-task correction — an initial pass built a native Privacy Policy screen and a placeholder support mailto link before discovering `.superpowers/sdd/2026-08-14-native-ios-app/task-8d-settings-about-timestamps-brief.md`, which explicitly forbids guessing privacy/support URLs until T1/Gate 0 reserves a real domain/contact. Backed that out; shipped only About (name/version/disclaimer) and Data (on-device "Saved on this device" timestamp, honestly scoped) sections. Greptile initial P2 (relative-time text never refreshes while a screen stays open) fixed with a periodic `TimelineView` wrapper; self-reviewed later push; PR #366 squash-merged as 42f4a9b.

Task 8E: Greptile initial P1 (`ShareLink`'s `preview:` only drives the share sheet's own preview UI, it is not transferred to the chosen destination) fixed by adding `subject`/`message` `Text` alongside the transferable image; self-reviewed later push; PR #367 squash-merged as f6df3cc.

Task 8F ruling: crash reporting and analytics-backend approach were confirmed with Cooper before writing code (two AGENTS.md "ask first" gates — a new dependency for crash reporting, a schema change for analytics) — Apple-native crash collection (zero code, zero dependency, documentation only) and a new privacy-minimal `app_events` Supabase table (event name + non-sensitive error category only, insert-only for clients, no user/device/session id column). Full App Privacy documentation (`docs/ios-privacy-telemetry.md`) written before any instrumentation shipped. Greptile initial P1 (unrestricted INSERT grant let a client forge `created_at`, corrupting time-based aggregates) fixed by column-restricting the grant to `event_name, error_category`; self-reviewed later push; PR #368 squash-merged as 3e234cf.

## T9 execution split

| Task | Concern | Shared interfaces/files | Preflight finding |
| --- | --- | --- | --- |
| 9A | macOS CI (build/test on PR/push) | `.github/workflows/`, `ios/project.yml` | New workflow only; no existing native CI job to conflict with. Needs a runner-resolvable simulator id (not the hardcoded local UUID used in T8's manual verification command). |
| 9B | Performance metrics harness (XCTest + os_signpost) | `ios/Depth/App/`, `ios/Depth/Data/`, `ios/DepthUITests/` | Budgets are in the vault design spec's Performance Review (warm launch <1s, tap <100ms, snapshot p95 <1.5s good/<3s constrained); needs signpost instrumentation added to real code paths, not just test-side timers. |
| 9C | Archive-secret inspection | new script + CI job, `ios/xcconfig/` | AGENTS.md hard rule: no service-role key ever in the app bundle. Staging.xcconfig intentionally points at prod Supabase (publishable key only) — the check must fail only on a service-role-shaped secret, not on "points at production." |
| 9D | Deterministic screenshot automation | `ios/DepthUITests/`, launch-argument plumbing in `ios/Depth/App/` | Needs stable staging seed data (team/section/user-state/dates) reachable via launch args, with no exposed test secret — mirrors the design spec's item 35. Five-screenshot sequence is specified (spec lines 277-286). |

Ruling: split T9 into 4 independently mergeable PRs (9A CI, 9B performance, 9C secret inspection, 9D screenshots) rather than one PR — each is a distinct concern per AGENTS.md §3 Process, and 9A unblocks nothing else so it lands first.

Ruling: the CI job (9A) uses a simulator resolved by name/OS at runtime (`xcrun simctl list devices available`) rather than the hardcoded UUID `736575DC-...` used in local dev sessions — that UUID is this machine's local simulator instance, not guaranteed to exist on a GitHub Actions macOS runner.

Ruling: `SupabaseRLSIntegrationTests` and `NativeAuthIntegrationTests` are gated on a runtime reachability probe of 127.0.0.1:54321 (`LocalSupabase.isReachable`) rather than skipped via `-skip-testing` in the CI workflow — GitHub-hosted macOS runners can't run Docker (no nested virtualization), so `supabase start` is unavailable there. This mirrors the web CI's existing "DB tests skip gracefully without env vars" pattern (.github/workflows/ci.yml) and keeps full coverage running locally before every merge, per the plan's verification command.

Task 9A: real CI run surfaced a genuine race the local `xcodebuild test` habit never caught — `AuthUITests.swift`'s bare `.exists` checks (no wait/retry) raced SwiftUI's layout pass, and separately the Data section's footnote row sits below the fold on iPhone SE (3rd gen) and is never materialized in the accessibility tree until scrolled (SwiftUI Form lazily renders off-screen rows) — no timeout fixes an element that was never rendered. Root-caused by reproducing locally against a freshly created iPhone SE (3rd generation) simulator and reading the xcresult's accessibility-hierarchy snapshot at the failure point directly, rather than guessing from CI log timing. Fixed with the same swipe-retry idiom already used by `DepthUITests.swift`'s season-picker check. Also converted every bare `.exists` immediately following a `waitForExistence` in the same journey (both AuthUITests.swift and DepthUITests.swift) to `waitForExistence`, since that's the same defect shape.

Task 9A: Greptile initial review (3 P2s) — (1) "CI change lacks approval record" replied-to as expected/in-scope (T9 of the approved plan, session explicitly authorized to execute autonomously); (2) action references pinned to commit SHAs (actions/checkout, maxim-lobanov/setup-xcode); (3) device-runtime compatibility now validated by test-creating (and deleting) each candidate against the resolved runtime before selecting it, rather than trusting presence in the installed device-type list — the exact gap that caused the original iPhone XS/XR incompatibility this workflow was written to route around. Self-reviewed later pushes. PR #370 squash-merged as 4dc65ff.

Task 9A: complete (commits 4006319..1389ca7 across PR #370, review clean after fix rounds)
