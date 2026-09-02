# Forced-update gate (DEP-425)

The native iOS app checks a server-controlled minimum build number at launch. Any install below it is blocked behind an "Update is available!" dialog over a brand backdrop, with no way to continue — the Clash of Clans pattern. It is a plain view, not a system `.alert`: iOS 26 leading-aligns alert text with no way to center it, and a view that is simply always on screen has no dismissal to race, which is the property a block actually needs. The only control is Update, which leaves for the App Store. This exists so depth can ship breaking backend changes (dropped columns, changed contracts) without carrying permanent backwards-compatibility shims for stragglers on old builds: old clients get blocked instead of silently degrading or crashing against a backend that has moved on.

Arming it is a one-row update, but it is not a standalone action: the flip is a planned release step, paired with a new build going live on the App Store and sequenced ahead of the breaking change it protects. See "Arming it" and "Release sequencing" below.

## The pieces

| Piece | Where |
| --- | --- |
| `app_config` singleton table | [`supabase/migrations/20260814120000_add_app_config.sql`](../supabase/migrations/20260814120000_add_app_config.sql) |
| Domain type | [`ios/Depth/Domain/AppConfig.swift`](../ios/Depth/Domain/AppConfig.swift) |
| Read (network-first, cache-fallback) | [`ios/Depth/Data/CachingDepthRepository.swift`](../ios/Depth/Data/CachingDepthRepository.swift) |
| Gate decision | [`ios/Depth/App/UpdateGateViewModel.swift`](../ios/Depth/App/UpdateGateViewModel.swift) |
| Blocking screen | [`ios/Depth/App/BlockingUpdateView.swift`](../ios/Depth/App/BlockingUpdateView.swift) |
| Arming it | a data migration under [`supabase/migrations/`](../supabase/migrations/) (see below) |
| App Store deep link | `APP_STORE_ID` in [`ios/xcconfig/Base.xcconfig`](../ios/xcconfig/Base.xcconfig) |

`app_config` is deliberately the only table the gate reads, and its shape is frozen by contract. A gate that had to decode the schema it protects would fail in exactly the situation it exists for, so **never add a column the gate's read depends on, and never change the two it already reads.**

## Why the gate reads before anything else

`UpdateGateViewModel` starts in `.checking`, and `ContentView` renders nothing that touches Supabase until it resolves. The check also runs ahead of the auth session refresh. This ordering is the whole point: a build too old for the current schema must never issue a read against that schema.

To keep that from costing a network round trip on every cold launch, the check is two-phase. The last known config is read from the SwiftData cache and decides provisionally, then the live read confirms or corrects it. Only a first-ever launch with no cache actually waits on the network.

The cache can only ever *decide earlier*, never override a successful live read. Because the minimum build is monotonic, the single direction it can be wrong in is cached-allows/server-blocks, which the live read corrects moments later.

The gate re-checks on foreground (`scenePhase`), so a flip reaches installs that are already running rather than only cold launches.

## Failure boundary

This is the app's one deliberate exception to root `CLAUDE.md` invariant 6 ("untrusted input degrades, never throws") — the feature's purpose is to *block* rather than degrade. The boundary is bounded explicitly:

- **Config reachable, build below minimum** → block.
- **Config reachable, build at or above minimum** → allow. The minimum is inclusive.
- **Config unreachable, a cached value exists** → decide from the cache. Going offline is not a way around the gate.
- **Config unreachable, nothing ever cached** → **allow.** A backend outage must never brick first launch.

## Arming it

The gate is **not an emergency lever**. It is a planned release step: you flip it in tandem with a new build becoming available on the App Store, ahead of shipping a breaking backend change. Nothing about it needs to be fast, so it goes through the same reviewed path as every other change to hosted data — a migration, applied by the Supabase git integration on merge.

There is deliberately no script and no dashboard step. Nobody hand-edits this row.

```bash
supabase migration new arm_update_gate_build_412
```

Then write the one statement into the generated file:

```sql
-- DEP-425 forced-update gate. Build 412 is LIVE in the App Store as of <date>;
-- this blocks every install below it ahead of <the breaking change this precedes>.
update app_config set minimum_supported_build = 412, updated_at = now() where id;
```

Open a PR with it, merge, and the git integration applies it. Standing the gate back down is the same shape with `minimum_supported_build = 1` (and `maintenance_message = null`, so copy written for one release never resurfaces on the next).

Always scaffold with `supabase migration new` rather than hand-writing a filename — an invented timestamp desyncs the git integration from the committed file and wedges the deploy.

To set the copy shown on the blocking screen in place of the generic line, include `maintenance_message` in the same statement.

## Release sequencing — get this order right

The gate blocks users. Arming it before a compliant build is actually installable locks people out with nowhere to go, and the fix is another PR.

1. Ship the new build and let it reach **LIVE in the App Store** — not "approved", not "pending developer release". Note its `CFBundleVersion` (auto-set to the git commit count on archive; see `ios/project.yml`).
2. Confirm the store listing actually offers that build to users.
3. Only then merge the migration raising the minimum to that build number.
4. Only once the gate is live and blocking may the breaking backend change ship.

Step 1 is not optional. App Store propagation is not instant, and a minimum above every available build is indistinguishable to users from the app being broken.

### Build number, not version number

`minimum_supported_build` is compared against **`CFBundleVersion`** — the integer build number, auto-stamped as the git commit count on archive (`ios/project.yml`). It is *not* `CFBundleShortVersionString`, the marketing version shown in the App Store ("1.0"). Those are different numbers and the gate never reads the second one. Take the build number from the App Store Connect build listing, not from the version string.

### Do not arm before the listing is public

While the app is in review or otherwise not yet released, arming the gate is unsafe even with `APP_STORE_ID` set correctly:

- The App Store product page is not publicly reachable, so the Update button deep-links to a dead end.
- TestFlight builds share the same `CFBundleVersion` scheme, so a minimum above your testers' installed build locks out the only channel with real installs.
- There is no old-client cohort to block yet, so there is nothing to gain against that risk.

The gate first earns its keep at the *second* release: 1.0 goes live, you later ship a build carrying a breaking change, and you raise the minimum to that build once it is live in the store.

### Still true regardless

**The gate only blocks builds that contain the gate.** It shipped in T5 (`7c4d88d`, #355), so every build from that point on is gateable.

## Testing it locally

Only the **Debug** scheme is safe to write to. The **Staging** scheme points at the real production Supabase project — depth has no separate staging backend — so a "staging" run is a prod run, and the `psql` below must never be pointed anywhere but `127.0.0.1`.

Debug points at the local `supabase start` stack and builds with `CFBundleVersion = 1`, so raising the local minimum to 2 blocks:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "update app_config set minimum_supported_build = 2 where id;"
```

Relaunch to see the block; set it back to 1 to unblock. Flipping it while the app runs and then backgrounding/foregrounding exercises the `scenePhase` re-check.

Unit coverage for the full decision table is in [`ios/DepthTests/UpdateGateTests.swift`](../ios/DepthTests/UpdateGateTests.swift).
