# Roadmap → tech specs index

Date: 2026-07-07
Purpose: one row per roadmap phase (vault `Projects/depth/Roadmap.md`), mapping it to
either its shipped record or the tech spec that makes it implementable with no further
design/product thinking. Specs in this directory are self-contained: hand one to an
implementing agent as-is.

## Pivot-era phases (the live roadmap)

| Phase | Status | Spec / record |
|---|---|---|
| **A — MVP: correct static field** | ✅ shipped | depth#9 (onLine formation geometry, responsive labels); as-built record in vault Roadmap "Phase A" |
| **B — Player photos + richer bios** | ✅ shipped | depth#15 (card photos); photos-on-dots intentionally dropped (vault Decisions 2026-07-03) |
| **C — Custom rosters** | 🟡 v0 shipped (depth#41 localStorage reorder, depth#55 `?order=` share) | Remainder: [`2026-07-07-phase-c-auth-and-saved-boards-design.md`](2026-07-07-phase-c-auth-and-saved-boards-design.md) — auth, server-side overlays, share-by-reference, RLS |
| **D — Cross-team moves + saved teams** | ❌ | [`2026-07-07-phase-d-history-and-boards-design.md`](2026-07-07-phase-d-history-and-boards-design.md) — historical seasons (D1) + boards with cross-team/era moves (D2). Requires C + nflverse scaffolding first |
| **E — Vision features** | ❌ | Five independent specs:<br>• [`2026-07-07-phase-e-coaches-design.md`](2026-07-07-phase-e-coaches-design.md)<br>• [`2026-07-07-nflverse-ingestion-and-player-stats-design.md`](2026-07-07-nflverse-ingestion-and-player-stats-design.md) (player stats — also the scaffolding D/E build on)<br>• [`2026-07-07-phase-e-contracts-design.md`](2026-07-07-phase-e-contracts-design.md)<br>• [`2026-07-07-phase-e-draft-boards-design.md`](2026-07-07-phase-e-draft-boards-design.md)<br>• [`2026-07-07-phase-e-real-formations-design.md`](2026-07-07-phase-e-real-formations-design.md)<br>• [`2026-07-07-phase-e-play-diagrams-design.md`](2026-07-07-phase-e-play-diagrams-design.md) |

## Foundation-era leftovers (still on the roadmap)

| Item | Status | Spec / record |
|---|---|---|
| **5d — Two-team compare** | ❌ | [`2026-07-07-compare-view-design.md`](2026-07-07-compare-view-design.md) |
| **7 — Uniform archive** | 🟡 PR1+PR2 shipped (depth#56/#57), hidden behind a flag; 72-kit curated seed shipped (depth#67–#71) | Launch: [`2026-07-07-phase-7-uniform-launch-design.md`](2026-07-07-phase-7-uniform-launch-design.md) · Archive page: [`2026-07-08-uniform-archive-page-design.md`](2026-07-08-uniform-archive-page-design.md) |

Everything else in the foundation table (0, 1, 1.5, 2, 3, 4, 5a, 5b, 5c, 5e, 6) is
shipped and recorded in the vault Roadmap's status table.

## Build order (dependency-honest)

1. Independent, any time: **coaches**, **compare (5d)**, **uniform launch (7)**,
   **play diagrams** (needs only `buildRealFormation` from the formations spec).
2. **nflverse scaffolding + stats** → unblocks **contracts**, **real formations**,
   **draft boards part 1**, and D1.
3. **Phase C** → unblocks **draft boards parts 2–3** and D2.
4. **Phase D** (D1 then D2) → unblocks the contracts spec's board-cost PR3.
