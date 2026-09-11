import type { MetadataRoute } from 'next';
import { dbRosterSource } from '@/lib/roster-source.db';
import { getSiteUrl } from '@/lib/utils/site-url';

// Absolute base for sitemap URLs — same source as the layout's metadataBase.
const siteUrl = getSiteUrl();

// One entry per prerendered team page plus the home route, so crawlers can find all
// 32 depth charts (each a distinct static page) instead of only whatever the home
// redirect happens to land on.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const teams = await dbRosterSource.listTeams();
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    ...teams.map((team) => ({
      url: `${siteUrl}/team/${team.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
