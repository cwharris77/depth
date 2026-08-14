import { describe, it, expect } from 'vitest';
import { parseSportsLogosFeed } from '@/lib/sportslogos/parse';

// Fixture trimmed from a real https://news.sportslogos.net/category/nfl/feed/ response.
const FEED_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0">
<channel>
	<title>NFL &#8211; SportsLogos.Net News</title>
	<item>
		<title>Sources: NFL To Unveil 2026 Nike &#8220;Rivalries&#8221; Uniforms On August 25</title>
		<link>https://news.sportslogos.net/2026/07/29/sources-nfl-to-unveil-2026-nike-rivalries-uniforms-on-august-25/football/</link>
		<dc:creator><![CDATA[Andrew Lind]]></dc:creator>
		<pubDate>Wed, 29 Jul 2026 20:00:00 +0000</pubDate>
		<category><![CDATA[Featured]]></category>
		<category><![CDATA[NFL]]></category>
		<guid isPermaLink="false">https://news.sportslogos.net/?p=100900</guid>
		<description><![CDATA[<p>Some description text.</p>]]></description>
	</item>
	<item>
		<title>Buffalo Bills Unveil New Gray &#8220;Nickel City&#8221; Alternate Uniforms</title>
		<link>https://news.sportslogos.net/2026/07/27/buffalo-bills-unveil-new-gray-nickel-city-alternate-uniforms/football/</link>
		<dc:creator><![CDATA[Andrew Lind]]></dc:creator>
		<pubDate>Mon, 27 Jul 2026 15:00:00 +0000</pubDate>
		<category><![CDATA[NFL]]></category>
		<guid isPermaLink="false">https://news.sportslogos.net/?p=100800</guid>
		<description><![CDATA[<p>Some description text.</p>]]></description>
	</item>
</channel>
</rss>`;

describe('parseSportsLogosFeed', () => {
  it('extracts url + title for each item', () => {
    const items = parseSportsLogosFeed(FEED_FIXTURE);
    expect(items).toEqual([
      {
        url: 'https://news.sportslogos.net/2026/07/29/sources-nfl-to-unveil-2026-nike-rivalries-uniforms-on-august-25/football/',
        title: 'Sources: NFL To Unveil 2026 Nike “Rivalries” Uniforms On August 25',
      },
      {
        url: 'https://news.sportslogos.net/2026/07/27/buffalo-bills-unveil-new-gray-nickel-city-alternate-uniforms/football/',
        title: 'Buffalo Bills Unveil New Gray “Nickel City” Alternate Uniforms',
      },
    ]);
  });

  it('decodes common HTML entities in titles', () => {
    const xml = `<item><title>Team A &amp; Team B &#8217;26 Kits</title><link>https://news.sportslogos.net/x/</link></item>`;
    const items = parseSportsLogosFeed(xml);
    expect(items[0].title).toBe('Team A & Team B ’26 Kits');
  });

  it('returns an empty array for a feed with no items', () => {
    expect(parseSportsLogosFeed('<rss><channel></channel></rss>')).toEqual([]);
  });

  it('skips an item missing a title or link rather than throwing', () => {
    const xml = `<item><title>No link here</title></item><item><link>https://news.sportslogos.net/y/</link></item>`;
    expect(parseSportsLogosFeed(xml)).toEqual([]);
  });

  it('degrades to an empty array on malformed/empty input', () => {
    expect(parseSportsLogosFeed('')).toEqual([]);
    expect(parseSportsLogosFeed('not xml at all')).toEqual([]);
  });
});
