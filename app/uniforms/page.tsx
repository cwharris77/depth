import type { Metadata } from 'next';
import { dbRosterSource } from '@/lib/roster-source.db';
import UniformArchive from '@/components/UniformArchive';

export const metadata: Metadata = {
  title: 'Uniform Archive · Depth',
  description:
    'Browse every NFL uniform kit — home, away, throwbacks, and alternates — for all 32 teams.',
};

// Archive gallery (roadmap Phase 7). Resolves the full kit list server-side and hands it to the
// client filter component — kit metadata only, no rosters. Statically prerendered.
export default async function UniformsPage() {
  const kits = await dbRosterSource.listUniforms();
  return <UniformArchive kits={kits} />;
}
