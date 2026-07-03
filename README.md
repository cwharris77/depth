# depth

Interactive NFL depth chart viewer — pick any of the 32 teams, tap any player for bio and stats.

**Stack:** Next.js 16.2.6 · React 19 · TypeScript · Tailwind · Framer Motion · Vitest

## Routes

| Route | What |
|-------|------|
| `/` | Redirects to your saved "my team" (5a), or the Seahawks by default |
| `/team/[id]` | Depth chart for one team — prerendered per team, one roster per page |

## Development

```bash
npm run dev    # dev server
npm run build  # production build
npm test       # vitest run
```

## Where we are

Phases 0–4, 5a/5b/5c, and most of Phase 6 (ESPN → Postgres ingestion) are shipped.
What's left:

| Item | What | Status |
|------|------|--------|
| **5d** | Two-team compare — side-by-side depth at a position across two teams | not started |
| **7** | Multiple uniforms per team (home/away/color rush) | not started |

Player photos (5e) are shipped on the player card and search; putting them on the
field dots was intentionally dropped — the dots stay jersey-number circles.

See [`Projects/depth/Roadmap.md`](../obsidian/Projects/depth/Roadmap.md) in the Obsidian vault for full phase specs, design decisions, and ESPN API research.

## Data

Roster data lives in Supabase Postgres and is read at build/request time through the `RosterSource` seam (`lib/roster-source.ts`). The app uses the Postgres-backed `dbRosterSource` (`lib/roster-source.db.ts`); a weekly GitHub Action ingests fresh ESPN data — see [`docs/espn.md`](docs/espn.md). The bundled static registry in `lib/teams/` remains as the `staticRosterSource` used in tests and as a point-in-time fixture.
