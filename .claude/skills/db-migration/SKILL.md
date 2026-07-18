---
name: db-migration
description: Use when a task in the depth repo touches the Postgres schema or DB-adjacent code — adding/altering a table or column, writing a supabase/migrations file, seeding data, changing lib/database.types.ts, lib/roster-source.db.ts row types, or ingest upserts. Also use when a type error mentions Database["public"]["Tables"].
---

# Schema changes (Supabase migration dance)

## Overview

A schema change here is never just SQL: it's a migration + regenerated types + read
layer + write layer moving together in one PR. `lib/database.types.ts` is generated
from **local** Postgres, so the order of operations matters — types come from the
migration, code comes from the types. Skipping a step produces the repo's worst bug
class: row-shape mismatches that pass typecheck and fail at runtime.

**REQUIRED BACKGROUND:** `docs/espn.md` ("Generated types", "Deferred: RLS") and
`AGENTS.md` §2 invariants 8–10.

## The dance, in order

### 1. Write the migration

```bash
supabase migration new <snake_case_name>   # new file under supabase/migrations/
```

- **Never edit an already-applied migration** — history is append-only; fix-ups are
  new migrations.
- Comment the SQL the house way: what the object is *for* and the constraint it
  enforces, not a restatement of the DDL. See
  `20260705043556_add_uniforms_table.sql` for tone.
- New tables need grants — follow the precedent in
  `20260701171029_grant_default_table_privileges.sql` (default privileges may already
  cover you; check before duplicating).
- **New public tables ship with RLS on.** The auth phase (Phase C) has shipped —
  `AGENTS.md` invariant 10 now requires `enable row level security` plus a
  `"public read"` policy in the *same* migration as the table (precedent:
  `20260710140000_base_table_rls.sql`, `20260717081108_add_player_stats.sql`). The
  only remaining red flag is enabling RLS **without** a matching read policy — that's
  what breaks `dbRosterSource` for every visitor, not RLS itself.

### 2. Apply locally, regenerate types

```bash
supabase start          # if the local stack isn't running
supabase db reset       # rebuilds local Postgres from supabase/migrations/
npm run db:types        # regenerates lib/database.types.ts from LOCAL Postgres
```

- `lib/database.types.ts` is **generated** — never hand-edit it, even to "quickly
  unblock" a type error. A hand-edit silently reverts on the next regeneration.
- `git diff lib/database.types.ts` and confirm the diff matches your migration and
  nothing else. An unexpected diff means local Postgres had drift — reset and rerun.

### 3. Update the read layer together with the types

In `lib/roster-source.db.ts`, each table has a `Pick<Tables["…"]["Row"], …>` row type
**and** a matching SELECT column string. They must change in the same edit:

- New column consumed by the app → add to the `Pick` **and** the SELECT string
  (they're duplicated on purpose; the compiler only checks the `Pick`).
- Nullable DB columns get explicit `??` fallbacks at the mapping boundary
  (`toTeam`/`toPlayer`/`toUniform` pattern) — app types stay non-null.
- Dangling references are skipped, never thrown (invariant 6).

### 4. Update the write layer

- Ingest writes (`scripts/ingest-espn.mts`) and any seed are **idempotent upserts**
  (`ON CONFLICT (id) DO UPDATE` / supabase-js `upsert`) — a rerun is always safe.
- Respect provenance scoping: a machine writer only touches its own rows (e.g.
  `source='espn'`), a curated seed only its own (`source='curated'`). Never write a
  blanket `DELETE`/`UPDATE` across provenances.
- Curated seed data is authored in typed TS (`lib/uniforms/data.ts` pattern) and
  guarded by the contrast/integrity test suite; the archive is append-only.

### 5. Verify

```bash
npx tsc --noEmit
npm test               # includes lib/__tests__/roster-source.db.test.ts —
                       # it SKIPS silently without SUPABASE_* env vars, so run it
                       # locally with .env.local present; CI green ≠ DB layer tested
```

If the change affects assembled rosters, also hit a team page on the dev server
against local data and confirm the shape renders.

### 6. Ship

One PR containing: migration + regenerated `database.types.ts` + read-layer +
write-layer + tests. Hosted Supabase gets the migration through the pipeline on
merge — **never** apply schema by hand in the dashboard or via ad-hoc SQL against
prod; the hosted DB must stay reproducible from `supabase/migrations/`.

## Quick reference

| Need | Command / file |
|---|---|
| New migration | `supabase migration new <name>` |
| Rebuild local DB | `supabase db reset` |
| Regenerate types | `npm run db:types` (local Postgres, not hosted) |
| Read layer | `lib/roster-source.db.ts` — `Pick<>` + SELECT string, in lockstep |
| Write layer | `scripts/ingest-espn.mts` — idempotent, provenance-scoped |
| DB-layer tests | `lib/__tests__/roster-source.db.test.ts` (env-gated, skips without vars) |

## Red flags — stop

- Editing `lib/database.types.ts` by hand, for any reason.
- Editing a migration file that already has siblings after it.
- `ALTER ... ENABLE ROW LEVEL SECURITY` with no accompanying `"public read"` (or
  `auth.uid()`-scoped) policy in the same migration.
- SQL run against the hosted project outside a migration.
- A `Pick<>` changed without its SELECT string (or vice versa).
- "CI is green so the DB layer works" — the DB tests skip without env vars.

## Common mistakes

| Mistake | Fix |
|---|---|
| Types regenerated from the hosted project | Always local: local migrations are the schema's source of truth |
| Migration in one PR, types in the next | Same PR, always — the window between them is untyped runtime |
| Seed rewrites rows it doesn't own | Scope every seed/reconciler write by its `source` value |
| New non-null column without backfill | Backfill in the same migration, or the reset/pipeline fails |
