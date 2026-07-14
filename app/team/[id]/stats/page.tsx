import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbRosterSource } from '@/lib/roster-source.db';
import TeamStatsView from '@/components/TeamStatsView';

type Params = { params: Promise<{ id: string }> };

// Prerender one static page per team, same shape as app/team/[id]/page.tsx.
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const page = await dbRosterSource.getTeamStats(id);
  if (!page) {
    return { title: 'Team not found · Depth' };
  }
  const fullName = `${page.team.city} ${page.team.name}`;
  return {
    title: `${fullName} Stats · Depth`,
    description: `Season record and coaching staff for the ${fullName}.`,
    alternates: { canonical: `/team/${id}/stats` },
  };
}

export default async function TeamStatsPage({ params }: Params) {
  const { id } = await params;
  const page = await dbRosterSource.getTeamStats(id);
  if (!page) {
    notFound();
  }

  return <TeamStatsView team={page.team} coach={page.coach} seasons={page.seasons} />;
}
