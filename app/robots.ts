import type { MetadataRoute } from "next";

// Same absolute base as the layout's metadataBase and the sitemap. Set
// NEXT_PUBLIC_SITE_URL in production; falls back to localhost for dev/build.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Allow crawling everything and point crawlers at the sitemap (app/sitemap.ts),
// which enumerates all 32 team pages the home redirect can't surface on its own.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
