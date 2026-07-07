# Phase E — contracts & cap

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase E / Future Ideas #4 ("player contract costs / cap").
Depends on: nflverse scaffolding spec (`lib/nflverse/{csv,assets,crosswalk}.ts` must
exist). The board-cap part additionally depends on Phase D boards.

## Goal

1. Show a player's contract on their card (value, APY, guaranteed, years, cap share).
2. Show a board's total cost ("could the Jags actually afford this?") — the reason
   Cooper wanted contracts at all.

## Verified source facts (2026-07-07)

- `https://github.com/nflverse/nflverse-data/releases/download/contracts/historical_contracts.csv.gz`
  (gzip; use `node:zlib gunzipSync`). Columns: `player, position, team, is_active,
  year_signed, years, value, apy, guaranteed, apy_cap_pct, inflated_value, inflated_apy,
  inflated_guaranteed, player_page, otc_id, date_of_birth, height, weight, college,
  draft_year, draft_round, draft_overall, draft_team, season_history`.
  Data is OverTheCap-sourced (nflverse ingests OTC — we never scrape OTC ourselves).
- **No gsis/espn id on contract rows.** Join: `players.csv` master crosswalk
  (`otc_id → espn_id`), the same file the stats slice already fetches.
- `value`/`apy`/`guaranteed` are in **millions of dollars** (floats, e.g. `255.0`).

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| What to ingest | Only rows whose `otc_id` crosswalks to a **current** `players.id`, and only each player's rows from the file (all their contracts, active + past). Skips counted into `ingestion_runs.errors`. | The card shows a current player's deal (+history); ingesting 30k unmatched historical contracts serves nothing yet. |
| Table | `contracts(player_id fk→players cascade, otc_id text, year_signed smallint, years smallint, value numeric, apy numeric, guaranteed numeric, apy_cap_pct numeric, is_active boolean, updated_at, primary key (player_id, otc_id, year_signed))` + index on `player_id` + RLS public-read (same pattern as `player_stats`). | Multiple contracts per player (rookie deal → extension) are real rows, not overwrites. |
| Money formatting | `lib/format.ts` `formatMillions(n)`: `< 1` → `$450K`, `>= 1` → `$25.5M` (one decimal, strip `.0`). Tested. | One shared formatter; no per-surface drift. |
| Card display | A "CONTRACT" block on `PlayerCard` under the stats block (active contract only): four stat tiles — `Total {formatMillions(value)}`, `APY {formatMillions(apy)}`, `G'teed {formatMillions(guaranteed)}`, `{years} yrs (signed {year_signed})` — plus a muted `"{apy_cap_pct}% of cap"` line when present. No contract row → block absent (no zeros). Fetched with the existing per-player stats call: **extend `/api/players/[id]/stats` to return `{ stats, contract }`** rather than adding a second round-trip. | Same lazy-load posture as stats; one fetch per card open. |
| Board cost (needs Phase D) | Board page header gets a chip: `Σ APY {formatMillions(total)}` summing active-contract APY over the board's `espn:` refs; historical (`gsis:`) refs are excluded and the chip shows `+N historical` when any exist. Computed server-side in `resolveBoardRoster`'s query pass (one `.in('player_id', ids).eq('is_active', true)` query). Tapping the chip opens a BottomSheet listing each player's APY, sorted desc, unpriced players last with "—". | The "realistic roster" judgment is the user's; we surface the number, not a hard cap validator (the real cap has void years/restructures we can't model honestly). |
| Attribution | `docs/nflverse.md` gains a line: contract data via nflverse `load_contracts`, OTC-sourced. No UI attribution required (nflverse posture, not FTN CC-BY-SA). | Matches the license notes in the vault's Data Sources. |

## Files

- migration `<ts>_add_contracts.sql` + `npm run db:types`.
- `lib/nflverse/transform.ts` — add `toContractRows(contractCsvRows, otcToEspn:
  Map<string,string>, knownPlayerIds: Set<string>): { rows, skipped }` (pure; numbers
  coerced as in the stats transform; `is_active` is the string `"TRUE"/"FALSE"` in CSV —
  normalize).
- `lib/nflverse/crosswalk.ts` — add `buildOtcCrosswalk(playersCsvRows): Map<otc_id,
  espn_id>` beside the gsis one.
- `scripts/ingest-nflverse.mts` — add a contracts step (fetch, gunzip, transform, upsert
  `onConflict: player_id,otc_id,year_signed`); it runs in the same weekly workflow.
- `lib/roster-source.db.ts` — `getPlayerContract(playerId)` (active row, newest
  `year_signed`); extend the stats route's payload.
- `components/PlayerCard.tsx` — the CONTRACT block.
- Phase-D board files — the Σ APY chip + sheet (skip this part cleanly if D hasn't
  shipped; the card block must not depend on it).

## Tests

- `toContractRows`: happy, no-crosswalk skip, TRUE/FALSE coercion, millions stay numeric.
- `buildOtcCrosswalk`: missing otc_id omitted.
- `formatMillions`: 0.45→$450K, 25.5→$25.5M, 255→$255M.
- Live-DB: `getPlayerContract` returns the active deal for a seeded star (skip pattern).
- Browser: a star QB card (block renders), a practice-squad player (absent), 390px.

## Task/PR breakdown

1. **PR1** — ingest + schema (+ crosswalk/transform tests).
2. **PR2** — card block + API payload extension.
3. **PR3** (after Phase D) — board Σ APY chip + sheet.

## Out of scope

Cap-space-remaining math, void years/restructure modeling, contract history timelines on
the card, team payroll pages, OTC API (direct) integration.
