import type { Metadata } from 'next';
import { dbRosterSource } from '@/lib/roster-source.db';
import UniformArchive from '@/components/UniformArchive';

export const metadata: Metadata = {
  title: 'Uniform Archive · Depth',
  description:
    'Browse every NFL uniform kit — home, away, throwbacks, and alternates — for all 32 teams.',
};

// Archive gallery (roadmap Phase 7). Resolves the full kit list server-side and hands it to the
// client filter component — kit metadata only, no rosters. `teams` is the same lightweight
// all-32 list /compare passes to CompareTable, for the desktop TeamRail's switcher/search
// (Desktop shell for uniform archive and compare pages ticket). Statically prerendered.
export default async function UniformsPage() {
  const [kits, teams] = await Promise.all([
    dbRosterSource.listUniforms(),
    dbRosterSource.listTeams(),
  ]);
  return <UniformArchive kits={kits} teams={teams} />;
}
