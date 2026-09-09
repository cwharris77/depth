---
name: release-ios
description: Use when an iOS build is going out — you archived a build and are uploading to App Store Connect / TestFlight, you submitted a build for review, a build went LIVE in the App Store, or you are about to arm the forced-update gate ahead of a breaking backend change. Covers recording the release in ios-release-compatibility.md, when the gate may (and may not) be armed, and the ordering that keeps installed builds decodable (CLAUDE.md invariant 11).
---

# iOS release & compatibility manifest protocol

## Overview

Every App Store release ties a **build number** to the backend contract in
`ios-release-compatibility.md` (repo root). A build's lifecycle touches that manifest
**twice**: when you **submit** it, and when it goes **LIVE**. Getting the second
moment right — and never arming the forced-update gate before it happens — is what
keeps installed builds from breaking (CLAUDE.md invariant 11). Two incidents showed
instructions alone weren't enough, so the `ios-compat` CI job now blocks destructive
migrations that don't update the manifest; this skill is the release-side half of that
contract.

**The build number is `CFBundleVersion`** — the integer auto-stamped at Archive time as
the git commit count (`ios/project.yml`'s `Auto-increment build number` postbuild
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

## Current state (keep updated as releases happen)

- **Current App Store build:** 587 — submitted for review, **not yet LIVE** (as of
  2026-09-08)
- **Minimum supported build:** 1 — gate **not armed**
- **Gateable floor:** build 321 (T5, #355). Any build ≥ 321 contains the forced-update
  gate; 587 qualifies, so it becomes armable the moment it is LIVE.

> These live in `ios-release-compatibility.md` — this block is a snapshot for quick
> reference, not a second source of truth. Prefer reading the manifest.

## Quick reference

| When | What changes | Gate? |
|---|---|---|
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