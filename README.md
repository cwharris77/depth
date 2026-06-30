# depth

Interactive NFL depth chart viewer — pick any of the 32 teams, tap any player for bio and stats.

**Stack:** Next.js 16.2.6 · React 19 · TypeScript · Tailwind · Framer Motion · Vitest

## Routes

| Route | What |
|-------|------|
| `/` | Redirects to the default team (Seahawks until 5a lands) |
| `/team/[id]` | Depth chart for one team — fully static, one roster per page |

## Development

```bash
npm run dev    # dev server
npm run build  # production build
npm test       # vitest run
```

## Where we are

Phases 0–4 and cherry-picks 5b/5c are shipped. What's left:

| Item | What | Status |
|------|------|--------|
| **5a** | "My team" — remember last team in `localStorage`; home opens it | **next up** |
| **5d** | Two-team compare — side-by-side depth at a position across two teams | not started |
| **5e** | Real player photos — ESPN headshots on dots/cards | needs Phase 6 |
| **6** | ESPN `ApiRosterSource` — build-time fetch, drop-in for `StaticRosterSource` | not started |
| **7** | Multiple uniforms per team (home/away/color rush) | not started |

See [`Projects/depth/Roadmap.md`](../obsidian/Projects/depth/Roadmap.md) in the Obsidian vault for full phase specs, design decisions, and ESPN API research.

## Data

Static rosters live in `lib/teams/`. They're a point-in-time snapshot — accurate at build time, not live. The `RosterSource` interface (`lib/roster-source.ts`) is the seam: swapping in `ApiRosterSource` for Phase 6 requires no UI changes.
