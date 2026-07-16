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

## Roadmap

The product roadmap lives in the Obsidian vault — [`Projects/depth/Roadmap.md`](../obsidian/Projects/depth/Roadmap.md) — which is the single source of truth for phase status, design decisions, and ESPN API research.

## Data

Roster data lives in Supabase Postgres and is read at build/request time through the `RosterSource` seam (`lib/roster-source.ts`). The app uses the Postgres-backed `dbRosterSource` (`lib/roster-source.db.ts`); a weekly GitHub Action ingests fresh ESPN data — see [`docs/espn.md`](docs/espn.md). The bundled static registry in `lib/teams/` remains as the `staticRosterSource` used in tests and as a point-in-time fixture.
