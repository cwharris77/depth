# Forced-update gate (DEP-425)

The native iOS app checks a server-controlled minimum build number at launch. Any install below it is blocked on a full-screen "Update Required" interstitial with no way to continue — the Clash Royale pattern. This exists so depth can ship breaking backend changes (dropped columns, changed contracts) without carrying permanent backwards-compatibility shims for stragglers on old builds: old clients get blocked instead of silently degrading or crashing against a backend that has moved on.

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

### Two preconditions that are not satisfied yet

- **`APP_STORE_ID` is `0`.** The blocking screen's Update button is hidden entirely while the id is unset, because a button that opens nothing is worse than no affordance on a screen the user cannot leave. Set it in [`ios/xcconfig/Base.xcconfig`](../ios/xcconfig/Base.xcconfig) once the App Store Connect record exists — no code change needed. **Arming the gate in production before this is set leaves blocked users with no route to the update.**
- **The gate only blocks builds that contain the gate.** It shipped in T5 (`7c4d88d`, #355), so every build from that point on is gateable.

## Testing it locally

Only the **Debug** scheme is safe to write to. The **Staging** scheme points at the real production Supabase project — depth has no separate staging backend — so a "staging" run is a prod run, and the `psql` below must never be pointed anywhere but `127.0.0.1`.

Debug points at the local `supabase start` stack and builds with `CFBundleVersion = 1`, so raising the local minimum to 2 blocks:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "update app_config set minimum_supported_build = 2 where id;"
```

Relaunch to see the block; set it back to 1 to unblock. Flipping it while the app runs and then backgrounding/foregrounding exercises the `scenePhase` re-check.

Unit coverage for the full decision table is in [`ios/DepthTests/UpdateGateTests.swift`](../ios/DepthTests/UpdateGateTests.swift).
