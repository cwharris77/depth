# 5d — two-team compare view

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase 5 cherry-pick **5d** — the last unshipped foundation item. Design
direction was already locked by the 2026-06-29 design review (vault `Roadmap.md`
"Design specs → Two-team compare"); this spec turns it into an implementable unit.

> **For agentic workers:** the layout decisions here came from a design review and are
> deliberate (real table, not a card mosaic; two columns on mobile, never stacked).
> Do not restyle.

## Goal

Answer "who's deeper at WR, SEA or SF?": pick two teams and a position, see both teams'
depth at that position side-by-side, rank-aligned.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Route | **`/compare`** with query params `?a=<teamId>&b=<teamId>&pos=<Position>` | Bookmarkable/shareable comparisons for free; no dynamic segment explosion (32×32×19 pages is silly to prerender). |
| Rendering | Server component page; it reads the three params, resolves **both full rosters** via `dbRosterSource.getTeam` and passes only the two position groups + team metas to a client `CompareTable`. `export const dynamic = 'force-dynamic'` (params drive content). | Same "server resolves, client receives" rule as `/team/[id]` — never ship whole rosters to the browser. |
| Entry point | NavSwitcher idle view gains a "**Compare teams**" row (lucide `Columns2` icon) above the conference browser → navigates to `/compare` (empty state). On the compare page itself, each team slot is a tappable pill opening the existing team browser (NavSwitcher in a pick-a-team mode that calls back instead of navigating). | Nav is the primary surface; team picking reuses the switcher users know. |
| Position selector | A horizontal scrollable chip row of all field positions (`QB RB WR TE LT LG C RG RT DE DT LB CB S K P`), the current one filled with `uiAccent`-neutral styling (see color rule below). Defaults to `QB`. KR/PR/LS excluded (returners are editorial slots, not depth groups). | Depth is per-position; chips are the cheapest correct selector. |
| Depth source | `getPlayersByPosition(roster, pos)` (the existing tiebreak-stable helper), full group (not capped at 3) | The point is depth; show the whole room. |
| Layout | A real two-column table: header row = team abbrev + city (each tinted with that team's `uiAccent`), one row per depth rank (1, 2, 3, …), each cell = `#number Name` + status dot. Uneven depth → empty cell rendered as a dim "—". Rank column on the far left (`1st`, `2nd`, `3rd`, `4th`…). | From the design review: parallel columns, rank-aligned, NOT a symmetric card mosaic (AI-slop guardrail). |
| Mobile | Keep two narrow columns; player names render **last name only** below 480px (`formatLastName` — reuse the name-splitting already done for field labels in `PlayerDot`, extract to `lib/format.ts` if it lives inline). Never stack the columns. | Comparison is the whole point (design review). |
| Colors | Each column header and its players' status accents use that team's `uiAccent`. Page background/chrome stays the app dark theme; **no team-color fills on cells** (two competing brand colors on one surface — keep them to accents). | Contrast-safety rules from Phase 1.5. |
| States | Missing params → prompt state: both pickers shown large, position chips visible, table area shows "Pick two teams to compare". One team picked → same, with the picked side filled. Same team twice → allowed, table renders, small note under the header: "Same team on both sides". Unknown team id in URL → treat as unpicked (no 404 — it's a query param, degrade gracefully). Position with zero players on both sides → "Neither team lists a {pos}". | Every state from the design review, made concrete. |
| Player tap | Opens that team's page with the player's card via the existing deep link (`/team/[id]?player=<id>`) | Reuses `OpenPlayerFromQuery`; no card-in-compare complexity. |
| OG/meta | `generateMetadata`: title "SEA vs SF — WR depth · depth" when params complete, else "Compare teams · depth". No custom OG image in v1 (the generic app card serves). | Cheap; per-compare OG images are cut. |

## Files

- `app/compare/page.tsx` — server component described above. Param validation: team ids
  checked against `listTeams()`; `pos` checked against the Position union (invalid →
  default `QB`).
- `components/CompareTable.tsx` — client; receives `{ a: {team, players}, b: {team,
  players}, position }`, renders chips + pickers + table; picker/chip changes push new
  query params via `router.replace` (so the server component re-resolves — no client
  data fetching at all).
- `components/NavSwitcher.tsx` — the "Compare teams" row; a `pickMode` prop
  (`onPickTeam?: (id) => void`) that suppresses navigation when set.
- `lib/format.ts` — `formatLastName(name)` if not already extracted.

## Tests

- Param validation pure helpers (`parseCompareParams(searchParams) → {a?, b?, pos}`):
  valid, unknown team, bad pos, missing.
- `formatLastName`: suffixes ("Smith-Njigba", "St. Brown", "Jr." names — keep the same
  behavior PlayerDot already has; the test pins it).
- In-browser: SEA vs SF at WR (uneven depth shows "—"), same-team note, 375px two-column
  legibility, chip → URL round-trip, player tap lands on the team page with the card open.

## Task/PR breakdown

Single PR. `tsc --noEmit`, `npm run test`, browser verification at 375/768/1280px.

## Out of scope

- Comparing across seasons (needs D1; a natural follow-up: `?aSeason=`) — note it in the
  PR description as a future hook, build nothing.
- Whole-roster or multi-position compare grids; export/share images of the table.
