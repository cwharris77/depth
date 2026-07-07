# Phase E — draft history + prospect draft boards

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase E / Future Ideas #5 ("draft boards").
Depends on: nflverse scaffolding (part 1); Phase C auth + `lib/slug.ts` (part 2).

## Goal

1. **Draft history on the card** — where a current player was drafted ("R1 P5 · 2024").
2. **Prospect draft boards** — a user builds their own ranked big board of **college
   players** ahead of a draft, and can share it.

## Verified source facts (2026-07-07)

- nflverse `draft_picks/draft_picks.csv` — single all-history file. Columns used:
  `season, round, pick, team, gsis_id, cfb_player_id, pfr_player_name, position,
  college`. Joins to our players via the `players.csv` crosswalk (`gsis_id → espn_id`).
- **CollegeFootballData (CFBD)** — free API key (https://collegefootballdata.com/key),
  Bearer auth. Verified endpoints (openapi probe): `/player/search` (college players by
  name), `/draft/picks`, `/recruiting/players`. There is **no public "prospect
  rankings/big board" endpoint anywhere** — rankings are editorial (ESPN/PFF paywalled).
  So the board is **user-ranked by construction**; we supply search, the user supplies
  the order. That's also the product: *their* board, not a scraped consensus.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Part 1 storage | Columns on `players` are wrong (draft facts are immutable history; players get re-upserted weekly). New table `draft_picks(player_id fk→players cascade, season smallint, round smallint, pick smallint, team_abbrev text, college text, primary key (player_id))` — one row per current player, only crosswalk-matched rows ingested. RLS public-read. | Same lean-ingest rule as contracts. Undrafted players simply have no row → card shows "Undrafted" **only when** `experience > 0` (a rookie UDFA vs "not yet drafted" ambiguity isn't worth solving). |
| Part 1 display | One line in the PlayerCard bio area: `Drafted R{round} P{pick} · {season} ({team_abbrev})` or `Undrafted`. Data rides the existing `/api/players/[id]/stats` payload (now `{ stats, contract, draft }`). | Third rider on the same lazy fetch. |
| Prospect data flow | **Live proxy, no prospect ingestion.** `app/api/prospects/search/route.ts` — GET `?q=`, calls CFBD `/player/search?searchTerm=` with `CFBD_API_KEY` (server env secret), maps to `{ cfbdId, name, position, school, year }`, in-memory LRU + `Cache-Control: s-maxage=86400`. On upstream failure → 502 with `{ error: 'prospects-unavailable' }`; the UI shows "Prospect search is down — try later". | College rosters churn; caching a snapshot into Postgres buys staleness for no benefit. The key is server-side only. |
| Board model | One **prospect board per user** (v1): `prospect_boards(user_id uuid pk fk auth.users cascade, slug text unique not null, name text not null default 'My draft board', updated_at)` + `prospect_board_entries(user_id uuid fk cascade, rank smallint not null, cfbd_id text not null, name text not null, position text not null, school text not null, primary key (user_id, cfbd_id), unique (user_id, rank))`. Entry data is **denormalized at add time** (CFBD is a live external source; the board must render without it). RLS: boards + entries public-read, owner-write (same policy shapes as Phase D boards). | A big board is a yearly artifact; multiple named boards is D-style scope creep. Denormalization makes shared boards permanent. |
| Board UI | Route `/draft-board` (own, must be signed in — signed out shows the Phase-C sign-in row) and `/draft-board/[slug]` (public read-only). A ranked list: `#{rank}` ordinal gutter, name, position badge, school — drag to reorder with Framer Motion `Reorder` (exact pattern from the Phase-C v0 depth reorder, always-on here since the whole page is an editor), ✕ to remove, an "Add prospect" search input pinned at top (debounced 200ms like NavSwitcher). Max 100 entries (400 past it). Share button copies `/draft-board/[slug]`. | Reuses the two interaction patterns the app already proved (drag reorder, debounced search). A field view makes no sense for a big board — this is deliberately the app's first list-first page, styled with the existing dark card language (no white card grids — AI-slop guardrail applies). |
| Rank integrity | Reorder PUTs the **full ordered cfbd_id array**; the server rewrites all ranks in a transaction (delete-and-reinsert entries' ranks). No incremental rank arithmetic. | The unique `(user_id, rank)` constraint makes incremental swaps a constraint-violation minefield; full-array rewrite is small (≤100 rows) and atomic. |
| Entry point | NavSwitcher account area: "My draft board" row under "My boards". | Same surface as every account feature. |

## Files

- migrations `<ts>_add_draft_picks.sql`, `<ts>_add_prospect_boards.sql` + `db:types`.
- `lib/nflverse/transform.ts` — `toDraftPickRows(csvRows, gsisToEspn, knownPlayerIds)`
  (keep each player's **most recent** draft row should duplicates appear; dedupe by
  player_id).
- `scripts/ingest-nflverse.mts` — draft-picks step (single file, no per-season loop).
- `app/api/prospects/search/route.ts`; env `CFBD_API_KEY` (add to `.env.local.example`
  as a placeholder with the signup URL; the GitHub workflow does NOT need it — no
  prospect ingestion exists).
- `app/api/draft-board/route.ts` — GET own (creating the row+slug on first GET), PATCH
  `{name}`, PUT `{orderedCfbdIds}` (rank rewrite), POST `{prospect}` (add at bottom),
  DELETE `?cfbdId=` (remove).
- `app/api/draft-board/[slug]/route.ts` — public GET.
- `app/draft-board/page.tsx`, `app/draft-board/[slug]/page.tsx`,
  `components/DraftBoard.tsx`.
- `components/NavSwitcher.tsx` — the account row.

## Tests

- `toDraftPickRows`: happy, crosswalk-miss skip, duplicate → most recent season.
- Rank rewrite as a pure helper `reassignRanks(orderedIds, entries)` — full coverage:
  reorder, add, remove, unknown id in array ignored.
- Route tests (live-DB skip pattern): first-GET creates board; anon can read by slug,
  cannot write.
- Browser: add 3 prospects, drag-reorder, reload (order persists), open slug in private
  window (read-only), 390px.

## Task/PR breakdown

1. **PR1** — draft_picks ingest + card line.
2. **PR2** — prospect search proxy (+ its unavailable state, verifiable by unsetting the
   env var locally).
3. **PR3** — board schema + API + page.

## Out of scope

Consensus/editorial rankings ingestion (no legal source), mock-draft simulation, multiple
boards per user, per-team need-based suggestions, combining prospect boards with Phase-D
roster boards (a drafted prospect has no NFL ids yet — bridging happens naturally once
they appear in a post-draft ESPN ingest, no code needed).
