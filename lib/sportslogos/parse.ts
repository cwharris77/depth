// Pure parser for SportsLogos.net News' NFL-category RSS feed
// (https://news.sportslogos.net/category/nfl/feed/), used by
// scripts/check-uniform-releases.mts. No dependency (repo's runtime dep list is
// deliberately small) — WordPress RSS <item> blocks are well-formed machine output, so a
// hand-rolled regex extraction is enough; this doesn't need a full XML parser.

export type SportsLogosNewsItem = {
  url: string;
  title: string;
};

const ENTITIES: Record<string, string> = {
  '&#8211;': '–',
  '&#8212;': '—',
  '&#8216;': '‘',
  '&#8217;': '’',
  '&#8220;': '“',
  '&#8221;': '”',
  '&#038;': '&',
  '&amp;': '&',
  '&quot;': '"',
  '&#039;': "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&#?\w+;/g, (entity) => ENTITIES[entity] ?? entity);
}

function extractTag(itemXml: string, tag: string): string | null {
  const match = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) return null;
  const raw = match[1].trim();
  const cdataMatch = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return decodeEntities((cdataMatch ? cdataMatch[1] : raw).trim());
}

// Untrusted input (a third-party feed) degrades, never throws: a feed with no <item>
// blocks, or an item missing a title/link, is skipped rather than crashing the check
// script (AGENTS.md invariant 6).
export function parseSportsLogosFeed(xml: string): SportsLogosNewsItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items: SportsLogosNewsItem[] = [];
  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const url = extractTag(block, 'link');
    if (!title || !url) continue;
    items.push({ url, title });
  }
  return items;
}
