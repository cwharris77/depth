# Native iOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Depth's consumer-facing Next.js/PWA client with a polished iPhone-first SwiftUI app while retaining Supabase and the TypeScript ingestion pipeline.  
**Spec:** `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-design.md`  
**QA:** `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-qa-plan.md`  
**Architecture:** SwiftUI features depend on one typed repository actor; RLS-safe operations go directly to Supabase, privileged deletion uses one Edge Function, and the web client remains only through the 30-day rollback window.  
**Tech Stack:** Swift 6, SwiftUI, iOS 18, SwiftData, Swift Testing, XCTest/XCUITest, Supabase Swift, Postgres/RLS/Edge Functions, TypeScript/Vitest, GitHub Actions.  
**Status:** Open

## Execution rules

- Read the vault spec and QA plan before starting; they are authoritative for decisions and acceptance.
- Implement in milestone order: Gate 0, foundation/read-only slice, auth/write slice, v1 parity, polish/TestFlight, submission, then cutover.
- Keep the existing web client until App Store approval, release stability, and the 30-day rollback window.
- Keep database changes additive for the current and previous mobile release.
- Never place a service-role key in the app; every Supabase operation requires its real RLS actor test.
- Split the tasks below into reviewable PRs by concern. Do not implement the entire migration in one branch.

## Worktree Parallelization

| Step/workstream | Modules touched | Depends on |
| --- | --- | --- |
| Native foundation and core flow | `ios/`, `fixtures/` | — |
| Supabase staging, RLS, query, deletion | `supabase/`, `fixtures/` | — |
| Brand, legal, App Store, static content | `static-site/`, App Store Connect | — |
| CI and test harness | `.github/`, `ios/`, `fixtures/` | native project skeleton |
| Auth and override UI | `ios/`, `supabase/` | native foundation + RLS |
| Secondary read-only surfaces | `ios/` | repository/domain foundation |
| TestFlight, screenshots, submission | `ios/`, App Store Connect | all version 1 surfaces + rights gates |
| Web retirement | web app, `supabase/`, `static-site/` | approved/stable App Store release |

- Lane A: native foundation → core flow → auth/override integration.
- Lane B: staging/RLS/nested query → deletion function → compatibility migrations.
- Lane C: name/legal/icon → static privacy/support → metadata/screenshots.
- Lane D: CI/test harness after the Xcode skeleton → release verification.
- Launch A, B, and C in parallel. Start D as soon as A creates the project. Merge A+B before
  authenticated editing; merge all lanes before TestFlight. Web retirement is strictly last.
- Conflict flags: A and D both touch `ios/`; one lane owns the Xcode project file. A and B both touch
  fixtures/data contracts; version the JSON schema and land fixture changes before dependent code.

### Current state and concrete parallel-work boundaries (2026-08-14, after T2-T4)

T2 (native project skeleton), T3 (domain/formations logic + fixtures), and T4 (data layer —
`DepthRepository`/`SupabaseDepthRepository`, DTOs, mapper, typed `DepthError`) are shipped
(depth#348-352). `Domain/` and the `TeamSnapshot` read path are a stable contract now — build
against them, don't rewrite them. What's genuinely safe to run concurrently vs. what needs one
owner at a time:

**Safe to fully parallelize — separate leaf directories, near-zero conflict risk:**
- T6 (Core UX) → new files under `ios/Depth/Features/Teams/`, `Features/TeamDetail/`
- T7 (Auth) → new files under `ios/Depth/Features/Auth/`, `Features/Settings/`, `supabase/functions/`
- T8 (v1 parity) → other new `Features/` subfolders (Schedule/, History/, Share/)
- T10 (icons/visual polish) → `ios/Depth/Assets.xcassets/` and static-site copy
- T1 (Gate 0 release-process work) → entirely outside the repo (App Store Connect, legal)
- T5 (SwiftData cache) → new files in `ios/Depth/Data/` (e.g. a cache/decorator type) as long as
  it doesn't rewrite `SupabaseDepthRepository.swift`/`DepthRepository.swift` themselves — treat
  those as a stable seam to wrap, not edit

**Needs one owner at a time — shared/generated files, real merge-conflict risk:**
- `ios/project.yml` + the generated `ios/Depth.xcodeproj/` — adding a new `Features/` subfolder
  means adding it to `project.yml`'s `sources:` list, which regenerates the whole (large,
  diff-hostile) `project.pbxproj`. Two agents doing this on parallel branches will produce two
  incompatible full-file diffs. Merge one project.yml-touching PR at a time; each new PR rebases
  onto main and regenerates (`xcodegen generate`) before opening, not before merging — same
  discipline used for T2-T4 here.
- `ios/Depth/Support/DepthEnvironment.swift` — the one composition root. New features needing new
  repository/environment wiring should add a property, not restructure the file; prefer landing
  these edits one PR at a time too.
- This plan file's own `## Tasks` checkboxes — fine for parallel agents to check off different
  `T`s, but rebase before merging so two concurrent checkbox edits don't silently clobber each
  other (git will merge cleanly line-by-line as long as each PR is small and rebased).
- Local Supabase integration tests that mutate shared seed rows (e.g. team "bills") — restore the
  original value immediately after asserting (see `SupabaseRLSIntegrationTests.swift`), or better,
  create disposable rows/users (random UUID emails, as the auth tests do) instead of touching seed
  data another agent's test run might read concurrently.

**Always before merging, regardless of lane:** run the real build+test (`xcodebuild ... test`
against a live simulator, not just `xcodegen generate`), and check Greptile's review
(`gh pr checks` / `gh api repos/cwharris77/depth/pulls/<n>/comments`) — don't merge on a green
build alone.


## Tasks

- [ ] **T1 (P1, human: ~2d / CC: ~2h)** — Release — reserve the working App Store name and close
  name, trademark, sports-mark, data-rights, developer-account, bundle-ID, support, and privacy gates.
  - Surfaced by: Architecture — public release has unresolved identity and IP dependencies.
  - Files: App Store Connect, `static-site/`, release decision record.
  - Verify: each gate is `go`, `fallback`, or externally blocked; App Store record exists.
- [x] **T2 (P1, human: ~1d / CC: ~1h)** — iOS foundation — create the iOS 18 SwiftUI project,
  configurations, signing, dependency pin, folder layout, and environment injection.
  - Surfaced by: Architecture — native client and environment boundaries do not exist.
  - Files: `ios/`.
  - Verify: Debug/Staging/Release simulator builds; archive has no privileged secret.
  - Shipped: depth#348, depth#349.
- [x] **T3 (P1, human: ~2d / CC: ~4h)** — Contracts — add versioned JSON fixtures and port domain
  rules with TypeScript/Swift parity tests.
  - Surfaced by: Code Quality — web behavior must be a precise migration specification.
  - Files: `fixtures/`, TypeScript tests, `ios/Depth/Domain/`, `ios/DepthTests/`.
  - Verify: both suites pass every canonical fixture.
  - Shipped: depth#350. Formation/depth-ordering domain logic only (the scope this repo's
    formations.ts/roster.ts actually cover) — no separate historical/season-parity fixtures
    exist to port yet.
- [x] **T4 (P1, human: ~3d / CC: ~6h)** — Data — build typed errors, DTO/domain mappers, the
  repository actor, projected team snapshot, and real actor-matrix RLS tests.
  - Surfaced by: Architecture and Code Quality — UI/database coupling and ambiguous failures.
  - Files: `ios/Depth/Data/`, `ios/DepthTests/`, `supabase/`.
  - Verify: mapping/repository tests and local Supabase RLS suite pass.
  - Shipped: depth#352 (+ depth#353 for the parallel-work-boundaries doc update). 9 mapper
    unit tests, 5 RLS integration tests against local Supabase (anon/authenticated/service-role).
    Owner/non-owner distinction not applicable yet — all 5 snapshot tables are public-read with
    zero write policies until `depth_overrides` ships in T7.
- [x] **T5 (P1, human: ~2d / CC: ~4h)** — Cache — implement versioned SwiftData snapshots,
  cache-first refresh, deduplication, stale labels, preferences, and update-gate behavior.
  - Surfaced by: Performance — a polished phone app must remain fast and useful during outages.
  - Files: `ios/Depth/Data/`, `ios/Depth/App/`, `ios/DepthTests/`, `supabase/`.
  - Verify: cache/update/concurrency suites; warm render <1 s on oldest device.
  - Shipped: depth#355 (+ depth#356 for T6, built on top). `CachingDepthRepository` actor
    decorator over `SupabaseDepthRepository` — cache-first reads, deduplicated background
    refresh, retained last-good snapshot on failed refresh, 32-team cache cap, safe
    schema-version discard (`CachedSnapshotStore`, a `@ModelActor`). `app_config` table/
    migration + update gate wired into the app root. Warm-render/performance budget
    (<1s on oldest supported device) not independently measured yet — no perf-metrics
    harness exists until T9.
- [x] **T6 (P1, human: ~5d / CC: ~1d)** — Core UX — ship team search, depth chart, player detail,
  restoration, and complete state/accessibility behavior.
  - Surfaced by: Test Review — first vertical slice has no native coverage or implementation.
  - Files: `ios/Depth/Features/Teams/`, `TeamDetail/`, `ios/DepthUITests/`.
  - Verify: seven-day device use; critical XCUITest journey; VoiceOver/XXXL checklist.
  - Shipped: depth#356. Searchable team list → depth chart (offense/defense/special via
    the existing T3 `resolveUnit`) → basic player detail, all cache-first through T5;
    last-viewed team/section restoration; explicit loading/empty/stale/offline/error
    states throughout. One critical XCUITest journey (search → team → chart → player
    detail → dismiss) passes against real staging data. Seven-day device use and a full
    manual VoiceOver/Accessibility-XXXL audit are human-only gates, not yet run — basic
    accessibility labels/identifiers/44×44 tap targets are in place but unverified on a
    physical device. Real per-team formation layouts (`buildRealFormation`/
    `buildRealDefenseFormation`, T3) aren't wired in yet — the projected snapshot query
    doesn't select `qbAlignment`/personnel-code columns, so the chart currently always
    renders the generic formation.
- [x] **T7 (P1, human: ~4d / CC: ~1d)** — Accounts — implement native email OTP, session
  lifecycle, owner-only group upserts, edit recovery, and fresh-OTP account deletion.
  - Surfaced by: Architecture — browser auth and current deletion assurances are insufficient.
  - Files: `ios/Depth/Features/Auth/`, `Settings/`, `TeamDetail/`, `supabase/functions/`, tests.
  - Verify: auth/override/deletion UI, integration, cascade, and RLS suites pass.
- [ ] **T8 (P1, human: ~4d / CC: ~1d)** — Version 1 parity — add schedule, history, profiles,
  settings, cleared uniforms, and local image/text sharing.
  - Surfaced by: Scope Challenge — consumer scope retained with milestone discipline.
  - Files: `ios/Depth/Features/`, `ios/DepthTests/`, `ios/DepthUITests/`.
  - Verify: version 1 parity checklist passes on production-shaped staging data.
- [ ] **T9 (P1, human: ~3d / CC: ~6h)** — CI and release QA — add macOS build/test CI,
  performance metrics, archive-secret inspection, deterministic screenshot automation, and device
  matrix runs.
  - Surfaced by: Test and Performance Reviews — every critical path and budget needs enforcement.
  - Files: `.github/workflows/`, `ios/DepthTests/`, `ios/DepthUITests/`.
  - Verify: CI green; performance budgets met; five clean exact-size screenshots captured.
- [ ] **T10 (P1, human: ~5d / CC: ~1d)** — Consumer polish — finalize the icon, visual system,
  accessibility, privacy/support pages, App Privacy, metadata, and two TestFlight rounds.
  - Surfaced by: Architecture/Test Review — App Store readiness extends beyond code completion.
  - Files: `ios/Depth/Assets.xcassets/`, `static-site/`, App Store Connect.
  - Verify: five-user success criteria, no P0/P1, legal/privacy and rights gates closed.
- [ ] **T11 (P1, human: ~2d / CC: ~2h)** — Submission — produce/validate/upload the Release archive,
  submit with complete metadata, respond to review, and release manually after stability gates.
  - Surfaced by: Architecture — distribution and rollback need an explicit owner and gate.
  - Files: Xcode signing/archive settings, App Store Connect, release checklist.
  - Verify: approved version is available in the App Store and monitored for seven days.
- [ ] **T12 (P2, human: ~2d / CC: ~4h)** — Cutover — retain a 30-day rollback, then remove the
  consumer web/auth/PWA/share runtime and public override policies while preserving ingestion and
  static pages.
  - Surfaced by: Architecture — avoid permanent dual-client maintenance and stale public access.
  - Files: web app, `supabase/`, `static-site/`, package/workflow configuration.
  - Verify: native production healthy; ingestion green; static URLs work; old share access denied.


## Completion gate

- [ ] Every acceptance item in the vault spec and QA plan passes.
- [ ] Native CI, TypeScript fixture parity, local RLS integration, XCUITest, archive-secret, and performance checks pass.
- [ ] Name, logo, sports assets/data rights, privacy, support, metadata, and screenshots are approved.
- [ ] Five intended users complete the core flow without help; no P0/P1 remains.
- [ ] The App Store build is approved and stable through the 30-day rollback window before web retirement.
