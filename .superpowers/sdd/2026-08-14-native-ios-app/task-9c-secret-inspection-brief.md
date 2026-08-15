# Task 9C: Archive-secret inspection

Part of T9 (CI and release QA) in `docs/superpowers/plans/2026-08-14-native-ios-app.md`, the
native iOS app implementation plan for the `depth` repo. T9A (macOS CI workflow,
`.github/workflows/ios-ci.yml`) is merged to `main` — build on top of current `main`.

## Read first

1. `AGENTS.md` at the repo root — house invariants. The one this task directly enforces:
   *"Never place a service-role key in the app; every Supabase operation requires its real RLS
   actor test"* (native iOS plan, Execution rules) and *"no service-role key ever in the app
   bundle — only `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` reach `Info.plist` via `.xcconfig`"*
   (handoff notes for this plan). This is a hard rule, not a suggestion — CI must fail loudly if
   it's ever violated.
2. `ios/xcconfig/Base.xcconfig`, `Staging.xcconfig`, `Release.xcconfig`, `Debug.xcconfig` — see how
   `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` reach the build. Note: `Staging.xcconfig` intentionally
   points at the **production** Supabase project (a documented `TODO(DEP-40 Lane B)` — no separate
   staging project exists yet) using only the public **publishable** key. Your check must fail only
   on a service-role-*shaped* secret being present, never on "points at production" — that's a
   known, separately-tracked issue, not this task's concern.
3. `ios/project.yml` — `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` are the only two keys wired into
   `Info.plist`.
4. `.github/workflows/ios-ci.yml` — the existing CI workflow this task adds a job to. Reuse its
   `xcodegen`/Xcode-setup steps rather than duplicating logic; a new job in this same file is fine
   (it's still one cohesive CI concept — "verify the iOS build", not a second unrelated concern).
5. Supabase's current key format: this project's real secret key looks like `sb_secret_<random>`
   (new-format Supabase API keys — visible in `supabase status` output locally, never commit the
   real value). The publishable key looks like `sb_publishable_<random>`. Older-style Supabase
   projects used long JWTs for both anon and service-role keys (visible in
   `ios/DepthTests/SupabaseRLSIntegrationTests.swift`'s `LocalSupabase.anonKey` — a **local-only**
   demo JWT, not a real secret, safe to have as literal text in test code and safe to appear in the
   check's own denylist/test fixtures). Your check needs to catch both key formats in case Cooper's
   Supabase project is ever migrated.

## What to build

A standalone script the CI job calls (don't inline all logic in YAML — house convention for
scripts is "runs standalone", see `docs/espn.md`'s ingest script pattern for the web side).
Suggested location: `ios/scripts/inspect-archive-secrets.sh` (create the `ios/scripts/` directory;
check first whether anything like it already exists).

The script should:

1. Build the app in **Release** configuration, unsigned, for the `iphonesimulator` SDK (e.g.
   `xcodebuild build -project ios/Depth.xcodeproj -scheme Depth -configuration Release
   -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO -derivedDataPath <path>`). Do **not** attempt a
   real signed Release *archive* — that needs distribution signing certificates as CI secrets,
   which is out of scope here (adding repo secrets needs Cooper's explicit sign-off per AGENTS.md's
   escalation rules) and isn't necessary to inspect what ends up in the bundle: the Release
   xcconfig values are baked into `Info.plist` identically whether the build is signed or not.
2. Locate the built `Depth.app` bundle under the derived-data path.
3. Scan the bundle recursively — `Info.plist` **and** the compiled binary itself (`strings` on the
   binary, since a hardcoded secret could in principle be compiled into Swift string literals, not
   just Info.plist) — for:
   - The literal substring `sb_secret_` (new-format Supabase secret-key prefix).
   - The literal substring `service_role`.
   - The local demo JWT's role claim shape: a base64 JWT segment decoding to `"role":"service_role"`
     is hard to grep directly (it's base64), so instead grep for the substring
     `InJvbGUiOiJzZXJ2aWNlX3JvbGUi` — this is the base64 encoding of `"role":"service_role"` and
     will appear literally in any JWT carrying that claim, signed or not, without needing to decode
     anything at scan time. Verify this base64 substring is correct by encoding it yourself
     (`echo -n '"role":"service_role"' | base64`) before hardcoding it — do not guess.
   - Confirm `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` **are** present in `Info.plist` with
     non-empty values (a sanity check that the scan itself is actually inspecting a real built
     bundle, not silently passing against an empty/wrong path).
4. Exit non-zero with a clear message identifying which pattern matched and in which file if any
   forbidden pattern is found. Exit 0 with a short success summary otherwise.
5. Add a small, fast unit test for the script's matching logic if practical (e.g. a fixture file
   containing a fake `sb_secret_` string that the script correctly flags, run against a temp
   directory rather than a real Xcode build, so the test doesn't need a full build to verify the
   *matching* logic — the real build-and-scan path is exercised separately in CI). Use whatever
   test approach is idiomatic for a shell script in this repo (a small bats/shellspec suite if one
   is already used elsewhere in the repo — check first — otherwise a self-contained shell test
   function invoked at the bottom of the script under a `--self-test` flag is an acceptable,
   dependency-free alternative; use your judgment and explain the choice in your report).
6. Add a new job (e.g. `archive-secret-check`) to `.github/workflows/ios-ci.yml` that runs this
   script on every PR/push touching `ios/**`, using the same Xcode-selection and xcodegen-generate
   steps the existing `test` job uses (factor into a reusable step sequence only if it's genuinely
   easy — don't force a refactor of the existing job if it adds risk; duplicating the two setup
   steps is an acceptable, low-risk alternative to a broader refactor of a CI file another task
   just landed).

## Global constraints (from AGENTS.md / house style)

- **One concern per PR.** This PR is the secret-inspection script + its CI job only.
- New script gets a role-and-constraint header comment (a shell comment block at the top is fine,
  matching this repo's convention of explaining *why*, not narrating *what*).
- Regenerate the Xcode project if you add any source files: `cd ios && xcodegen generate`, then
  confirm `git diff --exit-code -- ios/Depth.xcodeproj` is clean.
- **Verification**: run the script locally against a real build before opening the PR, and also run
  the existing full test suite to confirm nothing else broke:
  ```
  xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
    -destination 'platform=iOS Simulator,id=<YOUR_BOOTED_SIM_ID>' test
  ```
- **Conventional Commits**, scope `ios`. Branch name: descriptive, e.g.
  `feat/ios-archive-secret-inspection`.
- Write `.superpowers/sdd/2026-08-14-native-ios-app/task-9c-secret-inspection-report.md`
  documenting what you built and your test evidence. `git add -f` both this report and this brief
  file so they land in your PR (`.superpowers/sdd/` is gitignored by default).
- **After implementing:** open a PR against `main`
  (`feat(ios): add archive-secret inspection (T9C)`), house PR body shape
  (`## What`/`## Why`/`## Tests` + Claude Code footer). Wait for `ios-ci.yml` to go green
  (including your new job) and check for a Greptile review — fix real findings, then squash-merge
  (`gh pr merge --squash --delete-branch`) once green. You're authorized to merge autonomously per
  AGENTS.md.

## Report contract

Return: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED, the PR URL and merge commit SHA (if
merged), a one-line test summary, and any concerns.
