---
name: release-ios
description: Use when an iOS build is going out — cutting a release train, running the scheduled release agent, archiving and uploading to App Store Connect / TestFlight, submitting for review, a build going LIVE in the App Store, or arming the forced-update gate ahead of a breaking backend change. Covers the biweekly release train, recording the release in ios-release-compatibility.md, when the gate may (and may not) be armed, and the ordering that keeps installed builds decodable (web/CLAUDE.md invariant 11).
---

# iOS release & compatibility manifest protocol

## Overview

Every App Store release ties a **build number** to the backend contract in
`ios-release-compatibility.md` (repo root). A build's lifecycle touches that manifest
**twice**: when you **submit** it, and when it goes **LIVE**. Getting the second
moment right — and never arming the forced-update gate before it happens — is what
keeps installed builds from breaking (web/CLAUDE.md invariant 11). Two incidents showed
instructions alone weren't enough, so the `ios-compat` CI job now blocks destructive
migrations that don't update the manifest; this skill is the release-side half of that
contract.

**The build number is `CFBundleVersion`** — the integer auto-stamped at Archive time as
the git commit count (`project.yml`'s `Auto-increment build number` postbuild
script, `git rev-list --count HEAD`). It is **not** `CFBundleShortVersionString` ("1.0").
The two are different numbers and the gate never reads the second one. Read the
authoritative value from the **App Store Connect build listing**, or compute it for any
commit with `git rev-list --count <sha>`.

Why-docs live in the vault, not the repo: the forced-update gate design (the vault's
`Reference/forced-update-gate.md`) and the postmortem this exists because of (the
vault's `postmortems/2026-08-24-teams-couldnt-load-testflight.md`).

**REQUIRED BACKGROUND:** `AGENTS.md` invariant 11; the vault's
`Reference/forced-update-gate.md` ("Release sequencing", "Build number, not version
number", "Do not arm before the listing is public"). `.claude/skills/db-migration` for
the migration-side contract (destructive migrations need the `-- IOS-COMPATIBILITY:`
annotation).

## The release train

iOS ships on a fixed two-week train: **cut Tuesday, submit Wednesday**, every other week (1.1 cuts 2026-10-13). Whatever is merged to `main` at the cut ships; unfinished work stays behind a feature flag (`SHIPPING.md` → Feature flags). Cadence, scope rules and the board fields are in the vault's `Reference/ios-release-train.md`; each train has a note at `Projects/depth/Releases/<version>.md` whose checklist mirrors the steps below.

1. **Cut (Tuesday).** From a clean, current `main`, bump `CFBundleShortVersionString` in `project.yml` to the train's version (minor per train, patch per hotfix), run `xcodegen generate`, and land it as `chore(release): cut ios <version>`.
2. Archive that merge commit (Release config) and upload. The build number is `git rev-list --count <sha>`; record it as `build:` on the release note.
3. Tag it: `git tag -a ios-v<version> <sha> -m "iOS <version> (build <n>)"` and push the tag.
4. `scripts/ios-release-notes.sh` lists the app commits since the previous `ios-v*` tag; turn that into the App Store "What's New" copy on the release note.
5. Moment ① below, and set the release note's `status: testflight`.
6. **Submit (Wednesday).** Install the current App Store build, upgrade to the TestFlight build, smoke-test, then submit with phased release on. `status: review`.
7. **LIVE.** Moment ② below; set `live:` and `status: live`. Arm the gate only if a breaking backend change is waiting on this build.

At most one risky change (backend contract, navigation, new data source) rides each train; the ticket carries `risky: true`. A hotfix (`<version>.1`) is out of band, carries only the fix, and does not move the next cut.

A skipped train keeps its version: "Skip train" on the Releases board moves the release and every later planned train two weeks out and adds the missed cut day to the release note's `skipped:` list. Always read the train's dates from its note; never assume the 14-day grid.

## Running the train as an agent

A scheduled agent runs this twice a day. Everything below is the agent's job; **archiving, uploading and submitting stay with the release owner**, and the agent never touches App Store Connect beyond reading it. Each run is one pass: find the active train, check where it actually is, do the work for that step, notify only when something changed or the release owner is needed, and stop.

**Read state, don't remember it.** `scripts/ios-release-status.mjs <version>` prints the train's real `stage` (`none` → `processing` → `testflight` → `review` → `live`, or `rejected`). It reads App Store Connect with the API key in `~/.config/depth/app-store-connect.json`. Without a key it can only see `live`. In that case, say in the notification that the step needs the key or the release owner's word.

0. **Sync.** `git pull` both the depth repo and the vault. The active train is the lowest-version note in `Projects/depth/Releases/` whose `status` is not `live`. If every note is live, create the next one with the board's shape: next minor version, cut 14 days after the last train's cut, submit the day after. Copy the checklist from the newest note.
1. **Before the cut day** (`status: planning`, today < `cut`): do nothing. On the day before the cut, send one heads-up listing the train's tickets that are not `Done`; they will roll. In the same heads-up, list any unflagged half-done feature: an epic (`theme:`) with open tickets whose merged app code (`Depth/` outside tests, since the last `ios-v*` tag) a user could see. Name the epic and the commits so the release owner can gate them before the cut.
2. **Cut** (`status: planning`, today ≥ `cut`):
   - Check that `main`'s latest CI run is green. If it is red, notify and stop.
   - Move every ticket whose `release:` is this version but whose status is not `Done` to the next train. Create the next train's note if needed.
   - Count `risky: true` tickets. More than one is a warning in the notification and the note's Notes, not a reason to stop.
   - Land `chore(release): cut ios <version>`: a branch from `main`, `CFBundleShortVersionString` bumped in `project.yml`, `xcodegen generate`, a PR with auto-merge (`ship-pr` conventions).
   - Set `status: cut` and tick the first checklist item.
   - Notify: "iOS <version> cut: archive `main` once #<PR> merges."
3. **Uploaded** (`status: cut`, stage `testflight`):
   - Take the newest `VALID` build number `N`. The archived commit is the `N`th commit on `main` (`git rev-list --reverse origin/main | sed -n "${N}p"`). Confirm `git rev-list --count <sha>` equals `N`. A mismatch means the build was not archived from `main`; notify and stop.
   - Record `build: N` on the note.
   - Tag and push: `git tag -a ios-v<version> <sha> -m "iOS <version> (build N)"`.
   - Draft "What's New" on the note from `scripts/ios-release-notes.sh`. Write user-facing copy: what a fan notices, no internal chores.
   - Moment ① below, as a `docs:` PR with auto-merge.
   - Set `status: testflight` and tick those items.
   - Notify: "Build N of <version> is on TestFlight: upgrade-test from the App Store build, then submit with phased release." If today is past `submit` and the stage is still `none`, send one reminder to archive, noted on the release note so it is sent only once.
4. **Submitted** (`status: testflight`, stage `review`):
   - Set `status: review` and tick "Submitted".
   - If App Store Connect shows no phased release, warn.
   - On stage `rejected`, notify at once with the state. Do not resubmit.
5. **Live** (stage `live`):
   - Moment ② below as a `docs:` PR with auto-merge.
   - Set `live:` to today and `status: live`, and tick the items.
   - Make sure the next train's note exists.
   - If a ticket is waiting on this build (e.g. a contract change blocked until it is LIVE), say so in the notification. **Do not arm the gate**: that stays the release owner's decision, via the section below.
   - Notify: "<version> is live."

The agent never: archives, uploads or submits a build; changes anything in App Store Connect; arms the gate; merges anything but its own cut and manifest PRs; or moves a train's dates. Rescheduling and skipping are the release owner's, on the board.

## The two moments

### Moment ① — You submit a build (uploaded to App Store Connect / TestFlight)

1. Record it in `ios-release-compatibility.md` as **submitted, not yet LIVE**:

   ```markdown
   - **Current App Store build (`CFBundleVersion`):** **<N>** — submitted for review, **not yet LIVE** (as of <date>)
   ```

2. **Do not touch "Minimum supported build".** Arming before the listing is public
   locks out the only channel with installs (TestFlight builds share the
   `CFBundleVersion` scheme, so a raised minimum bricks your own testers). The vault
   gate doc is explicit: "Do not arm before the listing is public."
3. If this is a breaking-change build (one that changes a column/shape an *older*
   installed build still reads), do **not** ship the backend change in that PR either.
   The compatible build must be LIVE first — a merged PR or TestFlight upload is not a
   compatibility milestone.

This is a small `docs:` commit or PR. A submitted build earns no gate, no contract
history row, and no backend change.

### Moment ② — The build goes LIVE in the App Store

1. **Confirm it is actually LIVE**: App Store Connect shows the build distributed, and
   the store listing offers it to users. "Approved", "pending developer release", or
   "available on TestFlight" does **not** count. Propagation is not instant.
2. Update the manifest (same file, "Current contract" section):

   ```markdown
   - **Current App Store build (`CFBundleVersion`):** **<N>** — **LIVE** as of <date>
   ```

3. Add a row to **Schema change history** **only if** this build changed the
   client/backend contract (new/removed selected columns, changed JSON shape, new enum
   values an old build can't decode, etc.). A plain launch/feature build with no
   contract change gets no row.
4. A normal LIVE build stops here. Commit the manifest update (`docs:` scope).

## Arming the forced-update gate — only when a breaking change is pending

The gate blocks old builds. It is **not** an emergency lever and **not** a routine
release step — you arm it **only** ahead of a specific breaking backend change, and
only after the fixed build is LIVE:

**Order is non-negotiable:**
1. The fixed build (containing the gate and understanding the new contract) is
   **LIVE in the App Store**.
2. **Then** arm the gate: a *migration* (never a dashboard edit, never a doc edit)
   raising `app_config.minimum_supported_build` to that build number. Scaffold with
   `supabase migration new arm_update_gate_build_<N>` (a hand-written timestamp
   desyncs Supabase's git integration and wedges the deploy), then:

   ```sql
   -- forced-update gate. Build <N> is LIVE in the App Store as of <date>; this blocks
   -- every install below it ahead of <the breaking change this precedes>.
   update app_config set minimum_supported_build = <N>, updated_at = now() where id;
   ```

   Update the manifest's "Minimum supported build" **in the same PR** as the migration.
3. **Then** the breaking backend change itself may ship — and it must carry the
   `-- IOS-COMPATIBILITY:` annotation and its own manifest update (the `ios-compat` CI
   job enforces this).

Any `-- IOS-COMPATIBILITY:` annotation / manifest contract change paired with the
migration must name the **live** build (step 1) in "Safe after App Store build <N> is
LIVE." — never the build that's merely submitted or on TestFlight. Passing the CI
guard is not approval to ship; the build must be LIVE and the gate armed first.

## Current state

Read it from `ios-release-compatibility.md` ("Current contract"): the live build, the armed minimum, and the gateable floor. This skill deliberately keeps no copy, because a second copy goes stale.

## Quick reference

| When | What changes | Gate? |
|---|---|---|
| Train cut (Tuesday) | Version bump PR, archive, `ios-v<version>` tag, release note `build:` | No |
| Build submitted | Manifest: "submitted, not yet LIVE" | No |
| Build **LIVE** | Manifest: "**LIVE** as of <date>"; history row only if contract changed | No |
| Breaking change pending + fixed build LIVE | Migration raising minimum + manifest "Minimum supported build" | **Yes — in this order** |
| Breaking backend change | Annotation + manifest update (CI-enforced) | After gate armed |

- Build number = `CFBundleVersion` from App Store Connect = `git rev-list --count <sha>`
- Never arm the gate before the listing is public
- TestFlight upload is not a compatibility milestone
- The gate arms via migration, never hand or dashboard

## Red flags — stop

- Arming the gate (raising minimum) before the fixed build is **LIVE** — you brick the
  only channel with installs.
- Using the marketing version ("1.0") instead of `CFBundleVersion` — the gate never
  reads the version string.
- A breaking schema/data change shipping on a submitted (not LIVE) build.
- Editing `app_config.minimum_supported_build` by hand / in the dashboard — it goes
  through a migration, applied by the Supabase git integration on merge.
- A destructive migration PR without the `-- IOS-COMPATIBILITY:` annotation and a
  manifest update — the `ios-compat` CI job fails, and the escape hatch is the
  annotation + manifest, not force-merging.

## Common mistakes

| Mistake | Fix |
|---|---|
| Manifest shows a submitted build as live | Mark it "submitted for review, **not yet LIVE**" until App Store Connect shows it distributed |
| Gate minimum raised in the same PR as the build submission | Split them: gate arming is a *post*-LIVE, pre-breaking-change migration |
| Breaking migration + compatible build in one PR, merged together | The migration applies on merge; the build isn't a compatibility milestone until LIVE |
| Referring to commits by SHA after a history rewrite | Refer to PR numbers and build-number floors (e.g. "T5, #355 → build ≥ 321") — SHAs move, build counts and PR numbers don't |
| A "breaking" build whose manifest has no history row | Add the row when the build is LIVE (Moment ②-3) — that's what makes the contract reviewable |