# depth

Interactive NFL depth chart viewer — pick any of the 32 teams, tap any player for bio and stats.

**Stack:** Next.js 16.2.6 · React 19 · TypeScript · Tailwind · Framer Motion · Vitest

## Routes

| Route | What |
|-------|------|
| `/` | Redirects to your saved "my team" (5a), or the Seahawks by default |
| `/team/[id]` | Depth chart for one team - one roster per page |
| `/uniforms`  | Fully curated current and historical uniform archive                      |

## Development

```bash
npm run dev    # dev server
npm run build  # production build
npm test       # vitest run
```

## Roadmap

The product roadmap lives in the Obsidian vault — [`Projects/depth/Roadmap.md`](../obsidian/Projects/depth/Roadmap.md) — which is the single source of truth for phase status, design decisions, and ESPN API research.

## Data

Roster, schedule, and stats data live in Supabase Postgres and are read at build/request
time through the server-side data layer. Roster reads use the `RosterSource` seam
(`lib/roster-source.ts`); its Postgres implementation and the bounded schedule/stat
readers live in `lib/roster-source.db.ts`. Scheduled GitHub Actions ingest weekly ESPN
identity/roster data and daily nflverse stats, schedules, and market lines. See
[`docs/espn.md`](docs/espn.md) and [`docs/nflverse.md`](docs/nflverse.md). The bundled
static registry in `lib/teams/` remains as the `staticRosterSource` used in tests and as
a point-in-time fixture.
