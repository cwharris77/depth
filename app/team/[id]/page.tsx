import DepthChartField from '@/components/DepthChartField';
import RememberTeam from '@/components/RememberTeam';
import { dbRosterSource, getPlayerStatsForRoster } from '@/lib/roster-source.db';
import { OG_IMAGE_ALT, OG_IMAGE_SIZE } from '@/lib/og';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Params = { params: Promise<{ id: string }> };
type MetadataParams = Params & {
  searchParams: Promise<{ order?: string | string[] }>;
};

// Cache Components (cacheComponents: true, next.config.ts): staleness/revalidation now
// lives on the `'use cache'` functions in lib/roster-source.db.ts (cacheLife('ingest')),
// not a route-segment `revalidate` export — see that file and next.config.ts for the
// rationale. This also lets generateMetadata's searchParams read (below, for the
// shared-link OG `order` param) stay without forcing the whole route dynamic, unlike
// the classic static/dynamic model this route was on before.

// Prerender one static page per team. Unknown ids fall through to notFound() below.
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export async function generateMetadata({
  params,
  searchParams,
}: MetadataParams): Promise<Metadata> {
  const { id } = await params;
  const roster = await dbRosterSource.getTeam(id);
  if (!roster) {
    return { title: 'Team not found · Depth' };
  }
  const { team } = roster;
  const fullName = `${team.city} ${team.name}`;

  // The OG image is a plain Route Handler (app/team/[id]/og-image/route.tsx), not the
  // file-convention opengraph-image.tsx special file — Next always strips the incoming
  // Request/query string before invoking that special file, so it could never see a
  // shared roster link's `?order=` override (lib/share.ts). Forwarding `order` here, and
  // pointing openGraph/twitter at the route explicitly, is what makes the link preview
  // honor an edited order instead of always the default (see
  // Projects/depth/Tickets/Shared edited roster previews the default.md).
  const { order } = await searchParams;
  const orderParam = typeof order === 'string' ? order : undefined;
  const ogImageUrl = orderParam
    ? `/team/${id}/og-image?order=${encodeURIComponent(orderParam)}`
    : `/team/${id}/og-image`;
  const ogImage = { url: ogImageUrl, ...OG_IMAGE_SIZE, alt: OG_IMAGE_ALT };

  return {
    title: `${fullName} Depth Chart · Depth`,
    description: `Interactive depth chart for the ${fullName} — tap any player for their bio and stats.`,
    // Cross-team player picks deep-link here as /team/[id]?player=<id> (see
    // NavSwitcher). Those are the same page, so point the canonical at the clean
    // path (resolved against the layout's metadataBase) to consolidate them.
    alternates: { canonical: `/team/${id}` },
    openGraph: { images: [ogImage] },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  };
}

export default async function TeamPage({ params }: Params) {
  const { id } = await params;
  // The route resolves exactly one roster here (server-side) and passes it down,
  // so the client only ever receives the team it's viewing. Team metadata for all 32
  // (for the switcher) is lightweight — no player data — so it's safe to ship on
  // every page alongside the one full roster.
  const [roster, teams] = await Promise.all([
    dbRosterSource.getTeam(id),
    dbRosterSource.listTeams(),
  ]);
  if (!roster) {
    notFound();
  }

  // Prefetch season stats for every player on the roster so PlayerCard doesn't need a
  // client-side round trip. Keyed by player id so the card can look up its player's
  // stats synchronously. One batched query for the whole roster (getPlayerStatsForRoster)
  // instead of one query per player — a missing key degrades to an empty array (the card
  // renders no stats section), matching the old per-player error path.
  const playerStatsMap = await getPlayerStatsForRoster(roster.players.map((p) => p.id));

  // RememberTeam records this team in localStorage (5a) so the home route reopens it.
  return (
    <>
      <RememberTeam id={id} />
      <DepthChartField roster={roster} teams={teams} playerStatsMap={playerStatsMap} />
    </>
  );
}
