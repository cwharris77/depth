import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DepthChartField from "@/components/DepthChartField";
import { staticRosterSource } from "@/lib/roster-source";

type Params = { params: Promise<{ id: string }> };

// Prerender one static page per team. Unknown ids fall through to notFound() below.
export function generateStaticParams() {
  return staticRosterSource.listTeams().map((team) => ({ id: team.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const roster = staticRosterSource.getTeam(id);
  if (!roster) {
    return { title: "Team not found · Depth" };
  }
  const { team } = roster;
  const fullName = `${team.city} ${team.name}`;
  return {
    title: `${fullName} Depth Chart · Depth`,
    description: `Interactive depth chart for the ${fullName} — tap any player for their bio and stats.`,
  };
}

export default async function TeamPage({ params }: Params) {
  const { id } = await params;
  // The route resolves exactly one roster here (server-side) and passes it down,
  // so the client only ever receives the team it's viewing.
  const roster = staticRosterSource.getTeam(id);
  if (!roster) {
    notFound();
  }
  return <DepthChartField roster={roster} />;
}
