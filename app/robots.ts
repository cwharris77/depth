import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

// Same absolute base as the layout's metadataBase and the sitemap.
const siteUrl = getSiteUrl();

// Allow crawling everything and point crawlers at the sitemap (app/sitemap.ts),
// which enumerates all 32 team pages the home redirect can't surface on its own.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
