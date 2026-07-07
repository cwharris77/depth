# Phase 7 (PR3) — uniform archive launch

Date: 2026-07-07
Status: approved (design)
Roadmap: Phase 7 — Uniform archive. PR1 (data layer, depth#56) and PR2 (selector +
live recolor, depth#57) are merged; the feature is **code-complete but hidden** behind
`SHOW_UNIFORM_PICKER = false` in `components/DepthChartField.tsx`. This spec is the
launch: seed coverage, the image question, the flag, and prod data.

> Update 2026-07-07 (post-approval drift): the gate is no longer a const — it is now
> the `show-uniform-picker` Vercel flag (`lib/flags.ts`), evaluated in
> `app/team/[id]/page.tsx` and passed to `DepthChartField` as a prop. The locked
> "Flag removal" decision below still applies unchanged: at launch, delete the flag
> and render the button on `roster.uniforms.length > 1`.

## The gate, re-decided

PR2's comment gates launch on (1) prod ingest of teams + uniforms and (2) the seed
carrying real jersey pictures (`Uniform.imagePath`).

**Decision: launch on silhouettes; drop gate condition (2).** Reasoning, on the record:
- There is **no licensable source of jersey imagery** — GUD/SportsLogos images are
  copyrighted; team press photos are too. Re-checked 2026-07-07; nothing changed since
  the Data Sources research.
- The shipped `JerseySwatch` silhouette is generated from each kit's *real* colors —
  consistent across all kits, license-clean, and already the designed fallback.
- `imagePath` **stays fully supported**: any kit can get committed art later
  (`public/uniforms/<id>.png`, 3:4 aspect, transparent background) with zero code change.

> If Cooper disagrees, the alternative is hand-authoring per-kit SVG art — flag it before
> building, don't build it speculatively.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Flag removal | Delete `SHOW_UNIFORM_PICKER` entirely. The jersey header button renders when `roster.uniforms.length > 1` (Home is always present; a second kit is what makes a picker meaningful). Teams with no curated kits: button absent, page identical to today. | Data-driven visibility beats a build-time constant; un-curated teams never show a one-item picker. |
| Seed expansion (the launch content) | Append these rows to `lib/uniforms/data.ts` via the documented capture workflow (Roadmap Phase 7 steps 1–6: hexes from teamcolorcodes/TruColor/press images; `uiAccent` curated ≥4.5:1 on `#0a0e1a` using `contrastRatio`/`DARK_BG` from `lib/colors.ts`; the contrast test enforces it):<br>• the four seeded teams already in the file stay as-is (Seahawks '76, Bucs Creamsicle, Eagles Kelly Green, Broncos '77 — verify the file, don't duplicate)<br>• **2025 "Rivalries" kits** (all eight, `isCurrent: true`, `yearStart: 2025, yearEnd: null`): Bills, Dolphins, Patriots, Jets, Cardinals, Rams, 49ers, Seahawks<br>• **Famous throwbacks/alternates** (one each): Chargers powder blue (current alternate), Titans Oilers throwback (current), Packers 1950s classic (current), Bears orange (current), Saints black-and-gold color rush (current), Vikings purple classic (retired era — pick the era per TruColor), Jags teal throwback (current), Commanders 70s burgundy (current)<br>Total ≈ 20 new rows. Every row needs the era years from the reference sites — do not guess years; a kit whose era can't be sourced gets dropped from this batch, not invented. | Enough coverage that the picker feels like an archive, bounded enough to hand-curate in one sitting. The Rivalries set is the vault's own monitoring-workflow example — seeding it proves the loop. |
| Share integration | `rosterShareUrlPath` gains an optional `kitId`; the Share button includes `&kit=<id>` when the active kit isn't Home. (`ApplyKitFromQuery` already applies it on arrival — shipped in PR2.) | Sharing "look at this creamsicle roster" without the kit was a dangling thread. |
| Prod data | Runbook in the PR description (manual, needs the service key): confirm hosted migrations are applied (Supabase GitHub integration applies on merge), run `SUPABASE_URL=<prod> SUPABASE_SERVICE_ROLE_KEY=<prod> npm run ingest:uniforms`, spot-check two teams in prod. The ESPN ingest is already scheduled weekly and needs nothing. | `ingest:uniforms` is hand-run by design (hand-curated data, low cadence) — no new workflow. |
| Monitoring follow-up (vault-side, not this repo) | After this PR merges, create the recurring task the Roadmap planned: monthly during Feb–Aug, prompt: check https://news.sportslogos.net/ for new NFL uniform unveilings since the last check; if any, add a capture item to the vault `System/Inbox.md` naming team + kit + source link. Implemented as a Claude scheduled task (same mechanism as `daily-inbox-triage`). | The archive only stays current if unveilings can't slip by unnoticed. |

## Files

- `components/DepthChartField.tsx` — flag removal + `uniforms.length > 1` condition.
- `lib/uniforms/data.ts` — the seed rows.
- `lib/share.ts` (+ `lib/__tests__/share.test.ts`) — `rosterShareUrlPath(teamId,
  override, kitId?)`; kit param appended after order; both params compose.
- `components/DepthChartField.tsx` — pass the active kit id to the share path.

## Tests

- Existing `uniforms.test.ts` integrity/contrast suite automatically covers every new
  seed row (that's the point of it) — it must pass with the full batch.
- `share.test.ts`: kit param present when non-Home, absent when Home, composes with
  `?order=`.
- Browser: a seeded team shows the jersey button; an un-curated team doesn't; select a
  throwback → share → open link in private window → arrives wearing the kit; 390px.

## Task/PR breakdown

Single PR (the seed is data; the code delta is small), then the manual prod runbook,
then the vault-side scheduled task.

## Out of scope

Real jersey artwork (supported via `imagePath`, not produced here), field-background/
header tint per kit beyond what PR2's `themedRoster` already recolors, uniform pages/
archive browsing outside the picker, scraping any uniform site.
