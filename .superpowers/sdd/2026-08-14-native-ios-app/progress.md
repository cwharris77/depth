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
