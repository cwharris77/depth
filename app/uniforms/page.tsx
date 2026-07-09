import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbRosterSource } from '@/lib/roster-source.db';
import { showUniformArchive } from '@/lib/flags';
import UniformArchive from '@/components/UniformArchive';

export const metadata: Metadata = {
  title: 'Uniform Archive · Depth',
  description:
    'Browse every NFL uniform kit — home, away, throwbacks, and alternates — for all 32 teams.',
};

// Archive gallery (roadmap Phase 7). Gated by the show-uniform-archive flag (off until
// launch). The flag decide() is request-free so this route stays statically
// prerenderable. Resolves the full kit list server-side and hands it to the client
// filter component — kit metadata only, no rosters.
export default async function UniformsPage() {
  if (!(await showUniformArchive())) {
    notFound();
  }
  const kits = await dbRosterSource.listUniforms();
  return <UniformArchive kits={kits} />;
}
