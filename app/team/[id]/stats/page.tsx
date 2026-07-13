import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { dbRosterSource } from '@/lib/roster-source.db';
import { ordinal } from '@/lib/format';

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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide" style={{ color: '#7d848c' }}>
        {label}
      </dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

export default async function TeamStatsPage({ params }: Params) {
  const { id } = await params;
  const page = await dbRosterSource.getTeamStats(id);
  if (!page) {
    notFound();
  }
  const { team, coach, stats } = page;

  return (
    <div
      className="px-5 py-6"
      style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#fff' }}>
      <Link
        href={`/team/${id}`}
        className="inline-flex items-center gap-1.5 mb-6"
        style={{ color: team.colors.uiAccent }}>
        <ArrowLeft size={16} />
        <span className="text-sm font-semibold">
          {team.city} {team.name}
        </span>
      </Link>

      {coach && (
        <p className="text-sm mb-6" style={{ color: '#A5ACAF' }}>
          HC {coach.name} · {ordinal(coach.experience)} season
        </p>
      )}

      {stats && (
        <>
          <div className="mb-6">
            <p className="text-3xl font-bold" style={{ color: team.colors.uiAccent }}>
              {stats.overallWins}-{stats.overallLosses}
              {stats.overallTies ? `-${stats.overallTies}` : ''}
            </p>
            <p className="text-xs" style={{ color: '#A5ACAF' }}>
              {stats.streak}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <StatRow label="Home" value={`${stats.homeWins}-${stats.homeLosses}`} />
            <StatRow label="Road" value={`${stats.roadWins}-${stats.roadLosses}`} />
            <StatRow label="Division" value={`${stats.divisionWins}-${stats.divisionLosses}`} />
            <StatRow
              label="Conference"
              value={`${stats.conferenceWins}-${stats.conferenceLosses}`}
            />
            <StatRow label="Points for" value={String(stats.pointsFor)} />
            <StatRow label="Points against" value={String(stats.pointsAgainst)} />
            <StatRow
              label="Point differential"
              value={
                stats.pointDifferential > 0
                  ? `+${stats.pointDifferential}`
                  : String(stats.pointDifferential)
              }
            />
            <StatRow label="Playoff seed" value={String(stats.playoffSeed)} />
          </dl>
        </>
      )}

      {!coach && !stats && (
        <p className="text-sm" style={{ color: '#A5ACAF' }}>
          No stats available for this team yet.
        </p>
      )}
    </div>
  );
}
