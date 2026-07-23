// Custom Route Handler (not a file-convention `opengraph-image.tsx`) so it can read the
// incoming request's query string. Next 16's opengraph-image special-file loader always
// discards the Request/searchParams before invoking the handler (confirmed against
// node_modules/next/dist/build/webpack/loaders/next-metadata-route-loader.js), and
// file-based metadata always overrides a manually-specified openGraph.images — so a
// shared roster link's `?order=` override (lib/share.ts) could never reach the old
// prerendered card. generateMetadata (../page.tsx) points openGraph/twitter images here,
// forwarding `order` when the page itself was loaded with one. This trades the old
// per-team static prerendering for a request-time render — accepted tradeoff, see
// Projects/depth/Tickets/Shared edited roster previews the default.md.
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { dbRosterSource } from '@/lib/roster-source.db';
import { readableTextOn } from '@/lib/colors';
import { featuredStarters, rosterForOgImage, OG_IMAGE_SIZE } from '@/lib/og';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderParam = request.nextUrl.searchParams.get('order');
  const fetched = await dbRosterSource.getTeam(id);
  const roster = fetched ? rosterForOgImage(fetched, orderParam) : undefined;

  // Unknown id: a clean generic card rather than a broken/blank image.
  if (!roster) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e1a',
          color: '#f0f4ff',
          fontSize: 72,
          fontWeight: 800,
        }}>
        NFL Depth Charts
      </div>,
      { ...OG_IMAGE_SIZE }
    );
  }

  const { team } = roster;
  const bg = team.colors.primary;
  const text = readableTextOn(bg);
  const onLight = text !== '#ffffff';
  const panelBg = onLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)';
  const subtle = onLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.72)';
  const starters = featuredStarters(roster);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: bg,
        color: text,
        padding: '76px 80px',
        fontFamily: 'sans-serif',
      }}>
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 56,
            height: 12,
            borderRadius: 6,
            background: team.colors.secondary,
            marginRight: 20,
          }}
        />
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 8,
            color: subtle,
          }}>
          DEPTH CHART
        </div>
      </div>

      {/* Team name */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: 4,
            color: subtle,
          }}>
          {team.city.toUpperCase()}
        </div>
        <div style={{ fontSize: 132, fontWeight: 800, lineHeight: 1 }}>{team.name}</div>
      </div>

      {/* Featured starters */}
      <div style={{ display: 'flex', gap: 20 }}>
        {starters.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: panelBg,
              borderRadius: 18,
              padding: '18px 26px',
              minWidth: 220,
            }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: subtle }}>{s.label}</div>
            <div style={{ fontSize: 38, fontWeight: 700 }}>{s.name}</div>
          </div>
        ))}
      </div>
    </div>,
    { ...OG_IMAGE_SIZE }
  );
}
