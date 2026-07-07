# Phase E — real formations (per-team personnel + alignment)

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase E / Future Ideas #6 ("real formations a team runs").
Depends on: nflverse scaffolding spec. Independent of C/D.

## Goal

The field can show the offense the team **actually lines up in** — its most-used
personnel grouping and QB alignment from real play data — instead of only the generic
base look, with usage percentages ("SEA: Shotgun 11 personnel, 61% of snaps").

## Verified source facts (2026-07-07, sampled from the live 2024 file)

- `pbp_participation_<YYYY>.csv` (tag `pbp_participation`), seasons **2016–2025** exist.
  2023+ is FTN-charted (**CC-BY-SA 4.0 — UI attribution required**, see below); 2016–22
  is NGS-sourced with a *different, finer* formation vocabulary. **v1 uses the latest
  available season only**, so only the FTN vocabulary needs handling.
- Actual FTN-era values (sampled from `pbp_participation_2024.csv`):
  - `offense_formation` ∈ `SHOTGUN` | `UNDER CENTER` | `PISTOL` | `''` (blank —
    kneel-downs/no-charting; exclude blanks from aggregation).
  - `offense_personnel` is a full listing, e.g. `"1 C, 2 G, 1 QB, 1 RB, 2 T, 1 TE, 3 WR"`
    (OL detail varies: `"3 G"`, `"4 T"`, `"1 FB"` appear). Parse it; do not enumerate it.
  - `possession_team` is the nflverse team abbrev (reuse the abbrev→slug mapping from the
    Phase-D rosters ingest, or build it here first if D hasn't shipped — it's 10 lines
    against `teams.abbrev`).

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| What defines a "real formation" | The pair **(qbAlignment, personnelCode)** where qbAlignment = `offense_formation` and personnelCode = standard NFL shorthand `{RB count}{TE count}` from parsing `offense_personnel` (FB counts as RB; C/G/T ignored; e.g. "1 RB, 1 TE, 3 WR" → `11`). | That pair is what the data reliably gives and what fans call formations ("shotgun 11"). |
| Aggregation | At ingest, count plays per team per (alignment, personnelCode), excluding blank alignment; store each team's **top 3** combos with `pct` (share of that team's charted plays, integer %). | Top 3 covers the story; the long tail is noise. |
| Table | `team_formations(team_id fk cascade, season smallint, rank smallint check 1-3, alignment text, personnel text, pct smallint, updated_at, primary key (team_id, season, rank))`, RLS public-read. | Read path = one tiny query per team. |
| Layout generation | Pure `buildRealFormation(alignment, personnelCode): FormationSlot[]` in `lib/formations.ts`. Composition rules: always 5 OL at the Phase-A LOS coordinates (C 50, G 43/57, T 36/64, all `onLine: true`, y as the existing base look). QB: UNDER CENTER y=56, PISTOL y=63, SHOTGUN y=68, x=50. Skill spots by counts, filling in this order:<br>• WRs: 1st → split end x=10 **onLine**; 2nd → flanker x=90 off-line (y=54); 3rd → slot x=26 off-line; 4th → slot x=74 off-line; 5th → tight slot x=33 off-line.<br>• TEs: 1st → x=71 **onLine**; 2nd → x=29 onLine **only if** WR count < 1 (else off-line wing x=76, y=54); 3rd → wing x=24 off-line.<br>• RBs: 1st → x=50 y=76 (UNDER CENTER/PISTOL) or offset x=58 y=70 (SHOTGUN); 2nd → x=42 y=70.<br>Line rule: exactly 7 `onLine` (5 OL + the slots marked onLine above; when TE/WR counts leave fewer than 7, promote the first off-line WR/TE to the line until 7 — same invariant the Phase-A test enforces, reuse that test against every generated combo). Unknown/absurd personnel (personnelCode not matching `^[0-3][0-3]$` or total skill players ≠ 5) → return the existing generic formation (never crash, never a half-layout). | Deterministic geometry from counts; the 7-on-the-line invariant is already the codebase's law and stays testable. |
| Slot→player resolution | Unchanged — slots are still `position + index`, resolved by `resolveUnit`. A `12` personnel look simply has `TE` index 0 and 1. | The Phase-1 decoupling pays off; zero resolver changes. |
| UI | In the offense unit only, a chip row appears under the unit toggle: `Base` + one chip per stored combo, labeled `{alignmentLabel} {personnel} · {pct}%` (alignmentLabel: Shotgun/Under center/Pistol). Tapping swaps the formation slots (state in `DepthChartField`; not persisted, not in the URL). Defense/special: chips hidden. When `team_formations` has no rows for the team: no chip row at all (the feature is invisible, not broken). | Progressive disclosure on the existing surface; no new sheet needed for 4 chips. |
| Attribution (license-required) | While a real-formation chip is active, a muted one-line footer under the field: `Formation data © FTN Data (CC-BY-SA 4.0)`. Also added to `docs/nflverse.md`. | FTN charting is CC-BY-SA; attribution is the condition of surfacing it. |
| Ingest cadence | A step in the existing weekly nflverse workflow, latest available season via `latestAvailableSeason('pbp_participation', 'pbp_participation_')`. The file is ~50MB season-full; stream-parse (the csv parser gets an iterator mode: `parseCsvStream(lineIterable)` — same core, fed by a line splitter over the response body) and aggregate counts without materializing rows. | Off-season the file is static — idempotent re-runs are fine and keep the machinery uniform. |

## Files

- migration `<ts>_add_team_formations.sql` + `db:types`.
- `lib/nflverse/personnel.ts` — `parsePersonnel(s): { rb, te, wr } | null` and
  `personnelCode({rb,te})` (pure; FB→rb; blank/malformed → null).
- `lib/nflverse/csv.ts` — the streaming variant.
- `lib/formations.ts` — `buildRealFormation` + `alignmentLabel`.
- `scripts/ingest-nflverse.mts` — participation step writing `team_formations`
  (`source: 'nflverse'` run row already covers it; add counts to the run's jsonb).
- `lib/roster-source.db.ts` — `getTeamFormations(teamId)`; the team page passes them to
  `DepthChartField` as a prop (server-resolved like everything else).
- `components/DepthChartField.tsx` — chip row + footer attribution + slot swap.

## Tests

- `parsePersonnel`: the sampled strings above (incl. `"1 FB"` → rb+1, `"4 T"` OL noise
  ignored), blank → null.
- `buildRealFormation`: for every alignment × personnelCode in {10,11,12,13,21,22}:
  exactly 11 slots, exactly 7 onLine, no duplicate ids, all x in [5,95] — parameterized,
  reusing the Phase-A invariant test helpers. Unknown code → generic formation identity.
- Aggregation as a pure fold `tallyFormations(rows)` → top-3 with pct: happy, blank
  alignment excluded, tie broken by count then alphabetical.
- Browser: a team with chips (post local ingest) — swap to Shotgun 11, dots re-arrange,
  attribution line visible; Base restores; defense view shows no chips. 390px + 1280px.

## Task/PR breakdown

1. **PR1** — personnel parsing + aggregation + schema + ingest step.
2. **PR2** — `buildRealFormation` + UI chips + attribution.

## Out of scope

Defensive fronts (`defense_personnel`/`defenders_in_box` — a later mirror of this spec),
per-play browsing, route data (`route` column feeds the play-diagrams spec's *future*
data option, not this one), NGS-era (pre-2023) vocabulary support, persisting the chip
choice.
